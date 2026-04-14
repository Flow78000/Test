"""Proxy UW API calls — avoids CORS issues from browser"""
import os
import subprocess
import json
from fastapi import APIRouter, Query

from services.uw_usage import record_request, get_usage

router = APIRouter()

UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")


def _split_headers_body(raw: str):
    """Split a curl -i response into (headers_raw, body_text).
    Handles both \r\n\r\n and \n\n, and takes the LAST separator so
    intermediate redirects are skipped."""
    if not raw:
        return "", ""
    sep = None
    idx = raw.rfind("\r\n\r\n")
    if idx >= 0:
        sep = "\r\n\r\n"
    else:
        idx = raw.rfind("\n\n")
        if idx >= 0:
            sep = "\n\n"
    if sep is None:
        return "", raw
    return raw[:idx], raw[idx + len(sep):]


def _extract_count_header(headers_raw: str):
    for line in headers_raw.splitlines():
        if line.lower().startswith("x-uw-daily-req-count:"):
            return line.split(":", 1)[1].strip()
    return None


def uw_fetch(endpoint: str):
    """Fetch from UW API via curl (avoids Python urllib 403).
    Also records UW usage via services.uw_usage.record_request."""
    try:
        result = subprocess.run(
            ["curl", "-s", "-i", f"https://api.unusualwhales.com/api{endpoint}",
             "-H", f"Authorization: Bearer {UW_TOKEN}",
             "-H", "Accept: application/json"],
            capture_output=True, text=True, timeout=15
        )
        raw = result.stdout or ""
        headers_raw, body = _split_headers_body(raw)
        count_header = _extract_count_header(headers_raw)

        parsed = None
        body_stripped = (body or "").strip()
        if body_stripped:
            try:
                parsed = json.loads(body_stripped)
            except json.JSONDecodeError:
                parsed = None

        # Detect UW error envelope (HTTP 200 + {"code": "...", no "data"})
        error_code = None
        if isinstance(parsed, dict) and "code" in parsed and "data" not in parsed:
            error_code = parsed.get("code")

        # Record usage (best-effort)
        try:
            record_request(count_header, error_code)
        except Exception:
            pass

        if parsed is not None:
            return parsed
        if body_stripped:
            return {"error": "Invalid JSON from UW", "endpoint": endpoint}
        return {"error": "Empty response from UW API", "endpoint": endpoint}
    except subprocess.TimeoutExpired:
        return {"error": "UW API timeout (15s)", "endpoint": endpoint}
    except Exception as e:
        return {"error": str(e)}


@router.get("/usage")
def usage():
    """Retourne l'etat du quota UW quotidien (count / limit / reset)."""
    return get_usage()

@router.get("/darkpool/{ticker}")
def darkpool(ticker: str):
    return uw_fetch(f"/darkpool/{ticker}")

@router.get("/darkpool-alerts")
def darkpool_alerts():
    """Scan the dark pool watchlist in parallel and return real-time alerts."""
    from services.darkpool_scanner import scan_darkpool
    return scan_darkpool()

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

@router.get("/sentiment")
def sentiment():
    """Calcule le sentiment agrege par ticker a partir des headlines UW
    et detecte les anomalies semantiques (spike volume, shift sentiment,
    vocab de crise)."""
    from services.sentiment_engine import compute_sentiment
    raw = uw_fetch("/news/headlines")
    headlines = []
    if isinstance(raw, dict):
        data = raw.get("data") or raw.get("headlines") or []
        if isinstance(data, list):
            headlines = data
        elif isinstance(raw, list):
            headlines = raw
    elif isinstance(raw, list):
        headlines = raw
    return compute_sentiment(headlines)

@router.get("/earnings/history")
def earnings_history(ticker: str = "AAPL"):
    """Historical earnings with pre/post moves, straddle returns, EPS surprise."""
    from services.earnings_history import build_earnings_history
    raw = uw_fetch(f"/earnings/{ticker}")
    rows = []
    if isinstance(raw, dict):
        rows = raw.get("data") or raw.get("earnings") or []
    elif isinstance(raw, list):
        rows = raw
    return build_earnings_history(ticker, rows)

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

@router.get("/spot-price")
def spot_price(ticker: str = "SPX"):
    """Get current spot price from iv-rank (latest close) + VIX."""
    iv_data = uw_fetch(f"/stock/{ticker}/iv-rank")
    items = iv_data.get("data", []) if isinstance(iv_data, dict) else []
    if not items:
        return {"error": "No iv-rank data", "ticker": ticker}
    latest = items[-1]
    spot = float(latest.get("close", 0))
    iv = float(latest.get("volatility", 0)) * 100
    iv_rank = float(latest.get("iv_rank_1y", 0))
    # Also get VIX
    vix_data = uw_fetch("/stock/VIX/iv-rank")
    vix_items = vix_data.get("data", []) if isinstance(vix_data, dict) else []
    vix = float(vix_items[-1].get("close", 0)) if vix_items else 0
    return {
        "spot": spot,
        "iv": iv,
        "iv_rank": iv_rank,
        "vix": vix,
        "date": latest.get("date"),
        "updated_at": latest.get("updated_at"),
    }

@router.get("/straddle")
def straddle_data(ticker: str = "SPX"):
    """Build ATM straddle table from real UW option contracts.
    Returns spot, VIX, and straddle rows for multiple expirations."""
    import concurrent.futures
    from datetime import datetime, timedelta

    # 1. Get spot price
    spot_info = spot_price(ticker)
    spot = spot_info.get("spot", 0)
    vix = spot_info.get("vix", 0)
    if not spot:
        return {"error": "Cannot get spot price", "detail": spot_info}

    # ATM strike (round to nearest 5)
    atm = round(spot / 5) * 5

    # 2. Fetch ALL contracts (UW returns top 500 most active across all expiries)
    all_data = uw_fetch(f"/stock/{ticker}/option-contracts")
    all_contracts = all_data.get("data", []) if isinstance(all_data, dict) else []

    if not all_contracts:
        return {"error": "No option contracts from UW", "spot": spot, "vix": vix}

    def _parse_sym(sym):
        """Parse SPXW260409C06800000 -> (date_str '260409', type 'C', strike 6800.0)"""
        for i in range(4, len(sym)):
            if sym[i] in ("C", "P") and i + 1 < len(sym) and sym[i + 1:].isdigit():
                date_part = sym[4:i] if sym.startswith("SPXW") or sym.startswith(ticker + "W") else sym[len(ticker):i]
                return date_part, sym[i], int(sym[i + 1:]) / 1000
        return None, None, 0

    # 3. Group contracts by expiration date
    by_exp = {}  # date_str -> list of contracts
    for c in all_contracts:
        sym = c.get("option_symbol", "")
        if not sym:
            continue
        date_part, opt_type, strike = _parse_sym(sym)
        if not date_part or not opt_type or strike <= 0:
            continue
        if date_part not in by_exp:
            by_exp[date_part] = []
        bid = float(c.get("nbbo_bid", 0) or 0)
        ask = float(c.get("nbbo_ask", 0) or 0)
        iv_val = float(c.get("implied_volatility", 0) or 0)
        by_exp[date_part].append({
            "type": opt_type, "strike": strike,
            "bid": bid, "ask": ask, "iv": iv_val,
        })

    # 4. Convert date strings to actual dates and compute DTE
    today = datetime.now().date()
    exp_with_dte = []
    for date_str, contracts in by_exp.items():
        try:
            y = 2000 + int(date_str[:2])
            m = int(date_str[2:4])
            d = int(date_str[4:6])
            exp_date = datetime(y, m, d).date()
            dte = (exp_date - today).days
            if dte < 0:
                continue
            exp_with_dte.append((dte, exp_date.isoformat(), contracts))
        except:
            continue

    exp_with_dte.sort(key=lambda x: x[0])

    # 5. For each target DTE, find the closest available expiration
    target_dtes = [0, 1, 2, 3, 7, 14, 30, 60, 90]
    used_exps = set()
    rows = []

    for target in target_dtes:
        best_match = None
        best_diff = float("inf")
        for dte, exp_iso, contracts in exp_with_dte:
            diff = abs(dte - target)
            if diff < best_diff and exp_iso not in used_exps:
                best_diff = diff
                best_match = (dte, exp_iso, contracts)
        if not best_match or best_diff > max(target * 0.5 + 2, 5):  # Allow tolerance
            continue
        used_exps.add(best_match[1])
        dte, exp_iso, contracts = best_match

        # Find ATM call + put
        best_call = None
        best_put = None
        min_call_dist = float("inf")
        min_put_dist = float("inf")

        for entry in contracts:
            dist = abs(entry["strike"] - atm)
            if entry["type"] == "C" and dist < min_call_dist:
                min_call_dist = dist
                best_call = entry
            elif entry["type"] == "P" and dist < min_put_dist:
                min_put_dist = dist
                best_put = entry

        if best_call and best_put:
                call_mid = (best_call["bid"] + best_call["ask"]) / 2
                put_mid = (best_put["bid"] + best_put["ask"]) / 2
                straddle = call_mid + put_mid
                avg_iv = (best_call["iv"] + best_put["iv"]) / 2 * 100
                pc_skew = round(call_mid / put_mid, 3) if put_mid > 0 else 0
                rows.append({
                    "dte": dte,
                    "expiry": exp_iso,
                    "strike": int(best_call["strike"]),
                    "callBid": best_call["bid"],
                    "callAsk": best_call["ask"],
                    "putBid": best_put["bid"],
                    "putAsk": best_put["ask"],
                    "straddle": round(straddle, 2),
                    "implMove": round(straddle, 2),
                    "implMovePct": round(straddle / spot * 100, 2),
                    "pcSkew": pc_skew,
                    "iv": round(avg_iv, 1),
                })

    rows.sort(key=lambda r: r["dte"])
    return {
        "spot": spot,
        "vix": vix,
        "atm": atm,
        "iv": spot_info.get("iv", 0),
        "iv_rank": spot_info.get("iv_rank", 0),
        "rows": rows,
        "is_live": True,
        "updated_at": spot_info.get("updated_at"),
    }

@router.get("/spot-exposures/strike")
def spot_exposures(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/spot-exposures/strike")

@router.get("/vol-surface")
def vol_surface(ticker: str = "SPY"):
    """Real implied volatility surface built from UW option contracts."""
    from services.vol_surface import build_vol_surface
    return build_vol_surface(ticker)

@router.get("/stock-info")
def stock_info(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}")

@router.get("/dividend-history")
def dividend_history(ticker: str = "SPY"):
    return uw_fetch(f"/stock/{ticker}/dividend-history")
