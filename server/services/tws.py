"""
TWS Connection — Market Data Only (readonly=True)
AUCUNE donnee personnelle : pas de positions, P&L, equity, comptes, ordres.

Python 3.14 + uvicorn impose des regles strictes sur asyncio. ib_insync
a besoin de son propre event loop isole. On le lance dans un thread dedie
(_ib_thread) dont le loop (_ib_loop) tourne en permanence via run_forever().
Toutes les operations async IB passent par run_coroutine_threadsafe().
"""
import time
import asyncio
import threading
from ib_insync import IB, Stock, Index, Forex, Future

TWS_HOST = "127.0.0.1"
TWS_PORT = 7496
TWS_CLIENT_ID = 50

ib = None
ib_connected = False
data_cache = {}
CACHE_TTL = 30

# ================================================================
# Dedicated IB event loop thread (Python 3.14 compatible)
# ================================================================
_ib_loop: asyncio.AbstractEventLoop | None = None
_ib_thread: threading.Thread | None = None


def _run_ib_loop():
    global _ib_loop
    _ib_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_ib_loop)
    _ib_loop.run_forever()


def _ensure_ib_thread():
    global _ib_thread
    if _ib_thread is not None and _ib_thread.is_alive():
        return
    _ib_thread = threading.Thread(target=_run_ib_loop, daemon=True, name="ib-event-loop")
    _ib_thread.start()
    time.sleep(0.3)  # let loop spin up


def _run_ib_coro(coro, timeout=15):
    """Run an async coroutine on the IB event loop thread (threadsafe)."""
    _ensure_ib_thread()
    future = asyncio.run_coroutine_threadsafe(coro, _ib_loop)
    return future.result(timeout=timeout)


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
    if len(data_cache) > 500:
        sorted_keys = sorted(data_cache, key=lambda k: data_cache[k][0])
        for k in sorted_keys[:100]:
            del data_cache[k]
    data_cache[key] = (time.time(), data)


# ================================================================
# TWS Connection (runs on dedicated IB thread)
# ================================================================

def connect_tws():
    global ib, ib_connected
    try:
        _ensure_ib_thread()

        async def _do_connect():
            ib_new = IB()
            await ib_new.connectAsync(
                TWS_HOST, TWS_PORT,
                clientId=TWS_CLIENT_ID,
                timeout=15,
                readonly=True,
            )
            return ib_new

        ib = _run_ib_coro(_do_connect(), timeout=20)
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
            async def _do_disconnect():
                ib.disconnect()
            _run_ib_coro(_do_disconnect(), timeout=5)
        except Exception:
            pass
    ib_connected = False


def qualify_all():
    global qualified
    if not ib_connected:
        return
    print("  [TWS] Qualification des contrats...")
    count = 0

    async def _qualify():
        nonlocal count
        for name, contract in ALL_WATCHLIST.items():
            try:
                q = await ib.qualifyContractsAsync(contract)
                if q:
                    qualified[name] = q[0]
                    count += 1
            except Exception as e:
                print(f"  [!] {name}: {e}")

    try:
        _run_ib_coro(_qualify(), timeout=60)
    except Exception as e:
        print(f"  [TWS] Qualification error: {e}")
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


def ensure_connected():
    """Auto-reconnect if TWS dropped"""
    global ib, ib_connected
    if ib_connected and ib:
        try:
            if ib.isConnected():
                return True
        except Exception:
            pass
    # Try reconnect silently
    ib_connected = False
    try:
        if ib:
            try:
                ib.disconnect()
            except Exception:
                pass
        ok = connect_tws()
        if ok:
            qualify_all()
            print("  [TWS] Reconnexion automatique reussie")
        return ok
    except Exception:
        ib_connected = False
        return False


def fetch_quotes(names_subset=None):
    """Fetch market data for instruments — returns ONLY market prices, no account data"""
    if not ib_connected or not (ib and ib.isConnected()):
        if not ensure_connected():
            return {"error": "TWS non connecte", "help": "Lancez TWS et appelez /api/reconnect"}

    targets = {k: v for k, v in qualified.items() if names_subset is None or k in names_subset}

    # Request snapshots + wait for data on IB loop
    async def _fetch():
        for name, contract in targets.items():
            try:
                ib.reqMktData(contract, genericTickList="", snapshot=True, regulatorySnapshot=False)
            except Exception:
                pass
        await asyncio.sleep(3)

    try:
        _run_ib_coro(_fetch(), timeout=10)
    except Exception:
        # Fallback: simple wait
        time.sleep(0.5)

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
