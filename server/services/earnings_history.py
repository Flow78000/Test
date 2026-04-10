"""
FLO.W - Historical earnings analysis

Transforms UW /earnings/{ticker} raw rows into a structured view with:
  - EPS surprise vs estimate
  - Implied (expected) move vs realized 1-day move
  - Pre-earnings drift (1d, 3d, 1w, 2w)
  - Post-earnings reaction (1d, 3d, 1w, 2w)
  - Straddle P&L (long / short) on 1d and 1w
  - Summary stats: avg implied, avg realized, IV/RV ratio,
    beat rate, avg post-earnings move, standard deviation of reactions
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional


def _f(v: Any) -> Optional[float]:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _pct(v: Any) -> Optional[float]:
    f = _f(v)
    if f is None:
        return None
    # UW returns fractions (0.0046 = 0.46%)
    return round(f * 100, 3)


def _stdev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = sum(values) / len(values)
    var = sum((v - m) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(var)


def build_earnings_history(ticker: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build the structured earnings history payload from UW raw rows."""
    if not rows:
        return {
            "ok": True,
            "ticker": ticker,
            "count": 0,
            "earnings": [],
            "summary": {},
        }

    parsed: List[Dict[str, Any]] = []
    for r in rows:
        actual = _f(r.get("actual_eps"))
        est = _f(r.get("street_mean_est"))
        surprise_pct = None
        if actual is not None and est is not None and est != 0:
            surprise_pct = round(((actual - est) / abs(est)) * 100, 2)

        implied_move = _f(r.get("expected_move"))  # already a percentage like "9.88"
        # expected_move_perc is a fraction; prefer that if present
        em_frac = _f(r.get("expected_move_perc"))
        if em_frac is not None:
            implied_move = round(em_frac * 100, 2)

        post_1d = _pct(r.get("post_earnings_move_1d"))
        post_3d = _pct(r.get("post_earnings_move_3d"))
        post_1w = _pct(r.get("post_earnings_move_1w"))
        post_2w = _pct(r.get("post_earnings_move_2w"))

        pre_1d = _pct(r.get("pre_earnings_move_1d"))
        pre_3d = _pct(r.get("pre_earnings_move_3d"))
        pre_1w = _pct(r.get("pre_earnings_move_1w"))
        pre_2w = _pct(r.get("pre_earnings_move_2w"))

        short_straddle_1d = _pct(r.get("short_straddle_1d"))
        short_straddle_1w = _pct(r.get("short_straddle_1w"))
        long_straddle_1d = _pct(r.get("long_straddle_1d"))
        long_straddle_1w = _pct(r.get("long_straddle_1w"))

        # Realized 1d move = abs(post_earnings_move_1d)
        realized_move_1d = abs(post_1d) if post_1d is not None else None

        # IV/RV ratio: implied_move vs realized_move (>1 = overpriced vol)
        iv_rv_ratio = None
        if implied_move and realized_move_1d is not None and realized_move_1d > 0:
            iv_rv_ratio = round(implied_move / realized_move_1d, 2)

        # Beat classification
        beat = None
        if surprise_pct is not None:
            if surprise_pct > 1:
                beat = "BEAT"
            elif surprise_pct < -1:
                beat = "MISS"
            else:
                beat = "INLINE"

        parsed.append({
            "report_date": r.get("report_date"),
            "report_time": r.get("report_time"),
            "fiscal_quarter": r.get("ending_fiscal_quarter"),
            "source": r.get("source"),
            "actual_eps": actual,
            "estimate_eps": est,
            "surprise_pct": surprise_pct,
            "beat": beat,
            "implied_move": implied_move,
            "realized_move_1d": realized_move_1d,
            "iv_rv_ratio": iv_rv_ratio,
            "post_1d": post_1d,
            "post_3d": post_3d,
            "post_1w": post_1w,
            "post_2w": post_2w,
            "pre_1d": pre_1d,
            "pre_3d": pre_3d,
            "pre_1w": pre_1w,
            "pre_2w": pre_2w,
            "short_straddle_1d": short_straddle_1d,
            "short_straddle_1w": short_straddle_1w,
            "long_straddle_1d": long_straddle_1d,
            "long_straddle_1w": long_straddle_1w,
        })

    # Sort by date descending
    parsed.sort(key=lambda x: x["report_date"] or "", reverse=True)

    # Summary stats from rows that have actual reactions (exclude future/NULL)
    completed = [p for p in parsed if p["post_1d"] is not None]
    beat_rows = [p for p in completed if p["beat"] == "BEAT"]
    miss_rows = [p for p in completed if p["beat"] == "MISS"]

    implied_vals = [p["implied_move"] for p in completed if p["implied_move"]]
    realized_vals = [p["realized_move_1d"] for p in completed if p["realized_move_1d"] is not None]
    post_1d_vals = [p["post_1d"] for p in completed if p["post_1d"] is not None]
    post_1w_vals = [p["post_1w"] for p in completed if p["post_1w"] is not None]
    surprise_vals = [p["surprise_pct"] for p in completed if p["surprise_pct"] is not None]

    short_1d_vals = [p["short_straddle_1d"] for p in completed if p["short_straddle_1d"] is not None]
    long_1d_vals = [p["long_straddle_1d"] for p in completed if p["long_straddle_1d"] is not None]

    def _avg(vals: List[float]) -> Optional[float]:
        return round(sum(vals) / len(vals), 2) if vals else None

    avg_implied = _avg(implied_vals)
    avg_realized = _avg(realized_vals)
    iv_rv_ratio_avg = None
    if avg_implied is not None and avg_realized and avg_realized > 0:
        iv_rv_ratio_avg = round(avg_implied / avg_realized, 2)

    # Directional bias
    up_reactions = sum(1 for v in post_1d_vals if v > 0)
    down_reactions = sum(1 for v in post_1d_vals if v < 0)

    summary = {
        "total": len(parsed),
        "completed": len(completed),
        "beats": len(beat_rows),
        "misses": len(miss_rows),
        "beat_rate": round(len(beat_rows) / len(completed) * 100, 1) if completed else None,
        "avg_implied_move": avg_implied,
        "avg_realized_move": avg_realized,
        "iv_rv_ratio": iv_rv_ratio_avg,
        "avg_surprise_pct": _avg(surprise_vals),
        "avg_post_1d": _avg(post_1d_vals),
        "avg_post_1w": _avg(post_1w_vals),
        "stdev_post_1d": round(_stdev(post_1d_vals), 2) if post_1d_vals else None,
        "up_reactions": up_reactions,
        "down_reactions": down_reactions,
        "max_up": round(max(post_1d_vals), 2) if post_1d_vals else None,
        "max_down": round(min(post_1d_vals), 2) if post_1d_vals else None,
        "avg_short_straddle_1d": _avg(short_1d_vals),
        "avg_long_straddle_1d": _avg(long_1d_vals),
    }

    return {
        "ok": True,
        "ticker": ticker,
        "count": len(parsed),
        "earnings": parsed,
        "summary": summary,
    }
