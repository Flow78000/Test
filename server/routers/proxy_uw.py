"""Proxy UW API calls — avoids CORS issues from browser"""
import os
import subprocess
import json
from fastapi import APIRouter, Query

router = APIRouter()

UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")

def uw_fetch(endpoint: str):
    """Fetch from UW API via curl (avoids Python urllib 403)"""
    try:
        result = subprocess.run(
            ["curl", "-s", f"https://api.unusualwhales.com/api{endpoint}",
             "-H", f"Authorization: Bearer {UW_TOKEN}",
             "-H", "Accept: application/json"],
            capture_output=True, text=True, timeout=15
        )
        if result.stdout and result.stdout.strip():
            return json.loads(result.stdout)
        return {"error": "Empty response from UW API", "endpoint": endpoint}
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON from UW: {str(e)}", "endpoint": endpoint}
    except subprocess.TimeoutExpired:
        return {"error": "UW API timeout (15s)", "endpoint": endpoint}
    except Exception as e:
        return {"error": str(e)}

@router.get("/darkpool/{ticker}")
def darkpool(ticker: str):
    return uw_fetch(f"/darkpool/{ticker}")

@router.get("/option-contracts")
def option_contracts(ticker: str = "SPX", expiration: str = ""):
    return uw_fetch(f"/stock/{ticker}/option-contracts?expiration={expiration}")

@router.get("/greek-exposure/strike")
def greek_exposure_strike(ticker: str = "SPX"):
    return uw_fetch(f"/stock/{ticker}/greek-exposure/strike")

@router.get("/greek-exposure")
def greek_exposure(ticker: str = "SPX"):
    return uw_fetch(f"/stock/{ticker}/greek-exposure")

@router.get("/greek-flow")
def greek_flow(ticker: str = "SPX"):
    return uw_fetch(f"/stock/{ticker}/greek-flow")

@router.get("/iv-rank")
def iv_rank(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/iv-rank")

@router.get("/volatility/realized")
def realized_vol(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/volatility/realized")

@router.get("/market-tide")
def market_tide():
    return uw_fetch("/market/market-tide")

@router.get("/flow-alerts")
def flow_alerts():
    return uw_fetch("/option-trades/flow-alerts")

@router.get("/sector-etfs")
def sector_etfs():
    return uw_fetch("/market/sector-etfs")

@router.get("/news")
def news():
    return uw_fetch("/news/headlines")

@router.get("/earnings/premarket")
def earnings_pre(date: str = ""):
    ep = "/earnings/premarket"
    if date:
        ep += f"?date={date}"
    return uw_fetch(ep)

@router.get("/earnings/afterhours")
def earnings_post(date: str = ""):
    ep = "/earnings/afterhours"
    if date:
        ep += f"?date={date}"
    return uw_fetch(ep)

@router.get("/economic-calendar")
def economic_calendar():
    return uw_fetch("/market/economic-calendar")

@router.get("/total-options-volume")
def total_options_volume():
    return uw_fetch("/market/total-options-volume")

@router.get("/spot-exposures/strike")
def spot_exposures(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/spot-exposures/strike")

@router.get("/stock-info")
def stock_info(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}")

@router.get("/dividend-history")
def dividend_history(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/dividend-history")
