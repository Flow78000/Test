"""TWS Market Data — readonly, no personal data"""
from fastapi import APIRouter, Query
from services.tws import fetch_quotes, compute_regime, WATCHLIST_VOL, WATCHLIST_FX, qualified, ib_connected, ib
from services.dividend_cache import fetch_dividends_batch, get_all_cached, get_cached_dividend
from services.vol_desk_collector import (
    collect_vol_desk_snapshot, save_snapshot,
    get_history, get_ticker_history, get_latest_snapshot, get_sector_summary,
    SECTOR_ETFS, CROSS_ASSET_VOL,
)

router = APIRouter()

@router.get("/vol-regime")
def vol_regime():
    if not ib_connected:
        return {"error": "TWS non connecte", "help": "Lancez TWS et appelez /api/health"}
    quotes = fetch_quotes(set(WATCHLIST_VOL.keys()))
    quotes["_ratios"] = compute_regime(quotes)
    return quotes

@router.get("/fx-matrix")
def fx_matrix():
    if not ib_connected:
        return {"error": "TWS non connecte"}
    return fetch_quotes(set(WATCHLIST_FX.keys()))

@router.get("/stress")
def stress():
    if not ib_connected:
        return {"error": "TWS non connecte"}
    return fetch_quotes({"TLT", "HYG", "BTAL", "EEM", "UVXY", "SVXY"})

@router.get("/reconnect")
def reconnect():
    from services.tws import connect_tws, qualify_all
    ok = connect_tws()
    if ok:
        qualify_all()
    return {"reconnected": ok}

# ================================================================
# Vol Desk Historical Data
# ================================================================

@router.get("/vol-desk/collect")
def vol_desk_collect():
    """Trigger a Vol Desk snapshot collection (requires TWS connected)"""
    if not ib_connected:
        return {"error": "TWS non connecte — impossible de collecter"}
    snapshot = collect_vol_desk_snapshot(ib)
    if "error" in snapshot:
        return snapshot
    days = save_snapshot(snapshot)
    return {"status": "ok", "date": snapshot["date"], "tickers_collected": snapshot["count"], "total_days_saved": days}

@router.get("/vol-desk/latest")
def vol_desk_latest():
    """Get the most recent Vol Desk snapshot (works without TWS)"""
    snap = get_latest_snapshot()
    if not snap:
        return {"error": "Aucun historique. Lancez /api/market/vol-desk/collect avec TWS."}
    return snap

@router.get("/vol-desk/history")
def vol_desk_history(days: int = 90):
    """Get Vol Desk history (all tickers, N days)"""
    return get_history(days)

@router.get("/vol-desk/ticker")
def vol_desk_ticker(symbol: str = "XLK", days: int = 90):
    """Get historical IV/HV/price for a single ticker"""
    return get_ticker_history(symbol.upper(), days)

@router.get("/vol-desk/sectors")
def vol_desk_sectors(days: int = 30):
    """Get sector ETF IV/HV evolution summary"""
    return get_sector_summary(days)

@router.get("/dividends")
def dividends(tickers: str = ""):
    """Fetch dividend data via yfinance (no TWS required).
    Results cached 24h."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()] if tickers else []
    if not ticker_list:
        return get_all_cached()
    return fetch_dividends_batch(None, ticker_list)

@router.get("/vol-desk/universe")
def vol_desk_universe():
    """List all tracked tickers with metadata"""
    all_tickers = {}
    all_tickers.update(SECTOR_ETFS)
    all_tickers.update(CROSS_ASSET_VOL)
    return {"tickers": all_tickers, "count": len(all_tickers)}
