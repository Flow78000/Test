"""
FLO.W - Smart Money Scanner (ex Nanex #1)
==========================================
Detecte les tickers sur lesquels l'argent "intelligent" se positionne :
gros flux options (calls/puts premium > seuil) croises avec presence
dans l'actualite recente.

Logique :
1. Recupere les flow alerts UW (trades options avec premium significatif)
2. Agrege par ticker : volume total, direction dominante, plus gros trade
3. Croise avec news archive : le ticker est-il dans l'actualite ?
4. Score 0-100 base sur : taille du flow + presence news + coherence direction
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}
CACHE_TTL = 180  # 3 minutes

BASE_URL = "http://127.0.0.1:3850"


def _cached(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _store(key: str, val: Any) -> None:
    _cache[key] = (time.time(), val)


def _get(path: str, timeout: int = 8) -> Optional[Dict]:
    try:
        r = requests.get(f"{BASE_URL}{path}", timeout=timeout)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Fetchers
# ---------------------------------------------------------------------------
def _fetch_flow_alerts() -> List[Dict[str, Any]]:
    data = _get("/api/uw/flow-alerts")
    if not data:
        return []
    return data if isinstance(data, list) else data.get("data", [])


def _fetch_news() -> List[Dict[str, Any]]:
    data = _get("/api/news/archive?limit=200")
    if not data:
        return []
    return data.get("items", [])


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------
def _parse_time(val: Any) -> Optional[datetime]:
    """Accepte ISO string, epoch ms, epoch s."""
    if val is None:
        return None
    try:
        # epoch numeric
        if isinstance(val, (int, float)):
            if val > 1e12:  # ms
                return datetime.fromtimestamp(val / 1000, tz=timezone.utc)
            return datetime.fromtimestamp(val, tz=timezone.utc)
        s = str(val)
        # epoch as string
        if s.replace(".", "").isdigit():
            f = float(s)
            if f > 1e12:
                return datetime.fromtimestamp(f / 1000, tz=timezone.utc)
            return datetime.fromtimestamp(f, tz=timezone.utc)
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _to_float(v: Any) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _flow_direction(alert: Dict[str, Any]) -> str:
    """Determine BULLISH / BEARISH / NEUTRAL from a UW flow alert."""
    opt = str(alert.get("option_type") or alert.get("put_call") or "").lower()
    if "call" in opt or opt == "c":
        return "BULLISH"
    if "put" in opt or opt == "p":
        return "BEARISH"
    sentiment = str(alert.get("sentiment") or "").upper()
    if sentiment in ("BULLISH", "BEARISH"):
        return sentiment
    return "NEUTRAL"


def _classify_news(headline: str) -> Optional[str]:
    """Rudimentary FR+EN news direction classifier."""
    h = headline.lower()
    bull = [
        "beat", "beats", "exceed", "record", "profit", "growth", "raise",
        "upgrade", "surge", "strong", "acquisition", "buyback", "deal",
        "approve", "approved", "partnership", "positive", "outperform",
        "gains", "rally", "jumps", "soars", "boost", "positive",
    ]
    bear = [
        "miss", "misses", "below", "loss", "drop", "cut", "lower", "downgrade",
        "warning", "recall", "lawsuit", "fine", "penalty", "layoff",
        "bankruptcy", "decline", "weak", "shortfall", "disappointing",
        "investigation", "slump", "falls", "plunge", "tumble", "crash",
        "probe", "subpoena", "fraud",
    ]
    b = sum(1 for k in bull if k in h)
    r = sum(1 for k in bear if k in h)
    if b > r and b > 0:
        return "BULLISH"
    if r > b and r > 0:
        return "BEARISH"
    return None


def _news_tickers(item: Dict[str, Any]) -> List[str]:
    t = item.get("tickers") or item.get("ticker") or []
    if isinstance(t, str):
        t = [t]
    return [str(x).upper() for x in t if x]


# ---------------------------------------------------------------------------
# Main scanner
# ---------------------------------------------------------------------------
def scan_smart_money(
    min_premium: float = 250_000,
    premium_threshold: float = 500_000,
) -> Dict[str, Any]:
    """
    Scan du smart money : aggregation du flow options par ticker + croisement news.
    Cache 3 minutes.

    Args:
        min_premium: seuil minimum par trade (filtrage initial)
        premium_threshold: seuil de significance pour remonter un ticker
    """
    cached = _cached("smart_money_result")
    if cached is not None:
        return cached

    now_utc = datetime.now(timezone.utc)
    flow_alerts = _fetch_flow_alerts()
    news_items = _fetch_news()

    # --- Index news par ticker ---
    news_by_ticker: Dict[str, List[Dict[str, Any]]] = {}
    for item in news_items:
        nt = _parse_time(item.get("created_at") or item.get("published_at"))
        if not nt:
            continue
        # Garder seulement news des dernieres 48h
        if (now_utc - nt).total_seconds() > 48 * 3600:
            continue
        tickers = _news_tickers(item)
        if not tickers:
            continue
        headline = item.get("headline") or item.get("title") or ""
        enriched = {
            "headline": headline,
            "time": nt.isoformat(),
            "direction": _classify_news(headline),
            "source": item.get("source") or item.get("publisher") or "",
            "url": item.get("url") or "",
        }
        for t in tickers:
            news_by_ticker.setdefault(t, []).append(enriched)

    # --- Agregation flow par ticker ---
    flow_by_ticker: Dict[str, Dict[str, Any]] = {}
    filtered_alerts = 0
    for alert in flow_alerts:
        ticker = str(alert.get("ticker") or alert.get("symbol") or "").upper()
        if not ticker:
            continue
        premium = _to_float(alert.get("total_premium") or alert.get("premium") or 0)
        if premium < min_premium:
            continue
        filtered_alerts += 1

        direction = _flow_direction(alert)
        trade_time = _parse_time(alert.get("end_time") or alert.get("start_time") or alert.get("created_at"))

        agg = flow_by_ticker.setdefault(ticker, {
            "ticker": ticker,
            "total_premium": 0.0,
            "call_premium": 0.0,
            "put_premium": 0.0,
            "trade_count": 0,
            "max_premium": 0.0,
            "largest_trade": None,
            "latest_time": None,
            "trades": [],
        })

        agg["total_premium"] += premium
        agg["trade_count"] += 1
        if direction == "BULLISH":
            agg["call_premium"] += premium
        elif direction == "BEARISH":
            agg["put_premium"] += premium

        if premium > agg["max_premium"]:
            agg["max_premium"] = premium
            agg["largest_trade"] = {
                "direction": direction,
                "premium": premium,
                "strike": _to_float(alert.get("strike")),
                "expiry": alert.get("expiry") or alert.get("expiration"),
                "price": _to_float(alert.get("price")),
                "time": trade_time.isoformat() if trade_time else None,
                "alert_rule": alert.get("alert_rule"),
            }

        if trade_time:
            if agg["latest_time"] is None or trade_time.isoformat() > agg["latest_time"]:
                agg["latest_time"] = trade_time.isoformat()

        # Garder un echantillon de trades pour le detail
        if len(agg["trades"]) < 10:
            agg["trades"].append({
                "direction": direction,
                "premium": premium,
                "strike": _to_float(alert.get("strike")),
                "expiry": alert.get("expiry") or alert.get("expiration"),
                "time": trade_time.isoformat() if trade_time else None,
                "alert_rule": alert.get("alert_rule"),
            })

    # --- Scoring + construction signaux ---
    signals: List[Dict[str, Any]] = []
    for ticker, agg in flow_by_ticker.items():
        total = agg["total_premium"]
        if total < premium_threshold:
            continue

        # Bias direction
        call_p = agg["call_premium"]
        put_p = agg["put_premium"]
        if total > 0:
            call_ratio = call_p / total
        else:
            call_ratio = 0.5
        if call_ratio >= 0.70:
            flow_direction = "BULLISH"
        elif call_ratio <= 0.30:
            flow_direction = "BEARISH"
        else:
            flow_direction = "MIXED"

        # Score — 3 composantes
        score = 0

        # (A) Premium total : 0-45 points
        if total >= 20_000_000:
            score += 45
        elif total >= 10_000_000:
            score += 38
        elif total >= 5_000_000:
            score += 30
        elif total >= 2_000_000:
            score += 22
        elif total >= 1_000_000:
            score += 15
        else:
            score += 8

        # (B) Concentration directionnelle : 0-25 points
        bias = abs(call_ratio - 0.5) * 2  # 0 = balanced, 1 = all one side
        score += int(bias * 25)

        # (C) Actualite news : 0-30 points
        news_list = news_by_ticker.get(ticker, [])
        news_score = 0
        best_news_match = None
        if news_list:
            news_score = 12  # presence de news = +12
            # Direction match bonus
            for n in news_list:
                if n["direction"] and flow_direction != "MIXED":
                    if n["direction"] == flow_direction:
                        news_score = max(news_score, 30)
                        best_news_match = {**n, "match": True}
                    else:
                        # Mismatch = suspicion differente (on garde quand meme)
                        if best_news_match is None:
                            best_news_match = {**n, "match": False}
                elif best_news_match is None:
                    best_news_match = {**n, "match": None}
            if best_news_match is None and news_list:
                best_news_match = {**news_list[0], "match": None}
        score += news_score
        score = min(100, score)

        # Summary FR
        summary = _build_summary(
            ticker, total, agg["trade_count"], flow_direction,
            bool(news_list), best_news_match,
        )

        signals.append({
            "id": str(uuid.uuid4())[:8],
            "ticker": ticker,
            "score": score,
            "total_premium": total,
            "call_premium": call_p,
            "put_premium": put_p,
            "call_ratio": round(call_ratio, 3),
            "flow_direction": flow_direction,
            "trade_count": agg["trade_count"],
            "max_premium": agg["max_premium"],
            "largest_trade": agg["largest_trade"],
            "latest_time": agg["latest_time"],
            "trades": agg["trades"],
            "news_count": len(news_list),
            "news": news_list[:5],
            "best_news_match": best_news_match,
            "has_news": bool(news_list),
            "summary": summary,
        })

    # Sort by score desc
    signals.sort(key=lambda s: s["score"], reverse=True)

    # Stats
    total_premium_all = sum(s["total_premium"] for s in signals)
    bullish_count = sum(1 for s in signals if s["flow_direction"] == "BULLISH")
    bearish_count = sum(1 for s in signals if s["flow_direction"] == "BEARISH")
    with_news = sum(1 for s in signals if s["has_news"])

    result = {
        "ok": True,
        "generated_at": now_utc.isoformat(),
        "signals": signals[:50],  # top 50
        "stats": {
            "tickers_flagged": len(signals),
            "flow_alerts_scanned": len(flow_alerts),
            "flow_alerts_kept": filtered_alerts,
            "news_items_scanned": len(news_items),
            "tickers_with_news": with_news,
            "total_premium": total_premium_all,
            "bullish_tickers": bullish_count,
            "bearish_tickers": bearish_count,
            "avg_score": round(sum(s["score"] for s in signals) / len(signals)) if signals else 0,
        },
    }

    _store("smart_money_result", result)
    return result


def _fmt_money(v: float) -> str:
    a = abs(v)
    if a >= 1e9:
        return f"${v/1e9:.2f}B"
    if a >= 1e6:
        return f"${v/1e6:.1f}M"
    if a >= 1e3:
        return f"${v/1e3:.0f}K"
    return f"${v:.0f}"


def _build_summary(
    ticker: str,
    total: float,
    count: int,
    direction: str,
    has_news: bool,
    news_match: Optional[Dict[str, Any]],
) -> str:
    dir_map = {"BULLISH": "haussier", "BEARISH": "baissier", "MIXED": "mixte"}
    dir_fr = dir_map.get(direction, "mixte")
    base = f"{ticker}: {_fmt_money(total)} sur {count} trades, flux {dir_fr}"
    if not has_news:
        return base + " - aucune news active"
    if news_match and news_match.get("match") is True:
        return base + " - confirme par une news"
    if news_match and news_match.get("match") is False:
        return base + " - contre-pied de la news"
    return base + " - news sur le ticker"
