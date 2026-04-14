"""
FLO.W - IBS (Internal Bar Strength) Engine

IBS = (Close - Low) / (High - Low)

Reads SPY daily data from Sierra Chart .dly file, computes IBS statistics:
- Monthly IBS heatmap (year x month grid)
- Monthly SPY returns heatmap
- IBS quintile next-day return statistics
- Current IBS KPI
- IBS distribution histogram
"""
from __future__ import annotations

import time
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from services.range_matrix import _read_dly

SPY_FILE = "SPY-NQTV.dly"
START_YEAR = 1999

_cache: Dict[str, Any] = {}
CACHE_TTL = 86400  # 24 hours


def _get_cached() -> Optional[Dict[str, Any]]:
    entry = _cache.get("ibs")
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _store_cached(value: Dict[str, Any]) -> None:
    _cache["ibs"] = (time.time(), value)


def _ibs(row: Dict[str, Any]) -> Optional[float]:
    h, lo, c = row["high"], row["low"], row["close"]
    rng = h - lo
    if rng <= 0:
        return None
    return (c - lo) / rng


def _parse_date(date_str: str) -> Optional[date]:
    """Parse 'YYYY-MM-DD' (already converted from '/' to '-' by _read_dly)."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None


def compute_ibs() -> Dict[str, Any]:
    cached = _get_cached()
    if cached:
        return cached

    # Read all bars — SPY goes back to 1993, we want 1999+
    # 10000 rows covers well beyond that range
    raw = _read_dly(SPY_FILE, max_rows=10000)

    # Filter to 1999+
    bars: List[Dict[str, Any]] = []
    for row in raw:
        d = _parse_date(row["date"])
        if d is None:
            continue
        if d.year < START_YEAR:
            continue
        ibs_val = _ibs(row)
        if ibs_val is None:
            continue
        bars.append({
            "date": d,
            "open": row["open"],
            "high": row["high"],
            "low": row["low"],
            "close": row["close"],
            "ibs": ibs_val,
        })

    # Sort chronologically
    bars.sort(key=lambda x: x["date"])

    # ----------------------------------------------------------------
    # Monthly IBS heatmap: {year: {month: avg_ibs}}
    # Monthly returns heatmap: {year: {month: pct_return}}
    # ----------------------------------------------------------------
    monthly_ibs: Dict[int, Dict[int, List[float]]] = {}
    monthly_close: Dict[int, Dict[int, float]] = {}  # last close per month
    monthly_open_close: Dict[int, Dict[int, float]] = {}  # first close of prev month

    for bar in bars:
        y, m = bar["date"].year, bar["date"].month
        if y not in monthly_ibs:
            monthly_ibs[y] = {}
            monthly_close[y] = {}
        if m not in monthly_ibs[y]:
            monthly_ibs[y][m] = []
        monthly_ibs[y][m].append(bar["ibs"])
        monthly_close[y][m] = bar["close"]  # overwrite — last close wins

    # Compute average monthly IBS
    ibs_heatmap: Dict[int, Dict[int, Optional[float]]] = {}
    for y in sorted(monthly_ibs):
        ibs_heatmap[y] = {}
        for m in range(1, 13):
            vals = monthly_ibs[y].get(m)
            if vals:
                ibs_heatmap[y][m] = round(sum(vals) / len(vals), 4)
            else:
                ibs_heatmap[y][m] = None

    # Compute monthly returns: close-to-close (last close of month vs last close of prior month)
    # Build flat list of (year, month, last_close) in order
    month_close_list: List[tuple] = []
    for y in sorted(monthly_close):
        for m in sorted(monthly_close[y]):
            month_close_list.append((y, m, monthly_close[y][m]))

    returns_heatmap: Dict[int, Dict[int, Optional[float]]] = {}
    for idx in range(len(month_close_list)):
        y, m, close = month_close_list[idx]
        if y not in returns_heatmap:
            returns_heatmap[y] = {}
        if idx == 0:
            returns_heatmap[y][m] = None
        else:
            prev_close = month_close_list[idx - 1][2]
            if prev_close and prev_close != 0:
                ret = round((close - prev_close) / prev_close * 100, 4)
                returns_heatmap[y][m] = ret
            else:
                returns_heatmap[y][m] = None

    # Fill missing months with None
    for y in returns_heatmap:
        for m in range(1, 13):
            if m not in returns_heatmap[y]:
                returns_heatmap[y][m] = None

    # ----------------------------------------------------------------
    # IBS quintile statistics: next-day return for each quintile
    # ----------------------------------------------------------------
    quintiles = [
        (0.0, 0.2),
        (0.2, 0.4),
        (0.4, 0.6),
        (0.6, 0.8),
        (0.8, 1.0),
    ]

    quintile_stats: List[Dict[str, Any]] = []
    for q_lo, q_hi in quintiles:
        days_in_q: List[Dict[str, Any]] = []
        next_day_returns: List[float] = []

        for idx, bar in enumerate(bars):
            ibs_val = bar["ibs"]
            # Include 1.0 in last quintile
            in_q = q_lo <= ibs_val < q_hi if q_hi < 1.0 else q_lo <= ibs_val <= q_hi
            if not in_q:
                continue
            days_in_q.append(bar)
            # Next-day return
            if idx + 1 < len(bars):
                next_bar = bars[idx + 1]
                ret = (next_bar["close"] - bar["close"]) / bar["close"] * 100
                next_day_returns.append(ret)

        count = len(days_in_q)
        avg_ibs = round(sum(b["ibs"] for b in days_in_q) / count, 4) if count else None
        avg_next_ret = round(sum(next_day_returns) / len(next_day_returns), 4) if next_day_returns else None
        win_rate = round(sum(1 for r in next_day_returns if r > 0) / len(next_day_returns) * 100, 2) if next_day_returns else None

        quintile_stats.append({
            "label": f"{q_lo:.1f}–{q_hi:.1f}",
            "q_lo": q_lo,
            "q_hi": q_hi,
            "count": count,
            "avg_ibs": avg_ibs,
            "avg_next_day_return": avg_next_ret,
            "win_rate": win_rate,
            "sample_size": len(next_day_returns),
        })

    # ----------------------------------------------------------------
    # IBS distribution histogram: 20 buckets of width 0.05
    # ----------------------------------------------------------------
    bucket_size = 0.05
    n_buckets = 20
    histogram: List[Dict[str, Any]] = []
    for i in range(n_buckets):
        lo = round(i * bucket_size, 2)
        hi = round((i + 1) * bucket_size, 2)
        count = sum(1 for b in bars if lo <= b["ibs"] < hi if hi < 1.0 + bucket_size else lo <= b["ibs"] <= hi)
        histogram.append({"range_lo": lo, "range_hi": hi, "label": f"{lo:.2f}", "count": count})

    # ----------------------------------------------------------------
    # Current IBS (most recent day)
    # ----------------------------------------------------------------
    current_ibs: Optional[Dict[str, Any]] = None
    if bars:
        last = bars[-1]
        ibs_val = last["ibs"]
        # Determine quintile
        q_label = "0.8–1.0"
        for q_lo, q_hi in quintiles:
            in_q = q_lo <= ibs_val < q_hi if q_hi < 1.0 else q_lo <= ibs_val <= q_hi
            if in_q:
                q_label = f"{q_lo:.1f}–{q_hi:.1f}"
                break
        # Find matching quintile stats
        q_stat = next((s for s in quintile_stats if s["label"] == q_label), None)
        current_ibs = {
            "date": last["date"].isoformat(),
            "ibs": round(ibs_val, 4),
            "quintile": q_label,
            "open": last["open"],
            "high": last["high"],
            "low": last["low"],
            "close": last["close"],
            "historical_avg_next_day_return": q_stat["avg_next_day_return"] if q_stat else None,
            "historical_win_rate": q_stat["win_rate"] if q_stat else None,
        }

    # ----------------------------------------------------------------
    # Build years list for frontend iteration
    # ----------------------------------------------------------------
    all_years = sorted(ibs_heatmap.keys())

    result = {
        "ok": True,
        "generated_at": datetime.now().isoformat(),
        "total_bars": len(bars),
        "date_range": {
            "from": bars[0]["date"].isoformat() if bars else None,
            "to": bars[-1]["date"].isoformat() if bars else None,
        },
        "years": all_years,
        "ibs_heatmap": {str(y): {str(m): v for m, v in months.items()} for y, months in ibs_heatmap.items()},
        "returns_heatmap": {str(y): {str(m): v for m, v in months.items()} for y, months in returns_heatmap.items()},
        "quintile_stats": quintile_stats,
        "histogram": histogram,
        "current_ibs": current_ibs,
    }

    _store_cached(result)
    return result
