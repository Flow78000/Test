"""
FLO.W — Dividend Data Cache
Fetches dividend yield and ex-date from TWS for a list of tickers.
Caches results to avoid repeated slow API calls.
"""
import os
import json
import time
from datetime import datetime, timezone
from ib_insync import Stock

CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dividend_cache.json")
CACHE_TTL = 86400  # 24 hours


def _load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"tickers": {}, "last_updated": None}


def _save_cache(data):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except:
        pass


def get_cached_dividend(ticker):
    cache = _load_cache()
    entry = cache.get("tickers", {}).get(ticker)
    if entry and time.time() - entry.get("_ts", 0) < CACHE_TTL:
        return entry
    return None


def fetch_dividends_batch(ib, tickers):
    """Fetch dividend info for a batch of tickers via TWS.
    Uses reqMktData with generic tick 456 (dividend info).
    Returns dict of ticker -> {div_yield, ex_date, div_amount}
    """
    if not ib or not ib.isConnected():
        return {}

    cache = _load_cache()
    results = {}
    to_fetch = []

    # Check cache first
    for ticker in tickers:
        cached = cache.get("tickers", {}).get(ticker)
        if cached and time.time() - cached.get("_ts", 0) < CACHE_TTL:
            results[ticker] = cached
        else:
            to_fetch.append(ticker)

    if not to_fetch:
        return results

    # Qualify and request market data for uncached tickers
    contracts = {}
    for ticker in to_fetch[:20]:  # Limit batch to 20 to avoid TWS throttling
        try:
            c = Stock(ticker, "SMART", "USD")
            qualified = ib.qualifyContracts(c)
            if qualified:
                contracts[ticker] = qualified[0]
        except:
            pass

    if not contracts:
        return results

    # Request with generic ticks: 456 = dividends
    ticker_map = {}
    for ticker, contract in contracts.items():
        try:
            ticker_map[ticker] = ib.reqMktData(contract, genericTickList="456", snapshot=True, regulatorySnapshot=False)
        except:
            pass

    ib.sleep(4)

    # Extract dividend data
    for ticker, t in ticker_map.items():
        try:
            # Dividend data comes in the dividends field
            div_data = getattr(t, 'dividends', None)
            last_div = getattr(t, 'lastDividendDate', None)

            # Try fundamental ratios
            fund = getattr(t, 'fundamentalRatios', None)

            div_yield = None
            div_amount = None

            if div_data:
                # div_data is a Dividends named tuple: past12Months, next12Months, nextDate, nextAmount
                if hasattr(div_data, 'past12Months') and div_data.past12Months:
                    div_amount = float(div_data.past12Months)
                if hasattr(div_data, 'next12Months') and div_data.next12Months:
                    div_amount = float(div_data.next12Months)

            # Calculate yield from price
            price = None
            if t.last and t.last == t.last:
                price = float(t.last)
            elif t.close and t.close == t.close:
                price = float(t.close)

            if div_amount and price and price > 0:
                div_yield = round(div_amount / price * 100, 2)

            entry = {
                "div_yield": div_yield,
                "div_amount": round(div_amount, 4) if div_amount else None,
                "has_options": True,
                "price": round(price, 2) if price else None,
                "_ts": time.time(),
            }
            results[ticker] = entry
            cache.setdefault("tickers", {})[ticker] = entry
        except:
            results[ticker] = {"div_yield": None, "div_amount": None, "has_options": True, "_ts": time.time()}

    # Cancel market data
    for ticker, contract in contracts.items():
        try:
            ib.cancelMktData(contract)
        except:
            pass

    # Save cache
    cache["last_updated"] = datetime.now(timezone.utc).isoformat()
    _save_cache(cache)

    return results


def get_all_cached():
    """Return all cached dividend data"""
    cache = _load_cache()
    return cache.get("tickers", {})
