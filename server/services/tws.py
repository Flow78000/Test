"""
TWS Connection — Market Data Only (readonly=True)
AUCUNE donnee personnelle : pas de positions, P&L, equity, comptes, ordres.
"""
import time
from ib_insync import IB, Stock, Index, Forex, Future

TWS_HOST = "127.0.0.1"
TWS_PORT = 7496
TWS_CLIENT_ID = 50

ib = None
ib_connected = False
data_cache = {}
CACHE_TTL = 30

# ================================================================
# WATCHLISTS — market data instruments only
# ================================================================

WATCHLIST_VOL = {
    "VIX": Index("VIX", "CBOE"),
    "VIX9D": Index("VIX9D", "CBOE"),
    "VIX3M": Index("VIX3M", "CBOE"),
    "VIX6M": Index("VIX6M", "CBOE"),
    "VVIX": Index("VVIX", "CBOE"),
    "SKEW": Index("SKEW", "CBOE"),
}

WATCHLIST_INDICES = {
    "SPX": Index("SPX", "CBOE"),
    "NDX": Index("NDX", "NASDAQ"),
    "RUT": Index("RUT", "RUSSELL"),
}

WATCHLIST_ETF = {
    "SPY": Stock("SPY", "SMART", "USD"),
    "QQQ": Stock("QQQ", "SMART", "USD"),
    "IWM": Stock("IWM", "SMART", "USD"),
    "TLT": Stock("TLT", "SMART", "USD"),
    "HYG": Stock("HYG", "SMART", "USD"),
    "BTAL": Stock("BTAL", "SMART", "USD"),
    "EEM": Stock("EEM", "SMART", "USD"),
    "UVXY": Stock("UVXY", "SMART", "USD"),
    "SVXY": Stock("SVXY", "SMART", "USD"),
}

WATCHLIST_FX = {
    "EURUSD": Forex("EURUSD"),
    "GBPUSD": Forex("GBPUSD"),
    "USDJPY": Forex("USDJPY"),
    "AUDUSD": Forex("AUDUSD"),
    "USDCAD": Forex("USDCAD"),
    "USDCHF": Forex("USDCHF"),
}

ALL_WATCHLIST = {}
ALL_WATCHLIST.update(WATCHLIST_VOL)
ALL_WATCHLIST.update(WATCHLIST_INDICES)
ALL_WATCHLIST.update(WATCHLIST_ETF)
ALL_WATCHLIST.update(WATCHLIST_FX)

qualified = {}


# ================================================================
# Cache helpers
# ================================================================

def get_cached(key, ttl=CACHE_TTL):
    if key in data_cache:
        ts, data = data_cache[key]
        if time.time() - ts < ttl:
            return data
    return None


def set_cache(key, data):
    data_cache[key] = (time.time(), data)


# ================================================================
# TWS Connection
# ================================================================

def connect_tws():
    global ib, ib_connected
    try:
        ib = IB()
        ib.connect(TWS_HOST, TWS_PORT, clientId=TWS_CLIENT_ID, timeout=10, readonly=True)
        ib_connected = True
        print(f"  [TWS] Connecte en lecture seule (market data)")
        return True
    except Exception as e:
        print(f"  [TWS] Echec connexion: {e}")
        ib_connected = False
        return False


def disconnect_tws():
    global ib, ib_connected
    if ib_connected and ib:
        try:
            ib.disconnect()
        except Exception:
            pass
    ib_connected = False


def qualify_all():
    global qualified
    if not ib_connected:
        return
    print("  [TWS] Qualification des contrats...")
    count = 0
    for name, contract in ALL_WATCHLIST.items():
        try:
            q = ib.qualifyContracts(contract)
            if q:
                qualified[name] = q[0]
                count += 1
        except Exception as e:
            print(f"  [!] {name}: {e}")
    print(f"  [TWS] {count}/{len(ALL_WATCHLIST)} contrats qualifies")


# ================================================================
# Market Data
# ================================================================

def safe_float(val):
    """Convert to float, return None if NaN"""
    if val is None:
        return None
    try:
        f = float(val)
        return f if f == f else None  # NaN check
    except (TypeError, ValueError):
        return None


def fetch_quotes(names_subset=None):
    """Fetch market data for instruments — returns ONLY market prices, no account data"""
    if not ib_connected:
        return {"error": "TWS non connecte", "help": "Lancez TWS et appelez /api/reconnect"}

    targets = {k: v for k, v in qualified.items() if names_subset is None or k in names_subset}

    # Request snapshots
    for name, contract in targets.items():
        try:
            ib.reqMktData(contract, genericTickList="", snapshot=True, regulatorySnapshot=False)
        except Exception:
            pass

    ib.sleep(3)

    results = {}
    for name, contract in targets.items():
        try:
            t = ib.ticker(contract)
            last = safe_float(t.last)
            close = safe_float(t.close)
            high = safe_float(t.high)
            low = safe_float(t.low)
            bid = safe_float(t.bid)
            ask = safe_float(t.ask)
            vol = int(t.volume) if safe_float(t.volume) and t.volume > 0 else None

            price = last or close
            change = round(last - close, 4) if last and close else None
            change_pct = round((last - close) / close * 100, 2) if last and close and close != 0 else None

            results[name] = {
                "symbol": name,
                "price": price,
                "last": last,
                "close": close,
                "high": high,
                "low": low,
                "bid": bid,
                "ask": ask,
                "volume": vol,
                "change": change,
                "changePct": change_pct,
            }
        except Exception as e:
            results[name] = {"symbol": name, "error": str(e)}

    return results


def compute_regime(quotes):
    """Compute vol regime from market data"""
    vix = (quotes.get("VIX") or {}).get("price")
    vix9d = (quotes.get("VIX9D") or {}).get("price")
    vix3m = (quotes.get("VIX3M") or {}).get("price")
    vix6m = (quotes.get("VIX6M") or {}).get("price")
    vvix = (quotes.get("VVIX") or {}).get("price")
    skew = (quotes.get("SKEW") or {}).get("price")

    ratios = {}
    if vix and vix9d:
        ratios["vix9d_vix"] = round(vix9d / vix, 4)
        ratios["term_structure"] = "BACKWARDATION" if vix9d > vix else "CONTANGO"
    if vix and vix3m:
        ratios["vix3m_vix"] = round(vix3m / vix, 4)
    if vix and vvix:
        ratios["vvix_vix"] = round(vvix / vix, 2)
    if vix:
        ratios["regime"] = (
            "CRISE" if vix > 35 else
            "STRESS" if vix > 22 else
            "TRANSITION" if vix > 15 else
            "CALME"
        )
    return ratios
