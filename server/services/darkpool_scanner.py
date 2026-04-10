"""
FLO.W - Dark Pool Multi-Ticker Scanner + Real-Time Alerts

Scans a watchlist of highly-liquid tickers, fetches dark pool prints from
Unusual Whales, and generates real-time alerts for:

  - MEGA_BLOCK       : single print > $10M
  - LARGE_BLOCK      : single print > $2M
  - ACCUMULATION     : DPSS > 65% with >= 20 prints
  - DISTRIBUTION     : DPSS < 35% with >= 20 prints
  - VOLUME_SPIKE     : total notional > 2x prior snapshot
  - DPSS_SHIFT       : DPSS changed > 15pts vs prior snapshot
  - CROSS_ACCUM      : >= 3 tickers all showing DPSS > 60% (market-wide)

Alerts are stored in a rolling JSON cache with TTL so recent alerts stay
visible across refreshes. A severity score (0-100) is computed for each
alert based on magnitude vs baseline.
"""
from __future__ import annotations

import concurrent.futures
import json
import os
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")

# High-liquidity universe (ETFs + mega-caps + active names)
WATCHLIST = [
    "SPY", "QQQ", "IWM", "DIA", "TLT", "HYG", "GLD", "SLV",
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
    "AMD", "NFLX", "AVGO", "ORCL", "JPM", "BAC", "XOM", "UNH",
]

CACHE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "darkpool_scanner_cache.json",
)

# Thresholds
MEGA_BLOCK_USD = 10_000_000
LARGE_BLOCK_USD = 2_000_000
BIG_BLOCK_USD = 500_000
ACCUM_DPSS = 0.65
DISTRIB_DPSS = 0.35
VOLUME_SPIKE_RATIO = 2.0
DPSS_SHIFT_PTS = 0.15
CROSS_ACCUM_MIN_TICKERS = 3

# Rolling alert retention
ALERT_TTL_MINUTES = 45


# ---------------------------------------------------------------------------
# UW fetch helper (parallel, resilient)
# ---------------------------------------------------------------------------
def _uw_darkpool(ticker: str) -> List[Dict[str, Any]]:
    """Fetch dark pool prints for one ticker via curl. Returns [] on error."""
    try:
        result = subprocess.run(
            ["curl", "-s", f"https://api.unusualwhales.com/api/darkpool/{ticker}",
             "-H", f"Authorization: Bearer {UW_TOKEN}",
             "-H", "Accept: application/json"],
            capture_output=True, text=True, timeout=10
        )
        if not result.stdout:
            return []
        payload = json.loads(result.stdout)
        if isinstance(payload, dict):
            data = payload.get("data") or payload.get("prints") or []
            return data if isinstance(data, list) else []
        if isinstance(payload, list):
            return payload
        return []
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Per-ticker analysis
# ---------------------------------------------------------------------------
def _analyze_ticker(ticker: str, prints: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute DPSS and block distribution for one ticker."""
    bull = 0
    bear = 0
    neutral = 0
    total_notional = 0.0
    mega_blocks: List[Dict[str, Any]] = []
    large_blocks: List[Dict[str, Any]] = []
    big_count = 0
    latest_ts: Optional[str] = None

    for p in prints:
        try:
            price = float(p.get("price") or 0)
            size = int(float(p.get("size") or 0))
            prem = float(p.get("premium") or 0)
            if prem == 0 and price and size:
                prem = price * size
            bid = float(p.get("nbbo_bid") or 0)
            ask = float(p.get("nbbo_ask") or 0)
        except (ValueError, TypeError):
            continue

        total_notional += prem

        # Direction tag
        if bid and ask and price >= ask:
            direction = "BULL"
            bull += size
        elif bid and price <= bid:
            direction = "BEAR"
            bear += size
        else:
            direction = "NEUTRE"
            neutral += size

        ts = p.get("executed_at") or p.get("created_at") or ""
        if ts and (latest_ts is None or ts > latest_ts):
            latest_ts = ts

        if prem >= MEGA_BLOCK_USD:
            mega_blocks.append({
                "ticker": ticker,
                "ts": ts,
                "price": price,
                "size": size,
                "premium": prem,
                "direction": direction,
            })
        elif prem >= LARGE_BLOCK_USD:
            large_blocks.append({
                "ticker": ticker,
                "ts": ts,
                "price": price,
                "size": size,
                "premium": prem,
                "direction": direction,
            })

        if prem >= BIG_BLOCK_USD:
            big_count += 1

    total_vol = bull + bear + neutral
    dpss = (bull / total_vol) if total_vol > 0 else 0.5

    # Top 3 mega + top 3 large
    mega_blocks.sort(key=lambda b: b["premium"], reverse=True)
    large_blocks.sort(key=lambda b: b["premium"], reverse=True)

    return {
        "ticker": ticker,
        "prints": len(prints),
        "dpss": round(dpss, 4),
        "bull_volume": bull,
        "bear_volume": bear,
        "neutral_volume": neutral,
        "total_notional": total_notional,
        "big_count": big_count,
        "mega_blocks": mega_blocks[:3],
        "large_blocks": large_blocks[:5],
        "latest_ts": latest_ts,
    }


# ---------------------------------------------------------------------------
# Baseline persistence (for DPSS_SHIFT + VOLUME_SPIKE detection)
# ---------------------------------------------------------------------------
def _load_cache() -> Dict[str, Any]:
    if not os.path.exists(CACHE_PATH):
        return {"last_snapshot": {}, "alerts": []}
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"last_snapshot": {}, "alerts": []}


def _save_cache(cache: Dict[str, Any]) -> None:
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
    except Exception:
        pass


def _prune_old_alerts(alerts: List[Dict[str, Any]], now: datetime) -> List[Dict[str, Any]]:
    cutoff = now - timedelta(minutes=ALERT_TTL_MINUTES)
    fresh = []
    for a in alerts:
        try:
            ts = datetime.fromisoformat(a["ts"].replace("Z", "+00:00"))
            if ts >= cutoff:
                fresh.append(a)
        except Exception:
            continue
    return fresh


# ---------------------------------------------------------------------------
# Alert generation
# ---------------------------------------------------------------------------
def _make_alert(
    type_: str,
    ticker: str,
    severity: int,
    message: str,
    extra: Optional[Dict[str, Any]] = None,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    alert = {
        "id": f"{type_}_{ticker}_{int((now or datetime.now(timezone.utc)).timestamp())}",
        "ts": (now or datetime.now(timezone.utc)).isoformat(),
        "type": type_,
        "ticker": ticker,
        "severity": max(0, min(100, severity)),
        "message": message,
    }
    if extra:
        alert.update(extra)
    return alert


def _detect_alerts(
    summaries: Dict[str, Dict[str, Any]],
    prior_snapshot: Dict[str, Dict[str, Any]],
    now: datetime,
) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []

    # 1. Mega + large block alerts (per ticker)
    for ticker, s in summaries.items():
        for mb in s["mega_blocks"]:
            sev = min(100, 70 + int(mb["premium"] / MEGA_BLOCK_USD * 5))
            msg = f"{ticker} print {_fmt_usd(mb['premium'])} @ {mb['price']:.2f} ({mb['direction']})"
            alerts.append(_make_alert(
                "MEGA_BLOCK", ticker, sev, msg,
                extra={"premium": mb["premium"], "direction": mb["direction"], "price": mb["price"]},
                now=now,
            ))
        for lb in s["large_blocks"][:2]:  # cap to avoid spam
            sev = min(80, 50 + int(lb["premium"] / LARGE_BLOCK_USD * 5))
            msg = f"{ticker} print {_fmt_usd(lb['premium'])} @ {lb['price']:.2f} ({lb['direction']})"
            alerts.append(_make_alert(
                "LARGE_BLOCK", ticker, sev, msg,
                extra={"premium": lb["premium"], "direction": lb["direction"], "price": lb["price"]},
                now=now,
            ))

    # 2. Accumulation / distribution (sustained)
    for ticker, s in summaries.items():
        if s["prints"] < 20:
            continue
        if s["dpss"] >= ACCUM_DPSS:
            sev = min(100, int((s["dpss"] - ACCUM_DPSS) * 300) + 55)
            alerts.append(_make_alert(
                "ACCUMULATION", ticker, sev,
                f"{ticker} DPSS {s['dpss']*100:.1f}% sur {s['prints']} prints — achat institutionnel",
                extra={"dpss": s["dpss"], "prints": s["prints"], "notional": s["total_notional"]},
                now=now,
            ))
        elif s["dpss"] <= DISTRIB_DPSS:
            sev = min(100, int((DISTRIB_DPSS - s["dpss"]) * 300) + 55)
            alerts.append(_make_alert(
                "DISTRIBUTION", ticker, sev,
                f"{ticker} DPSS {s['dpss']*100:.1f}% sur {s['prints']} prints — vente institutionnelle",
                extra={"dpss": s["dpss"], "prints": s["prints"], "notional": s["total_notional"]},
                now=now,
            ))

    # 3. DPSS shift vs prior snapshot
    for ticker, s in summaries.items():
        prev = prior_snapshot.get(ticker)
        if not prev:
            continue
        prev_dpss = prev.get("dpss")
        if prev_dpss is None:
            continue
        delta = s["dpss"] - prev_dpss
        if abs(delta) >= DPSS_SHIFT_PTS and s["prints"] >= 15:
            direction = "bullish" if delta > 0 else "bearish"
            sev = min(100, int(abs(delta) * 200) + 40)
            alerts.append(_make_alert(
                "DPSS_SHIFT", ticker, sev,
                f"{ticker} DPSS shift {direction} {delta*100:+.1f}pts (vs {prev_dpss*100:.1f}%)",
                extra={"delta": round(delta, 4), "prev": prev_dpss, "current": s["dpss"]},
                now=now,
            ))

    # 4. Volume spike vs prior
    for ticker, s in summaries.items():
        prev = prior_snapshot.get(ticker)
        if not prev:
            continue
        prev_not = prev.get("total_notional", 0)
        if prev_not <= 1_000_000:
            continue
        ratio = s["total_notional"] / prev_not if prev_not > 0 else 0
        if ratio >= VOLUME_SPIKE_RATIO:
            sev = min(100, int(ratio * 20) + 40)
            alerts.append(_make_alert(
                "VOLUME_SPIKE", ticker, sev,
                f"{ticker} volume {ratio:.1f}x baseline ({_fmt_usd(s['total_notional'])})",
                extra={"ratio": round(ratio, 2), "current": s["total_notional"], "prev": prev_not},
                now=now,
            ))

    # 5. Cross-ticker accumulation (market-wide signal)
    accum_tickers = [t for t, s in summaries.items() if s["dpss"] >= 0.60 and s["prints"] >= 20]
    distrib_tickers = [t for t, s in summaries.items() if s["dpss"] <= 0.40 and s["prints"] >= 20]

    if len(accum_tickers) >= CROSS_ACCUM_MIN_TICKERS:
        sev = min(100, 60 + len(accum_tickers) * 5)
        alerts.append(_make_alert(
            "CROSS_ACCUM", "MARKET", sev,
            f"{len(accum_tickers)} tickers en accumulation: {', '.join(accum_tickers[:6])}",
            extra={"tickers": accum_tickers},
            now=now,
        ))
    if len(distrib_tickers) >= CROSS_ACCUM_MIN_TICKERS:
        sev = min(100, 60 + len(distrib_tickers) * 5)
        alerts.append(_make_alert(
            "CROSS_DISTRIB", "MARKET", sev,
            f"{len(distrib_tickers)} tickers en distribution: {', '.join(distrib_tickers[:6])}",
            extra={"tickers": distrib_tickers},
            now=now,
        ))

    return alerts


def _fmt_usd(v: float) -> str:
    a = abs(v)
    if a >= 1e9:
        return f"${v/1e9:.2f}B"
    if a >= 1e6:
        return f"${v/1e6:.1f}M"
    if a >= 1e3:
        return f"${v/1e3:.0f}K"
    return f"${v:.0f}"


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def scan_darkpool(watchlist: Optional[List[str]] = None) -> Dict[str, Any]:
    """Scan the watchlist in parallel and return summaries + alerts."""
    tickers = watchlist or WATCHLIST
    now = datetime.now(timezone.utc)

    # Parallel fetch
    raw: Dict[str, List[Dict[str, Any]]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(_uw_darkpool, t): t for t in tickers}
        for fut in concurrent.futures.as_completed(futures):
            ticker = futures[fut]
            try:
                raw[ticker] = fut.result()
            except Exception:
                raw[ticker] = []

    # Analyze
    summaries: Dict[str, Dict[str, Any]] = {}
    for ticker in tickers:
        summaries[ticker] = _analyze_ticker(ticker, raw.get(ticker, []))

    # Load prior snapshot + historical alerts
    cache = _load_cache()
    prior_snapshot = cache.get("last_snapshot", {})
    historical_alerts = cache.get("alerts", [])

    # Prune expired alerts
    historical_alerts = _prune_old_alerts(historical_alerts, now)

    # Detect new alerts
    new_alerts = _detect_alerts(summaries, prior_snapshot, now)

    # Deduplicate by type+ticker+minute to avoid flooding
    seen_keys = set()
    for a in historical_alerts:
        ts_min = a["ts"][:16]  # YYYY-MM-DDTHH:MM
        seen_keys.add((a["type"], a["ticker"], ts_min))

    unique_new = []
    for a in new_alerts:
        ts_min = a["ts"][:16]
        key = (a["type"], a["ticker"], ts_min)
        if key not in seen_keys:
            seen_keys.add(key)
            unique_new.append(a)

    all_alerts = historical_alerts + unique_new
    all_alerts.sort(key=lambda a: (a.get("severity", 0), a.get("ts", "")), reverse=True)

    # Save new snapshot for next cycle baseline
    snapshot_for_cache = {
        t: {"dpss": s["dpss"], "total_notional": s["total_notional"], "prints": s["prints"]}
        for t, s in summaries.items()
    }
    cache["last_snapshot"] = snapshot_for_cache
    cache["alerts"] = all_alerts[:200]  # keep top 200 most recent
    _save_cache(cache)

    # Global metrics
    total_notional = sum(s["total_notional"] for s in summaries.values())
    total_prints = sum(s["prints"] for s in summaries.values())
    weighted_dpss = (
        sum(s["dpss"] * s["prints"] for s in summaries.values()) / total_prints
        if total_prints > 0 else 0.5
    )
    mega_count = sum(len(s["mega_blocks"]) for s in summaries.values())
    big_count = sum(s["big_count"] for s in summaries.values())

    # Sort ticker summaries by total notional for the UI
    ranked = sorted(summaries.values(), key=lambda s: s["total_notional"], reverse=True)

    return {
        "ok": True,
        "generated_at": now.isoformat(),
        "watchlist": tickers,
        "tickers": summaries,
        "ranked": ranked,
        "alerts": all_alerts,
        "new_alerts": unique_new,
        "global": {
            "total_notional": total_notional,
            "total_prints": total_prints,
            "weighted_dpss": round(weighted_dpss, 4),
            "mega_count": mega_count,
            "big_count": big_count,
            "accum_count": sum(1 for s in summaries.values() if s["dpss"] >= ACCUM_DPSS and s["prints"] >= 20),
            "distrib_count": sum(1 for s in summaries.values() if s["dpss"] <= DISTRIB_DPSS and s["prints"] >= 20),
        },
    }
