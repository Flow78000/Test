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

@router.get("/sector-rotation")
def sector_rotation(days: int = 60):
    """Fetch 250-day price+IV history for all sector ETFs from UW realized vol.
    Returns normalized base-100 prices and spread cyclicals-defensives."""
    import concurrent.futures
    sectors = ["XLK", "XLV", "XLP", "XLU", "XLF", "XLE", "XLB", "XLY", "XLI", "XLRE"]
    cyclical = {"XLK", "XLY", "XLF", "XLE", "XLI", "XLB"}
    defensive = {"XLP", "XLU", "XLV", "XLRE"}

    def fetch_sector(ticker):
        data = uw_fetch(f"/stock/{ticker}/volatility/realized")
        items = data.get("data", data) if isinstance(data, dict) else data
        if not isinstance(items, list):
            return ticker, []
        return ticker, items[-days:] if len(items) > days else items

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(fetch_sector, s): s for s in sectors}
        for f in concurrent.futures.as_completed(futures):
            ticker, history = f.result()
            results[ticker] = history

    # Build unified date series
    all_dates = set()
    for ticker, hist in results.items():
        for d in hist:
            if d.get("date"):
                all_dates.add(d["date"])
    sorted_dates = sorted(all_dates)[-days:]

    # Build per-sector series with base-100 normalization
    sector_series = {}
    for ticker in sectors:
        hist = results.get(ticker, [])
        date_map = {d["date"]: d for d in hist if d.get("date")}
        prices = []
        for dt in sorted_dates:
            d = date_map.get(dt)
            if d and d.get("price"):
                prices.append({"date": dt, "price": float(d["price"]), "iv": float(d["implied_volatility"] or 0) * 100})
            elif prices:
                prices.append({"date": dt, "price": prices[-1]["price"], "iv": prices[-1]["iv"]})
        # Normalize base 100
        if prices:
            base = prices[0]["price"]
            for p in prices:
                p["base100"] = round(p["price"] / base * 100, 2) if base else 100
        sector_series[ticker] = prices

    # Compute spread cyclical - defensive per day
    spread = []
    for i, dt in enumerate(sorted_dates):
        cyc_vals = [sector_series[t][i]["base100"] for t in cyclical if t in sector_series and i < len(sector_series[t])]
        def_vals = [sector_series[t][i]["base100"] for t in defensive if t in sector_series and i < len(sector_series[t])]
        cyc_avg = sum(cyc_vals) / len(cyc_vals) if cyc_vals else 100
        def_avg = sum(def_vals) / len(def_vals) if def_vals else 100
        spread.append({"date": dt, "spread": round(cyc_avg - def_avg, 2), "cyclical": round(cyc_avg, 2), "defensive": round(def_avg, 2)})

    return {
        "sectors": sector_series,
        "spread": spread,
        "days": len(sorted_dates),
        "cyclical_tickers": list(cyclical),
        "defensive_tickers": list(defensive),
    }

@router.get("/spot-exposures/strike")
def spot_exposures(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/spot-exposures/strike")

@router.get("/stock-info")
def stock_info(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}")

@router.get("/dividend-history")
def dividend_history(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/dividend-history")
