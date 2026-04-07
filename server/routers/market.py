"""TWS Market Data — readonly, no personal data"""
from fastapi import APIRouter
from services.tws import fetch_quotes, compute_regime, WATCHLIST_VOL, WATCHLIST_FX, qualified, ib_connected

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
