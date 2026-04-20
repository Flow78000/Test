"""
FLO.W — Vol Desk Historical Data Collector
Collects IV, HV, price, put/call ratio for sector ETFs, cross-asset vol,
stress indicators, and CC ETFs via TWS API.
Stores daily snapshots to vol_desk_history.json.

Generic Ticks used:
  100 = Option Volume
  101 = Option Open Interest
  104 = Historical Volatility (30-day)
  106 = Implied Volatility
"""
import os
import json
import time
from datetime import datetime, timezone
from ib_insync import Stock, Index

# ================================================================
# UNIVERSE — All tickers from the Vol Desk screenshots
# ================================================================

SECTOR_ETFS = {
    # ETF sectoriels + top holdings
    "XLK": {"name": "Technology", "type": "sector"},
    "ORCL": {"name": "Oracle", "type": "stock", "sector": "XLK"},
    "MSFT": {"name": "Microsoft", "type": "stock", "sector": "XLK"},
    "PLTR": {"name": "Palantir", "type": "stock", "sector": "XLK"},
    "AVGO": {"name": "Broadcom", "type": "stock", "sector": "XLK"},
    "NVDA": {"name": "NVIDIA", "type": "stock", "sector": "XLK"},
    "AAPL": {"name": "Apple", "type": "stock", "sector": "XLK"},

    "XLV": {"name": "Health Care", "type": "sector"},
    "ABT": {"name": "Abbott", "type": "stock", "sector": "XLV"},
    "JNJ": {"name": "J&J", "type": "stock", "sector": "XLV"},
    "TMO": {"name": "Thermo Fisher", "type": "stock", "sector": "XLV"},
    "UNH": {"name": "UnitedHealth", "type": "stock", "sector": "XLV"},
    "MRK": {"name": "Merck", "type": "stock", "sector": "XLV"},
    "ABBV": {"name": "AbbVie", "type": "stock", "sector": "XLV"},

    "XLP": {"name": "Consumer Staples", "type": "sector"},
    "PM": {"name": "Philip Morris", "type": "stock", "sector": "XLP"},
    "MDLZ": {"name": "Mondelez", "type": "stock", "sector": "XLP"},
    "PG": {"name": "Procter & Gamble", "type": "stock", "sector": "XLP"},
    "KO": {"name": "Coca-Cola", "type": "stock", "sector": "XLP"},
    "WMT": {"name": "Walmart", "type": "stock", "sector": "XLP"},
    "COST": {"name": "Costco", "type": "stock", "sector": "XLP"},

    "XLU": {"name": "Utilities", "type": "sector"},
    "AEP": {"name": "AEP", "type": "stock", "sector": "XLU"},
    "CEG": {"name": "Constellation Energy", "type": "stock", "sector": "XLU"},
    "NEE": {"name": "NextEra Energy", "type": "stock", "sector": "XLU"},
    "VST": {"name": "Vistra", "type": "stock", "sector": "XLU"},
    "SO": {"name": "Southern Co", "type": "stock", "sector": "XLU"},
    "DUK": {"name": "Duke Energy", "type": "stock", "sector": "XLU"},

    "XLF": {"name": "Financials", "type": "sector"},
    "JPM": {"name": "JPMorgan", "type": "stock", "sector": "XLF"},
    "V": {"name": "Visa", "type": "stock", "sector": "XLF"},
    "BAC": {"name": "Bank of America", "type": "stock", "sector": "XLF"},
    "IBKR": {"name": "Interactive Brokers", "type": "stock", "sector": "XLF"},
    "CME": {"name": "CME Group", "type": "stock", "sector": "XLF"},
    "C": {"name": "Citigroup", "type": "stock", "sector": "XLF"},

    "XLE": {"name": "Energy", "type": "sector"},
    "XOM": {"name": "Exxon Mobil", "type": "stock", "sector": "XLE"},
    "CVX": {"name": "Chevron", "type": "stock", "sector": "XLE"},
    "COP": {"name": "ConocoPhillips", "type": "stock", "sector": "XLE"},
    "WMB": {"name": "Williams", "type": "stock", "sector": "XLE"},
    "MPC": {"name": "Marathon Petroleum", "type": "stock", "sector": "XLE"},
    "EOG": {"name": "EOG Resources", "type": "stock", "sector": "XLE"},

    "XLB": {"name": "Materials", "type": "sector"},
    "LIN": {"name": "Linde", "type": "stock", "sector": "XLB"},
    "NEM": {"name": "Newmont", "type": "stock", "sector": "XLB"},
    "SHW": {"name": "Sherwin-Williams", "type": "stock", "sector": "XLB"},
    "ECL": {"name": "Ecolab", "type": "stock", "sector": "XLB"},
    "VMC": {"name": "Vulcan Materials", "type": "stock", "sector": "XLB"},
    "MLM": {"name": "Martin Marietta", "type": "stock", "sector": "XLB"},

    "XLY": {"name": "Consumer Discretionary", "type": "sector"},
    "AMZN": {"name": "Amazon", "type": "stock", "sector": "XLY"},
    "TSLA": {"name": "Tesla", "type": "stock", "sector": "XLY"},
    "HD": {"name": "Home Depot", "type": "stock", "sector": "XLY"},
    "MCD": {"name": "McDonalds", "type": "stock", "sector": "XLY"},
    "BKNG": {"name": "Booking", "type": "stock", "sector": "XLY"},
    "TJX": {"name": "TJX", "type": "stock", "sector": "XLY"},
}

CROSS_ASSET_VOL = {
    # Equity Vol
    "VIX": {"name": "VIX Index", "type": "vol", "group": "EQUITY VOL", "contract": "index"},
    "VVIX": {"name": "VVIX Index", "type": "vol", "group": "EQUITY VOL", "contract": "index"},
    "VXN": {"name": "Nasdaq VIX", "type": "vol", "group": "EQUITY VOL", "contract": "index"},
    "RVX": {"name": "Russell VIX", "type": "vol", "group": "EQUITY VOL", "contract": "index"},
    # Cross-Asset Vol
    "OVX": {"name": "Oil VIX", "type": "vol", "group": "CROSS-ASSET VOL", "contract": "index"},
    "GVZ": {"name": "Gold VIX", "type": "vol", "group": "CROSS-ASSET VOL", "contract": "index"},
    # Term Structure
    "VIX9D": {"name": "VIX 9-Day", "type": "vol", "group": "TERM STRUCTURE", "contract": "index"},
    "VIX3M": {"name": "VIX 3-Month", "type": "vol", "group": "TERM STRUCTURE", "contract": "index"},
    "VIX6M": {"name": "VIX 6-Month", "type": "vol", "group": "TERM STRUCTURE", "contract": "index"},
    # ETF Vol
    "VXX": {"name": "VXX Short-Term", "type": "etf", "group": "ETF VOL"},
    "SVXY": {"name": "SVXY Short VIX", "type": "etf", "group": "ETF VOL"},
    "UVXY": {"name": "UVXY Ultra VIX", "type": "etf", "group": "ETF VOL"},
    # Cross Asset
    "SKEW": {"name": "SKEW Index", "type": "vol", "group": "CROSS ASSET", "contract": "index"},
    # Rotation-Stress
    "BTAL": {"name": "BTAL Anti-Beta", "type": "etf", "group": "ROTATION-STRESS"},
    "IWM": {"name": "Russell 2000 ETF", "type": "etf", "group": "ROTATION-STRESS"},
    "EEM": {"name": "Emerging Markets", "type": "etf", "group": "ROTATION-STRESS"},
    "FXY": {"name": "Yen ETF", "type": "etf", "group": "ROTATION-STRESS"},
    "TLT": {"name": "20Y Treasury", "type": "etf", "group": "ROTATION-STRESS"},
    "HYG": {"name": "High Yield", "type": "etf", "group": "ROTATION-STRESS"},
    "TAIL": {"name": "Cambria Tail Risk", "type": "etf", "group": "ROTATION-STRESS"},
    # CC Single Stocks
    "TSLY": {"name": "YieldMax TSLA", "type": "etf", "group": "CC-SINGLE-STOCKS"},
    "NVDY": {"name": "YieldMax NVDA", "type": "etf", "group": "CC-SINGLE-STOCKS"},
    "APLY": {"name": "YieldMax AAPL", "type": "etf", "group": "CC-SINGLE-STOCKS"},
    "MSFO": {"name": "YieldMax MSFT", "type": "etf", "group": "CC-SINGLE-STOCKS"},
    "TLTW": {"name": "iShares TLT BuyWrite", "type": "etf", "group": "CC-SINGLE-STOCKS"},
    "HYGW": {"name": "iShares HYG BuyWrite", "type": "etf", "group": "CC-SINGLE-STOCKS"},
    # CC-ETF Indices
    "QYLD": {"name": "Global X NDX CC", "type": "etf", "group": "CC-ETF INDICES"},
    "XYLD": {"name": "Global X SPX CC", "type": "etf", "group": "CC-ETF INDICES"},
    "JEPI": {"name": "JPM Equity Premium", "type": "etf", "group": "CC-ETF INDICES"},
    "JEPQ": {"name": "JPM Nasdaq Premium", "type": "etf", "group": "CC-ETF INDICES"},
    "XDTE": {"name": "Roundhill SPX 0DTE CC", "type": "etf", "group": "CC-ETF INDICES"},
    "QDTE": {"name": "Roundhill NDX 0DTE CC", "type": "etf", "group": "CC-ETF INDICES"},
    # Term structure underlying assets
    "USO": {"name": "US Oil Fund", "type": "etf", "group": "TERM STRUCTURE ASSETS"},
    "GLD": {"name": "SPDR Gold", "type": "etf", "group": "TERM STRUCTURE ASSETS"},
    "SPY": {"name": "S&P 500 ETF", "type": "etf", "group": "TERM STRUCTURE ASSETS"},
}

# History file
HISTORY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vol_desk_history.json")


def _load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return {"snapshots": [], "last_updated": None}


def _save_history(data):
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f)


def safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def collect_vol_desk_snapshot(ib):
    """
    Collect a full Vol Desk snapshot via TWS.
    Uses reqMktData with generic ticks 104 (HV) + 106 (IV) + 100 (opt vol) + 101 (opt OI).
    Returns a dict keyed by ticker with all available metrics.
    """
    if not ib or not ib.isConnected():
        return {"error": "TWS non connecte"}

    all_tickers = {}
    all_tickers.update(SECTOR_ETFS)
    all_tickers.update(CROSS_ASSET_VOL)

    # Build contracts
    contracts = {}
    for sym, meta in all_tickers.items():
        try:
            contract_type = meta.get("contract", "stock" if meta["type"] in ("stock", "etf", "sector") else "index")
            if contract_type == "index":
                c = Index(sym, "CBOE")
            else:
                c = Stock(sym, "SMART", "USD")
            qualified = ib.qualifyContracts(c)
            if qualified:
                contracts[sym] = qualified[0]
        except Exception as e:
            print(f"  [VolDesk] Skip {sym}: {e}")

    if not contracts:
        return {"error": "Aucun contrat qualifie"}

    # Request market data with generic ticks: 104=HV, 106=IV, 100=OptVol, 101=OptOI
    generic_ticks = "100,101,104,106"
    tickers_map = {}
    for sym, contract in contracts.items():
        try:
            tickers_map[sym] = ib.reqMktData(contract, genericTickList=generic_ticks, snapshot=True, regulatorySnapshot=False)
        except Exception as e:
            print(f"  [VolDesk] reqMktData error {sym}: {e}")

    # Wait for data
    ib.sleep(5)

    # Collect results
    snapshot = {}
    now = datetime.now(timezone.utc)

    for sym, ticker in tickers_map.items():
        meta = all_tickers[sym]
        data = {
            "symbol": sym,
            "name": meta["name"],
            "type": meta["type"],
        }

        if "group" in meta:
            data["group"] = meta["group"]
        if "sector" in meta:
            data["sector"] = meta["sector"]

        # Price data
        data["last"] = safe_float(ticker.last) or safe_float(ticker.close)
        data["close"] = safe_float(ticker.close)
        data["high"] = safe_float(ticker.high)
        data["low"] = safe_float(ticker.low)
        data["volume"] = int(ticker.volume) if safe_float(ticker.volume) and ticker.volume > 0 else None

        # Change
        last = data["last"]
        close = data["close"]
        if last and close and close != 0:
            data["change"] = round(last - close, 4)
            data["change_pct"] = round((last - close) / close * 100, 2)

        # Implied Volatility (tick 106)
        iv = safe_float(getattr(ticker, 'impliedVolatility', None))
        if iv is not None and iv > 0:
            data["iv"] = round(iv * 100, 2)  # Convert to percentage

        # Historical Volatility (tick 104)
        hv = safe_float(getattr(ticker, 'historicalVolatility', None))
        if hv is not None and hv > 0:
            data["hv"] = round(hv * 100, 2)  # Convert to percentage

        # Option Volume (tick 100)
        opt_vol = safe_float(getattr(ticker, 'callVolume', None))
        put_vol = safe_float(getattr(ticker, 'putVolume', None))
        if opt_vol is not None:
            data["call_volume"] = int(opt_vol)
        if put_vol is not None:
            data["put_volume"] = int(put_vol)
        if opt_vol and put_vol and opt_vol > 0:
            data["put_call_ratio"] = round(put_vol / opt_vol, 2)

        # Option Open Interest (tick 101)
        call_oi = safe_float(getattr(ticker, 'callOpenInterest', None))
        put_oi = safe_float(getattr(ticker, 'putOpenInterest', None))
        if call_oi is not None:
            data["call_oi"] = int(call_oi)
        if put_oi is not None:
            data["put_oi"] = int(put_oi)

        # IV / HV ratio (volatility risk premium proxy)
        if data.get("iv") and data.get("hv") and data["hv"] > 0:
            data["iv_hv_ratio"] = round(data["iv"] / data["hv"], 2)

        snapshot[sym] = data

    # Cancel market data
    for sym, ticker in tickers_map.items():
        try:
            ib.cancelMktData(contracts[sym])
        except Exception:
            pass

    return {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "timestamp": now.isoformat(),
        "tickers": snapshot,
        "count": len(snapshot),
    }


def save_snapshot(snapshot):
    """Save a snapshot to history file. One snapshot per day (overwrites same-day)."""
    history = _load_history()
    date = snapshot.get("date")

    # Remove existing snapshot for same date
    history["snapshots"] = [s for s in history["snapshots"] if s.get("date") != date]
    history["snapshots"].append(snapshot)

    # Keep max 365 days
    history["snapshots"] = history["snapshots"][-365:]
    history["last_updated"] = snapshot["timestamp"]

    _save_history(history)
    return len(history["snapshots"])


def get_history(days=90):
    """Get historical snapshots."""
    history = _load_history()
    snapshots = history.get("snapshots", [])[-days:]
    return {
        "snapshots": snapshots,
        "total_days": len(snapshots),
        "last_updated": history.get("last_updated"),
    }


def get_ticker_history(symbol, days=90):
    """Get history for a single ticker across all snapshots."""
    history = _load_history()
    snapshots = history.get("snapshots", [])[-days:]

    series = []
    for snap in snapshots:
        ticker_data = snap.get("tickers", {}).get(symbol)
        if ticker_data:
            series.append({
                "date": snap["date"],
                "last": ticker_data.get("last"),
                "iv": ticker_data.get("iv"),
                "hv": ticker_data.get("hv"),
                "iv_hv_ratio": ticker_data.get("iv_hv_ratio"),
                "change_pct": ticker_data.get("change_pct"),
                "put_call_ratio": ticker_data.get("put_call_ratio"),
                "call_volume": ticker_data.get("call_volume"),
                "put_volume": ticker_data.get("put_volume"),
                "volume": ticker_data.get("volume"),
            })

    return {
        "symbol": symbol,
        "series": series,
        "days": len(series),
    }


def get_latest_snapshot():
    """Get the most recent snapshot."""
    history = _load_history()
    snapshots = history.get("snapshots", [])
    if snapshots:
        return snapshots[-1]
    return None


def get_sector_summary(days=30):
    """Get sector ETF IV/HV evolution summary."""
    sectors = ["XLK", "XLV", "XLP", "XLU", "XLF", "XLE", "XLB", "XLY"]
    history = _load_history()
    snapshots = history.get("snapshots", [])[-days:]

    result = {}
    for sector in sectors:
        series = []
        for snap in snapshots:
            td = snap.get("tickers", {}).get(sector)
            if td:
                series.append({
                    "date": snap["date"],
                    "iv": td.get("iv"),
                    "hv": td.get("hv"),
                    "last": td.get("last"),
                    "change_pct": td.get("change_pct"),
                    "put_call_ratio": td.get("put_call_ratio"),
                })
        meta = SECTOR_ETFS.get(sector, {})
        result[sector] = {
            "name": meta.get("name", sector),
            "series": series,
            "current": series[-1] if series else None,
        }

    return result
