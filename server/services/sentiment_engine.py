"""
FLO.W - Sentiment Engine + Semantic Anomaly Detection

Builds a ticker-level sentiment score from news headlines.
Lexicon-based (fast, deterministic, no API dependency) — not a deep model.

Scoring:
  - Each headline gets a raw score = sum(pos_hits) - sum(neg_hits)
  - Normalized to -1..+1 via tanh
  - Ticker score = average of headline scores where ticker was mentioned
  - Anomaly = deviation from 30d baseline (persisted in cache)

Anomaly types detected:
  - VOLUME_SPIKE:    much more headlines than usual
  - SENTIMENT_SHIFT: sentiment dropped/rose abruptly
  - VOCAB_OUTLIER:   unusual keywords (crisis, lawsuit, hack, etc.)
"""
from __future__ import annotations

import json
import math
import os
import re
import time
from collections import defaultdict, Counter
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

try:
    from services.proxy_uw_client import uw_fetch  # type: ignore
except ImportError:
    uw_fetch = None  # type: ignore


# ---------------------------------------------------------------------------
# Lexicons — English + French (finance-aware)
# ---------------------------------------------------------------------------
POSITIVE_WORDS = {
    # English
    "beat", "beats", "beaten", "surge", "surges", "rally", "rallies", "rallied",
    "jump", "jumps", "jumped", "soar", "soars", "soared", "gain", "gains",
    "record", "high", "highs", "outperform", "outperformed", "upgrade", "upgraded",
    "strong", "strength", "robust", "solid", "optimistic", "bullish", "positive",
    "growth", "grew", "profit", "profits", "profitable", "boost", "boosts",
    "raise", "raised", "raises", "winner", "winners", "top", "tops", "topped",
    "exceed", "exceeds", "exceeded", "above", "expand", "expansion", "improve",
    "improved", "improves", "recovery", "rebound", "rebounds", "win", "wins",
    "approval", "approve", "approved", "breakthrough", "milestone", "partnership",
    "acquisition", "acquires", "acquire", "deal", "deals", "revenue", "earnings",
    # French
    "hausse", "progression", "bond", "performance", "rentable", "beneficiaire",
    "solide", "robuste", "optimiste", "haussier", "positif", "croissance",
    "benefice", "benefices", "gains", "succes", "record", "sommet", "sommets",
    "amelioration", "ameliore", "reprise", "rebond", "accord", "accords",
    "rachat", "acquisition", "partenariat",
}

NEGATIVE_WORDS = {
    # English
    "miss", "missed", "misses", "fall", "falls", "fell", "drop", "drops", "dropped",
    "plunge", "plunged", "plunges", "crash", "crashes", "crashed", "slump",
    "slumps", "slumped", "slide", "slides", "slid", "decline", "declines",
    "declined", "loss", "losses", "losing", "downgrade", "downgraded", "weak",
    "weakness", "bearish", "negative", "pessimistic", "concern", "concerns",
    "concerned", "worry", "worries", "worried", "risk", "risks", "risky",
    "below", "underperform", "underperformed", "disappoint", "disappointing",
    "disappointed", "warn", "warns", "warning", "warned", "cut", "cuts",
    "reduce", "reduced", "layoff", "layoffs", "bankruptcy", "bankrupt", "default",
    "defaults", "defaulted", "fraud", "lawsuit", "investigation", "probe", "crisis",
    "recession", "sell-off", "selloff", "plunging", "tumble", "tumbles", "tumbled",
    "hack", "hacked", "breach", "breached", "scandal", "scandals", "fine", "fined",
    # French
    "baisse", "chute", "effondrement", "recul", "repli", "perte", "pertes",
    "baissier", "negatif", "pessimiste", "inquietude", "inquietudes", "risque",
    "risques", "decevant", "decu", "avertissement", "deception", "reduction",
    "licenciement", "licenciements", "faillite", "fraude", "enquete", "crise",
    "recession", "scandale", "amende", "sanction", "sanctions", "effondre",
}

# High-impact crisis vocabulary — triggers anomaly even at low frequency
CRISIS_VOCAB = {
    "crash", "collapse", "bankruptcy", "bankrupt", "default", "defaulted",
    "fraud", "hack", "breach", "scandal", "lawsuit", "investigation", "probe",
    "halt", "halted", "suspend", "suspension", "downgrade", "faillite", "effondrement",
    "recession", "crisis", "crise", "panic", "panique", "meltdown",
}


# Ticker extraction: uppercase words 1-5 chars, $TICKER or plain
TICKER_PATTERN = re.compile(r"\$?([A-Z]{1,5})(?![a-z])")
# Known non-tickers to ignore
TICKER_BLOCKLIST = {
    "A", "I", "IS", "OF", "ON", "IN", "TO", "AT", "BY", "OR", "BE", "AS",
    "US", "EU", "UK", "CEO", "CFO", "CTO", "COO", "FDA", "SEC", "IPO", "GDP",
    "CPI", "PPI", "PMI", "FED", "ECB", "BOJ", "BOE", "IMF", "WTO", "UN",
    "AI", "IT", "PR", "OK", "Q1", "Q2", "Q3", "Q4", "YTD", "YOY", "QOQ",
    "ETF", "ETF", "REIT", "NASDAQ", "NYSE", "DOW", "SPX", "VIX", "DXY",
    "THE", "AND", "FOR", "BUT", "NOT", "NEW", "OLD", "BIG", "LOW", "HIGH",
    "MORE", "LESS", "ALL", "ANY", "SOME", "MOST", "LEAST", "ONE", "TWO",
    "NO", "YES", "AM", "PM", "ET", "UTC", "GMT",
}


# Common crypto-aware tickers to keep even if they match blocklist-ish patterns
TICKER_ALLOWLIST = {
    "SPY", "QQQ", "IWM", "DIA", "TLT", "HYG", "XLK", "XLE", "XLF", "XLV",
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "NFLX",
    "AMD", "INTC", "BAC", "JPM", "WFC", "GS", "MS", "C", "BRK",
    "ORCL", "IBM", "CSCO", "CRM", "ADBE", "NOW", "SHOP", "SQ", "PYPL", "V",
    "MA", "DIS", "KO", "PEP", "MCD", "SBUX", "NKE", "LULU", "COST", "WMT",
    "TGT", "HD", "LOW", "XOM", "CVX", "COP", "OXY", "SLB", "MRK", "PFE",
    "JNJ", "LLY", "UNH", "ABBV", "GILD", "BMY", "AMGN", "BIIB",
    "BTC", "ETH", "COIN", "MSTR", "RIOT", "MARA", "HUT",
}


CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "sentiment_cache.json",
)
BASELINE_WINDOW_DAYS = 30


# ---------------------------------------------------------------------------
# Tokenizer + scorer
# ---------------------------------------------------------------------------
WORD_SPLIT = re.compile(r"[^a-zA-Z0-9$]+")


def _tokenize(text: str) -> List[str]:
    if not text:
        return []
    return [t for t in WORD_SPLIT.split(text) if t]


def _score_text(text: str) -> Dict[str, Any]:
    tokens = _tokenize(text)
    pos_hits = []
    neg_hits = []
    crisis_hits = []
    for t in tokens:
        lo = t.lower()
        if lo in POSITIVE_WORDS:
            pos_hits.append(lo)
        if lo in NEGATIVE_WORDS:
            neg_hits.append(lo)
        if lo in CRISIS_VOCAB:
            crisis_hits.append(lo)

    raw = len(pos_hits) - len(neg_hits)
    # Normalize via tanh(raw/2) → [-1, +1]
    norm = math.tanh(raw / 2.0)
    return {
        "raw": raw,
        "score": round(norm, 4),
        "pos": pos_hits,
        "neg": neg_hits,
        "crisis": crisis_hits,
    }


def _extract_tickers(text: str) -> List[str]:
    if not text:
        return []
    matches = TICKER_PATTERN.findall(text)
    tickers = set()
    for m in matches:
        if m in TICKER_ALLOWLIST:
            tickers.add(m)
            continue
        if m in TICKER_BLOCKLIST:
            continue
        # Heuristic: 2-5 uppercase chars with no vowel-only pattern
        if 2 <= len(m) <= 5:
            tickers.add(m)
    return sorted(tickers)


# ---------------------------------------------------------------------------
# Baseline persistence
# ---------------------------------------------------------------------------
def _load_cache() -> Dict[str, Any]:
    if not os.path.exists(CACHE_PATH):
        return {"snapshots": []}
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"snapshots": []}


def _save_cache(cache: Dict[str, Any]) -> None:
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
    except Exception:
        pass


def _persist_snapshot(snapshot: Dict[str, Any]) -> None:
    cache = _load_cache()
    cache.setdefault("snapshots", []).append(snapshot)
    # Keep max 30 days of history
    cache["snapshots"] = cache["snapshots"][-BASELINE_WINDOW_DAYS:]
    _save_cache(cache)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def compute_sentiment(headlines: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Process a list of news headlines and produce ticker-level sentiment.

    headlines: list of {headline, tickers?, source?, created_at?}
    Returns: {tickers: {TICK: {...}}, anomalies: [...], summary: {...}}
    """
    if not headlines:
        return {
            "ok": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_headlines": 0,
            "tickers": {},
            "anomalies": [],
            "summary": {"avg_score": 0, "positive": 0, "negative": 0, "neutral": 0},
            "top_positive": [],
            "top_negative": [],
        }

    by_ticker: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    all_scores: List[float] = []
    crisis_events: List[Dict[str, Any]] = []
    scored_headlines: List[Dict[str, Any]] = []

    for h in headlines:
        text = h.get("headline") or h.get("title") or ""
        if not text:
            continue
        scored = _score_text(text)
        # Prefer provider-supplied tickers if present
        provider_tickers = h.get("tickers") or []
        if isinstance(provider_tickers, str):
            provider_tickers = [t.strip() for t in provider_tickers.split(",") if t.strip()]
        tickers = provider_tickers or _extract_tickers(text)

        record = {
            "headline": text,
            "source": h.get("source", ""),
            "created_at": h.get("created_at") or h.get("published_at") or "",
            "score": scored["score"],
            "raw": scored["raw"],
            "pos": scored["pos"],
            "neg": scored["neg"],
            "crisis": scored["crisis"],
            "tickers": tickers,
        }
        scored_headlines.append(record)
        all_scores.append(scored["score"])

        if scored["crisis"]:
            crisis_events.append(record)

        for t in tickers:
            by_ticker[t].append(record)

    # Aggregate by ticker
    ticker_summary: Dict[str, Dict[str, Any]] = {}
    for t, items in by_ticker.items():
        scores = [it["score"] for it in items]
        avg = sum(scores) / len(scores)
        pos_count = sum(1 for s in scores if s > 0.1)
        neg_count = sum(1 for s in scores if s < -0.1)
        neu_count = len(scores) - pos_count - neg_count
        crisis_count = sum(1 for it in items if it["crisis"])
        ticker_summary[t] = {
            "ticker": t,
            "count": len(items),
            "avg_score": round(avg, 4),
            "positive": pos_count,
            "negative": neg_count,
            "neutral": neu_count,
            "crisis": crisis_count,
            "latest_headlines": items[-5:],
        }

    # Load baseline for anomaly detection
    cache = _load_cache()
    snapshots = cache.get("snapshots", [])
    baseline_ticker: Dict[str, Dict[str, float]] = {}
    if snapshots:
        sums: Dict[str, Dict[str, float]] = defaultdict(lambda: {"count": 0, "score": 0, "n": 0})
        for snap in snapshots:
            for tk, entry in snap.get("tickers", {}).items():
                sums[tk]["count"] += entry.get("count", 0)
                sums[tk]["score"] += entry.get("avg_score", 0)
                sums[tk]["n"] += 1
        for tk, s in sums.items():
            if s["n"] > 0:
                baseline_ticker[tk] = {
                    "avg_count": s["count"] / s["n"],
                    "avg_score": s["score"] / s["n"],
                }

    # Detect anomalies
    anomalies: List[Dict[str, Any]] = []
    for t, summary in ticker_summary.items():
        base = baseline_ticker.get(t)
        # Volume spike
        if base and base["avg_count"] >= 1 and summary["count"] >= base["avg_count"] * 2.5:
            anomalies.append({
                "type": "VOLUME_SPIKE",
                "ticker": t,
                "current": summary["count"],
                "baseline": round(base["avg_count"], 1),
                "severity": min(100, int((summary["count"] / base["avg_count"]) * 25)),
            })
        # Sentiment shift
        if base and abs(summary["avg_score"] - base["avg_score"]) > 0.4:
            anomalies.append({
                "type": "SENTIMENT_SHIFT",
                "ticker": t,
                "current": summary["avg_score"],
                "baseline": round(base["avg_score"], 3),
                "severity": min(100, int(abs(summary["avg_score"] - base["avg_score"]) * 150)),
            })
        # Crisis vocab
        if summary["crisis"] > 0:
            anomalies.append({
                "type": "CRISIS_VOCAB",
                "ticker": t,
                "count": summary["crisis"],
                "severity": min(100, summary["crisis"] * 40),
            })

    anomalies.sort(key=lambda a: a.get("severity", 0), reverse=True)

    # Global summary
    pos_headlines = sum(1 for s in all_scores if s > 0.1)
    neg_headlines = sum(1 for s in all_scores if s < -0.1)
    neu_headlines = len(all_scores) - pos_headlines - neg_headlines
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0

    # Top tickers by absolute score with enough coverage
    covered = [t for t in ticker_summary.values() if t["count"] >= 2]
    covered_sorted_pos = sorted(covered, key=lambda x: x["avg_score"], reverse=True)[:10]
    covered_sorted_neg = sorted(covered, key=lambda x: x["avg_score"])[:10]

    snapshot_out = {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_headlines": len(scored_headlines),
        "tickers": ticker_summary,
        "anomalies": anomalies,
        "summary": {
            "avg_score": round(avg_score, 4),
            "positive": pos_headlines,
            "negative": neg_headlines,
            "neutral": neu_headlines,
            "crisis_events": len(crisis_events),
        },
        "top_positive": covered_sorted_pos,
        "top_negative": covered_sorted_neg,
        "crisis_events": crisis_events[:10],
    }

    # Persist today's snapshot (lite version)
    _persist_snapshot({
        "ts": snapshot_out["generated_at"],
        "tickers": {t: {"count": s["count"], "avg_score": s["avg_score"]} for t, s in ticker_summary.items()},
    })

    return snapshot_out
