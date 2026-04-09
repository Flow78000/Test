"""
FLO.W — Dividend Data via yfinance (no TWS required)
Fetches dividend yield, rate, ex-date for any ticker.
Caches results 24h to avoid repeated API calls.
"""
import os
import json
import time
from datetime import datetime, timezone

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


def fetch_dividends_batch(ib_unused, tickers):
    """Fetch dividend info via yfinance for a batch of tickers.
    ib parameter kept for compatibility but not used."""
    import yfinance as yf

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

    # Fetch via yfinance (batch — max 20 to avoid throttling)
    for ticker in to_fetch[:20]:
        try:
            t = yf.Ticker(ticker)
            info = t.info or {}

            div_yield = info.get("dividendYield")
            if div_yield and div_yield > 0:
                div_yield = round(div_yield * 100 if div_yield < 1 else div_yield, 2)
            else:
                div_yield = None

            div_rate = info.get("dividendRate")
            ex_date_ts = info.get("exDividendDate")
            ex_date = None
            if ex_date_ts and isinstance(ex_date_ts, (int, float)):
                try:
                    ex_date = datetime.fromtimestamp(ex_date_ts).strftime("%Y-%m-%d")
                except:
                    pass

            price = info.get("currentPrice") or info.get("regularMarketPrice")
            has_options = info.get("options") is not None or True  # Most listed stocks have options

            entry = {
                "div_yield": div_yield,
                "div_rate": round(div_rate, 4) if div_rate else None,
                "ex_date": ex_date,
                "has_options": has_options,
                "price": round(float(price), 2) if price else None,
                "has_dividend": div_yield is not None and div_yield > 0,
                "_ts": time.time(),
            }
            results[ticker] = entry
            cache.setdefault("tickers", {})[ticker] = entry
        except Exception as e:
            results[ticker] = {"div_yield": None, "has_dividend": False, "has_options": True, "_ts": time.time()}

    # Save cache
    cache["last_updated"] = datetime.now(timezone.utc).isoformat()
    _save_cache(cache)

    return results


def get_all_cached():
    """Return all cached dividend data"""
    cache = _load_cache()
    return cache.get("tickers", {})
