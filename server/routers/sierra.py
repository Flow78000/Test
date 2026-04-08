"""Sierra Chart CSV reader — multi-asset signal analysis"""
import os
from fastapi import APIRouter, Query
from services.sierra_reader import (
    sierra_scan_files, sierra_read_last_bars, sierra_read_history,
    sierra_mean_reversion_signals, sierra_columns, sierra_dashboard,
    sierra_performance, sierra_gex_analysis
)

router = APIRouter()

@router.get("/files")
def list_files():
    return sierra_scan_files()

@router.get("/signals")
def signals(symbol: str = "USEquities"):
    return sierra_read_last_bars(1, symbol)

@router.get("/last")
def last_bars(symbol: str = "USEquities", n: int = 20):
    return sierra_read_last_bars(n, symbol)

@router.get("/history")
def history(symbol: str = "USEquities", bars: int = 200):
    return sierra_read_history(bars, symbol)

@router.get("/columns")
def columns(symbol: str = "USEquities"):
    return sierra_columns(symbol)

@router.get("/zones")
def zones(symbol: str = "USEquities"):
    data = sierra_read_last_bars(1, symbol)
    if "deviations" in data:
        z = data["deviations"]
        z["symbol"] = symbol
        z["price"] = data.get("signals", {}).get("last")
        z["vwap"] = data.get("signals", {}).get("vwap")
        return z
    return data

@router.get("/mean-reversion")
def mean_reversion(symbol: str = "USEquities", bars: int = 100):
    return sierra_mean_reversion_signals(bars, symbol)

@router.get("/dashboard")
def dashboard():
    return sierra_dashboard()

@router.get("/performance")
def performance(symbol: str = "USEquities"):
    return sierra_performance(symbol)

@router.get("/performance-all")
def performance_all():
    files = sierra_scan_files()
    all_perf = {}
    for sym in files:
        all_perf[sym] = sierra_performance(sym)
    return {"assets": all_perf, "asset_count": len(all_perf)}

@router.get("/daily-ranges")
def daily_ranges(days: int = 10):
    """Compute daily OHLC ranges from all Sierra CSV files"""
    files = sierra_scan_files()
    result = {}
    for sym in files:
        hist = sierra_read_history(bars=2000, symbol=sym)
        if "error" in hist:
            continue
        rows = hist.get("history", [])
        if not rows:
            continue
        # Aggregate by date
        daily = {}
        for r in rows:
            date = str(r.get("Date", ""))
            if not date or date == "Date":
                continue
            o = r.get(" Open", r.get("Open"))
            h = r.get(" High", r.get("High"))
            l = r.get(" Low", r.get("Low"))
            c = r.get(" Last", r.get("Last"))
            try:
                o, h, l, c = float(o), float(h), float(l), float(c)
            except (TypeError, ValueError):
                continue
            if date not in daily:
                daily[date] = {"open": o, "high": h, "low": l, "close": c}
            else:
                d = daily[date]
                if h > d["high"]: d["high"] = h
                if l < d["low"]: d["low"] = l
                d["close"] = c
        # Take last N days
        sorted_days = sorted(daily.keys())[-days:]
        ranges = []
        prev_close = None
        for dt in sorted_days:
            d = daily[dt]
            range_pts = round(d["high"] - d["low"], 4)
            range_pct = round(range_pts / d["close"] * 100, 4) if d["close"] else 0
            rv_daily = round(abs(d["close"] - prev_close) / prev_close * 100, 4) if prev_close and prev_close != 0 else None
            change_pct = round((d["close"] - prev_close) / prev_close * 100, 4) if prev_close and prev_close != 0 else None
            ranges.append({
                "date": dt,
                "open": round(d["open"], 4),
                "high": round(d["high"], 4),
                "low": round(d["low"], 4),
                "close": round(d["close"], 4),
                "range_pts": range_pts,
                "range_pct": range_pct,
                "rv_daily": rv_daily,
                "change_pct": change_pct,
            })
            prev_close = d["close"]
        meta = files[sym]
        result[sym] = {
            "name": meta["name"],
            "asset_class": meta["asset_class"],
            "days": ranges,
            "latest": ranges[-1] if ranges else None,
        }
    return {"assets": result, "asset_count": len(result)}

@router.get("/gex-analysis")
def gex_analysis(bars: int = 5000):
    """Analyse Total GEX crossings, distribution, and time series from SP500GEX"""
    return sierra_gex_analysis(bars)

@router.get("/signal-history")
def signal_history():
    """Return pre-computed 5-day signal history from all Sierra CSVs"""
    import json
    history_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sierra_signal_history.json")
    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            return json.load(f)
    return {"error": "Historique non genere. Lancer le script d'extraction."}
