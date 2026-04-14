"""
FLO.W — Nanex #1 Trading Ahead of News
Detects suspicious trading activity that occurs BEFORE major news events.
Cross-references unusual options flow and dark pool spikes with news archives.
"""
from __future__ import annotations

import time
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import requests

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}
CACHE_TTL = 300  # 5 minutes


def _cached(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _store(key: str, val: Any) -> None:
    _cache[key] = (time.time(), val)


# ---------------------------------------------------------------------------
# Internal API helpers
# ---------------------------------------------------------------------------
BASE_URL = "http://127.0.0.1:3850"


def _get(path: str, timeout: int = 8) -> Optional[Dict]:
    try:
        r = requests.get(f"{BASE_URL}{path}", timeout=timeout)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Data fetchers
# ---------------------------------------------------------------------------

def _fetch_news() -> List[Dict[str, Any]]:
    """Fetch recent news from the archive."""
    cached = _cached("news_items")
    if cached is not None:
        return cached
    data = _get("/api/news/archive?limit=100")
    if not data:
        return []
    items = data.get("items", [])
    _store("news_items", items)
    return items


def _fetch_flow_alerts() -> List[Dict[str, Any]]:
    """Fetch recent flow alerts from UW proxy."""
    cached = _cached("flow_alerts")
    if cached is not None:
        return cached
    data = _get("/api/uw/flow-alerts")
    if not data:
        return []
    # UW flow alerts may be nested under 'data'
    alerts = data if isinstance(data, list) else data.get("data", [])
    _store("flow_alerts", alerts)
    return alerts


def _fetch_dark_pool() -> List[Dict[str, Any]]:
    """Fetch recent dark pool activity."""
    cached = _cached("dark_pool")
    if cached is not None:
        return cached
    data = _get("/api/uw/darkpool-recent")
    if not data:
        return []
    items = data if isinstance(data, list) else data.get("data", [])
    _store("dark_pool", items)
    return items


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _get_tickers(item: Dict[str, Any]) -> List[str]:
    """Extract list of tickers from a news item."""
    tickers = item.get("tickers") or item.get("ticker") or []
    if isinstance(tickers, str):
        tickers = [tickers]
    return [str(t).upper() for t in tickers if t]


def _classify_news_direction(headline: str) -> Optional[str]:
    """
    Rudimentary classification of news impact direction.
    Returns 'BULLISH', 'BEARISH', or None.
    """
    headline_lower = headline.lower()
    bullish_kw = [
        "beat", "beats", "exceed", "record", "profit", "growth", "raise",
        "upgrade", "surge", "strong", "acquisition", "buyback", "deal",
        "agreement", "approve", "approved", "partnership", "positive",
        "outperform", "revenue up", "earnings up",
    ]
    bearish_kw = [
        "miss", "misses", "below", "loss", "drop", "cut", "lower", "downgrade",
        "warning", "recall", "lawsuit", "fine", "penalty", "layoff", "bankruptcy",
        "decline", "weak", "shortfall", "disappointing", "investigation",
    ]
    bullish = sum(1 for kw in bullish_kw if kw in headline_lower)
    bearish = sum(1 for kw in bearish_kw if kw in headline_lower)
    if bullish > bearish and bullish > 0:
        return "BULLISH"
    if bearish > bullish and bearish > 0:
        return "BEARISH"
    return None


def _flow_direction(flow: Dict[str, Any]) -> str:
    """Extract direction label from a flow alert entry."""
    # Common fields: sentiment, put_call, option_type
    pc = (flow.get("put_call") or flow.get("option_type") or "").upper()
    sentiment = (flow.get("sentiment") or "").upper()
    if pc == "CALL" or sentiment == "BULLISH":
        return "BULLISH"
    if pc == "PUT" or sentiment == "BEARISH":
        return "BEARISH"
    return "NEUTRAL"


def _direction_match(flow_dir: str, news_dir: Optional[str]) -> bool:
    """True if trade direction anticipated the news correctly."""
    if news_dir is None or flow_dir == "NEUTRAL":
        return False
    return flow_dir == news_dir


def _score_signal(
    pre_trades: List[Dict[str, Any]],
    news_time: datetime,
    news_direction: Optional[str],
) -> int:
    """
    Score a suspicious signal 0-100 based on:
    - Premium size of pre-news trades
    - Time gap (closer = more suspicious)
    - Direction match (correct direction before news)
    """
    if not pre_trades:
        return 0

    score = 0

    # Premium component — largest single trade dominates
    max_premium = max(t.get("premium", 0) for t in pre_trades)
    if max_premium >= 5_000_000:
        score += 40
    elif max_premium >= 2_000_000:
        score += 30
    elif max_premium >= 1_000_000:
        score += 22
    elif max_premium >= 500_000:
        score += 15
    else:
        score += 5

    # Time gap component — closer to news = more suspicious
    gaps = []
    for t in pre_trades:
        trade_time = _parse_iso(t.get("time") or t.get("created_at"))
        if trade_time and news_time:
            gap_minutes = (news_time - trade_time).total_seconds() / 60
            if 0 < gap_minutes <= 240:
                gaps.append(gap_minutes)

    if gaps:
        min_gap = min(gaps)
        if min_gap <= 30:
            score += 35
        elif min_gap <= 60:
            score += 28
        elif min_gap <= 120:
            score += 20
        elif min_gap <= 180:
            score += 12
        else:
            score += 5

    # Direction match component
    matched = any(
        _direction_match(_flow_direction(t), news_direction)
        for t in pre_trades
    )
    if matched:
        score += 25

    return min(100, score)


def _fmt_time_gap(gap_minutes: float) -> str:
    """Format gap in minutes as human-readable string."""
    if gap_minutes < 60:
        return f"{int(gap_minutes)}min avant"
    h = int(gap_minutes // 60)
    m = int(gap_minutes % 60)
    if m == 0:
        return f"{h}h avant"
    return f"{h}h{m:02d} avant"


# ---------------------------------------------------------------------------
# Main scanner
# ---------------------------------------------------------------------------

def scan_news_trading() -> Dict[str, Any]:
    """
    Cross-reference recent news with pre-news unusual activity.
    Returns signals with suspicion scores.
    Cached for 5 minutes.
    """
    cached = _cached("news_trading_result")
    if cached is not None:
        return cached

    now_utc = datetime.now(timezone.utc)

    # Fetch raw data — graceful on failure
    news_items = _fetch_news()
    flow_alerts = _fetch_flow_alerts()
    dark_pool_items = _fetch_dark_pool()

    # Build flow index by ticker for quick lookup
    flow_by_ticker: Dict[str, List[Dict[str, Any]]] = {}
    for alert in flow_alerts:
        ticker = (alert.get("ticker") or alert.get("symbol") or "").upper()
        if ticker:
            flow_by_ticker.setdefault(ticker, []).append(alert)

    dp_by_ticker: Dict[str, List[Dict[str, Any]]] = {}
    for dp in dark_pool_items:
        ticker = (dp.get("ticker") or dp.get("symbol") or "").upper()
        if ticker:
            dp_by_ticker.setdefault(ticker, []).append(dp)

    signals: List[Dict[str, Any]] = []
    news_scanned = 0

    for item in news_items:
        tickers = _get_tickers(item)
        if not tickers:
            continue

        news_time = _parse_iso(item.get("created_at") or item.get("published_at"))
        if not news_time:
            continue

        # Only look at news within the last 48h
        if (now_utc - news_time).total_seconds() > 48 * 3600:
            continue

        headline = item.get("headline") or item.get("title") or ""
        news_direction = _classify_news_direction(headline)
        news_scanned += 1

        for ticker in tickers:
            # Find pre-news flow activity (1-4 hours before)
            window_start = news_time - timedelta(hours=4)
            window_end = news_time - timedelta(minutes=5)  # exclude last 5min

            pre_trades: List[Dict[str, Any]] = []

            # Check options flow
            for alert in flow_by_ticker.get(ticker, []):
                trade_time = _parse_iso(
                    alert.get("time") or alert.get("created_at") or alert.get("date")
                )
                if not trade_time:
                    continue
                # Normalize to aware datetime
                if trade_time.tzinfo is None:
                    trade_time = trade_time.replace(tzinfo=timezone.utc)
                premium = float(alert.get("premium") or alert.get("total_premium") or 0)
                if premium < 500_000:
                    continue
                if window_start <= trade_time <= window_end:
                    gap_min = (news_time - trade_time).total_seconds() / 60
                    pre_trades.append({
                        "type": (alert.get("put_call") or alert.get("option_type") or "OPTION").upper(),
                        "premium": premium,
                        "time": trade_time.isoformat(),
                        "strike": alert.get("strike"),
                        "expiry": alert.get("expiry") or alert.get("expiration"),
                        "gap_minutes": round(gap_min, 1),
                        "source": "options_flow",
                    })

            # Check dark pool
            for dp in dp_by_ticker.get(ticker, []):
                dp_time = _parse_iso(
                    dp.get("time") or dp.get("created_at") or dp.get("executed_at")
                )
                if not dp_time:
                    continue
                if dp_time.tzinfo is None:
                    dp_time = dp_time.replace(tzinfo=timezone.utc)
                size = float(dp.get("size") or dp.get("volume") or 0)
                price = float(dp.get("price") or dp.get("execution_price") or 0)
                notional = size * price
                if notional < 500_000:
                    continue
                if window_start <= dp_time <= window_end:
                    gap_min = (news_time - dp_time).total_seconds() / 60
                    pre_trades.append({
                        "type": "DARK POOL",
                        "premium": notional,
                        "time": dp_time.isoformat(),
                        "strike": None,
                        "expiry": None,
                        "gap_minutes": round(gap_min, 1),
                        "source": "dark_pool",
                    })

            if not pre_trades:
                continue

            # Sort by closest to news
            pre_trades.sort(key=lambda t: t["gap_minutes"])

            score = _score_signal(pre_trades, news_time, news_direction)

            # Only surface signals with a meaningful score
            if score < 20:
                continue

            # Build summary
            min_gap = min(t["gap_minutes"] for t in pre_trades)
            max_prem = max(t["premium"] for t in pre_trades)
            direction_match = any(
                _direction_match(_flow_direction_from_type(t["type"]), news_direction)
                for t in pre_trades
            )
            summary = _build_summary(pre_trades, min_gap, max_prem, direction_match, news_direction)

            signals.append({
                "id": str(uuid.uuid4())[:8],
                "ticker": ticker,
                "news_headline": headline,
                "news_time": news_time.isoformat(),
                "news_direction": news_direction,
                "suspicious_trades": pre_trades[:10],  # cap for JSON size
                "score": score,
                "time_gap_minutes": round(min_gap, 1),
                "time_gap_label": _fmt_time_gap(min_gap),
                "direction_match": direction_match,
                "max_premium": max_prem,
                "summary": summary,
            })

    # Deduplicate: if same ticker+headline already covered, keep highest score
    seen: Dict[str, Dict[str, Any]] = {}
    for sig in signals:
        key = f"{sig['ticker']}|{sig['news_headline'][:60]}"
        if key not in seen or sig["score"] > seen[key]["score"]:
            seen[key] = sig

    deduped = sorted(seen.values(), key=lambda s: s["score"], reverse=True)

    avg_score = (
        round(sum(s["score"] for s in deduped) / len(deduped))
        if deduped else 0
    )

    result = {
        "ok": True,
        "generated_at": now_utc.isoformat(),
        "signals": deduped,
        "stats": {
            "news_scanned": news_scanned,
            "matches_found": len(deduped),
            "avg_score": avg_score,
            "flow_alerts_checked": len(flow_alerts),
            "dark_pool_checked": len(dark_pool_items),
        },
    }

    _store("news_trading_result", result)
    return result


def _flow_direction_from_type(trade_type: str) -> str:
    t = trade_type.upper()
    if "CALL" in t:
        return "BULLISH"
    if "PUT" in t:
        return "BEARISH"
    return "NEUTRAL"


def _build_summary(
    trades: List[Dict[str, Any]],
    min_gap: float,
    max_prem: float,
    direction_match: bool,
    news_direction: Optional[str],
) -> str:
    count = len(trades)
    gap_str = _fmt_time_gap(min_gap)

    if max_prem >= 2_000_000:
        prem_str = f"${max_prem/1e6:.1f}M"
    elif max_prem >= 1_000_000:
        prem_str = f"${max_prem/1e6:.1f}M"
    else:
        prem_str = f"${max_prem/1e3:.0f}K"

    trade_types = list({t["type"] for t in trades})
    type_str = ", ".join(trade_types[:2])

    match_str = ""
    if direction_match and news_direction:
        dir_fr = "haussier" if news_direction == "BULLISH" else "baissier"
        match_str = f" — direction {dir_fr} confirmée"

    return f"{count} trade(s) {type_str} ({prem_str} max) {gap_str}{match_str}"
