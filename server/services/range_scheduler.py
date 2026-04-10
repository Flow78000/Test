"""
FLO.W - Range scheduler

Background thread that refreshes the range matrix (and the range
dashboard fallback) every REFRESH_INTERVAL_SECONDS (default 300s =
5 minutes). Each run:

1. Flushes the internal cache of services.range_matrix so a real
   recomputation happens.
2. Recomputes compute_range_matrix(days=30, baseline_window=20).
3. Stores the result in an in-memory singleton (_latest).
4. Appends an intraday snapshot per asset to a persistent JSON
   history file. Snapshots are kept for RETENTION_DAYS (default 14)
   so the user can replay how today's ranges evolved through the
   session.
5. Refreshes the Sierra Range Dashboard snapshot too.

Public API :
    start_range_scheduler()  - launches the background thread
    stop_range_scheduler()   - signals shutdown
    force_refresh()          - one-shot refresh (returns summary)
    get_status()             - latest refresh metadata
    get_intraday_history(...) - per-asset intraday snapshot history
"""
from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional


REFRESH_INTERVAL_SECONDS = 300   # 5 minutes
RETENTION_DAYS = 14
HISTORY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "range_intraday_history.json",
)

SIERRA_DATA_DIR = r"C:\SierraChart\Data"

# Candidate live intraday CSV files per symbol. The .dly file is only
# written by Sierra at session rollover, so today's bar in .dly is stale
# by several hours. Sierra writes BarStudyData.csv files live (every
# 30-60 seconds) from active chart studies. When such a file exists we
# use it to recompute today's H/L on the fly; otherwise we fall back to
# the .dly bar (stale but better than nothing).
LIVE_FILE_CANDIDATES: Dict[str, List[str]] = {
    # Indices US — actively maintained by Sierra chart studies
    "ES":  ["ESM6.CME-1m-BarStudyData.csv", "ESM6.CME-5m-BarStudyData.csv", "ESM6.CME-BarStudyData.csv"],
    "NQ":  ["NQM6.CME-1m-BarStudyData.csv", "NQM6.CME-5m-BarStudyData.csv"],
    "YM":  ["YMM6.CBOT-1m-BarStudyData.csv", "YMM6.CBOT-5m-BarStudyData.csv"],
    "RTY": ["RTYM6.CME-1m-BarStudyData.csv", "RTYM6.CME-5m-BarStudyData.csv"],
    # Treasuries (UST-* study outputs)
    "ZT":  ["UST-ZT-BarStudyData.csv"],
    "ZF":  ["UST-ZF-BarStudyData.csv"],
    "ZN":  ["UST-ZN-BarStudyData.csv"],
    "TN":  ["UST-10YX-BarStudyData.csv"],
    "UB":  ["UST-UB-BarStudyData.csv"],
    "ZB":  ["UST-ZB-BarStudyData.csv"],
    # Grains (contract month BarStudyData)
    "ZW":  ["ZWK6.CBOT-BarStudyData.csv"],
    "ZS":  ["ZSK6.CBOT-BarStudyData.csv"],
    "ZC":  ["ZCU6.CBOT-BarStudyData.csv", "ZCK6.CBOT-BarStudyData.csv"],
    "ZM":  ["ZMK6.CBOT-BarStudyData.csv"],
}

# Max bytes to tail from a live CSV when looking for today's bars.
# 256KB = ~2000 1m-bars which easily covers the current session.
LIVE_TAIL_BYTES = 256 * 1024

_lock = threading.Lock()
_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_latest: Dict[str, Any] = {
    "matrix": None,
    "dashboard": None,
    "last_refresh": None,
    "refresh_count": 0,
    "last_duration_s": None,
    "last_error": None,
    "mode": None,  # "full" or "live-today"
}

# Frozen reference state. Populated on the first full refresh and on
# each detected trading-day rollover. Past days never move afterwards.
_frozen: Dict[str, Any] = {
    "today_date": None,            # YYYY-MM-DD string of the locked "today"
    "past_dates": [],              # ordered list of past trading days
    "past_per_date_stats": {},     # per-date stats for past days
    "past_cells_by_sym": {},       # sym -> [cell, ...] past days in order
    "baseline_by_sym": {},         # sym -> frozen baseline_pct
    "asset_meta": {},              # sym -> {name, cls, file} for reconstruction
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _load_history() -> Dict[str, Any]:
    if not os.path.exists(HISTORY_PATH):
        return {"snapshots": []}
    try:
        with open(HISTORY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("snapshots", [])
            return data
    except Exception:
        return {"snapshots": []}


def _save_history(data: Dict[str, Any]) -> None:
    dir_ = os.path.dirname(HISTORY_PATH)
    fd, tmp = tempfile.mkstemp(prefix=".range_hist_", suffix=".json", dir=dir_)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, HISTORY_PATH)
    except Exception:
        try:
            os.remove(tmp)
        except Exception:
            pass
        raise


def _prune_snapshots(snapshots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    kept = []
    for s in snapshots:
        try:
            ts = datetime.fromisoformat(s.get("ts", "").replace("Z", "+00:00"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            if ts >= cutoff:
                kept.append(s)
        except Exception:
            continue
    return kept


def _extract_today_snapshot(matrix: Dict[str, Any]) -> Dict[str, Any]:
    """Pull the latest date cell per asset for the intraday snapshot."""
    if not matrix or not matrix.get("ok"):
        return {}
    dates = matrix.get("dates") or []
    if not dates:
        return {}
    latest_date = dates[-1]
    assets = []
    for row in matrix.get("assets", []):
        cell = None
        for c in row.get("cells", []):
            if c.get("date") == latest_date:
                cell = c
                break
        if not cell:
            continue
        assets.append({
            "sym": row.get("sym"),
            "name": row.get("name"),
            "cls": row.get("cls"),
            "baseline_pct": row.get("baseline_pct"),
            "date": cell.get("date"),
            "open": cell.get("open"),
            "high": cell.get("high"),
            "low": cell.get("low"),
            "close": cell.get("close"),
            "range_pct": cell.get("range_pct"),
            "range_vs_avg": cell.get("range_vs_avg"),
        })
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "trading_date": latest_date,
        "per_date_stats": (matrix.get("per_date_stats") or {}).get(latest_date),
        "assets": assets,
    }


# ---------------------------------------------------------------------------
# Live CSV tail reader
# ---------------------------------------------------------------------------
def _tail_bytes(path: str, n: int) -> str:
    """Read approximately the last n bytes of a text file, decoded as UTF-8
    with errors replaced. Returns an empty string on failure."""
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as f:
            if size > n:
                f.seek(size - n)
                # Skip partial first line
                f.readline()
                data = f.read()
            else:
                data = f.read()
        return data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _read_live_today(file_candidates: List[str]) -> Optional[Dict[str, Any]]:
    """Scan the given list of BarStudyData candidate files, pick the first
    one that exists, and compute max(high)/min(low)/last(close) for the
    most recent trading date found in the tail of the file.

    Returns {date: 'YYYY-M-D', open: ..., high: ..., low: ..., close: ...,
             bars: n, source: filename} or None.
    """
    for fname in file_candidates:
        path = os.path.join(SIERRA_DATA_DIR, fname)
        if not os.path.exists(path):
            continue
        text = _tail_bytes(path, LIVE_TAIL_BYTES)
        if not text:
            continue

        lines = text.splitlines()
        # Drop header if we happened to read from file start
        if lines and lines[0].lower().startswith("date"):
            lines = lines[1:]

        # Scan backwards to identify the latest date, then collect all bars
        # belonging to that date.
        latest_date: Optional[str] = None
        highs: List[float] = []
        lows: List[float] = []
        first_open: Optional[float] = None
        last_close: Optional[float] = None
        # We want bars in chronological order to get first_open / last_close.
        collected: List[tuple] = []  # (date, time, o, h, l, c)
        for line in lines:
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 6:
                continue
            date_s = parts[0]
            time_s = parts[1]
            try:
                o = float(parts[2]); h = float(parts[3]); lo = float(parts[4]); c = float(parts[5])
            except ValueError:
                continue
            if h <= 0 or lo <= 0 or c <= 0:
                continue
            collected.append((date_s, time_s, o, h, lo, c))

        if not collected:
            continue

        latest_date = collected[-1][0]
        today_bars = [b for b in collected if b[0] == latest_date]
        if not today_bars:
            continue

        first_open = today_bars[0][2]
        last_close = today_bars[-1][5]
        highs = [b[3] for b in today_bars]
        lows = [b[4] for b in today_bars]

        # Normalize date format: Sierra writes 'YYYY-M-D' (no zero padding),
        # compute_range_matrix uses 'YYYY/MM/DD' -> already normalized to
        # 'YYYY-MM-DD' in _read_dly. Normalize both to 'YYYY-MM-DD'.
        try:
            y, m, d = latest_date.split("-")
            norm_date = f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        except Exception:
            norm_date = latest_date

        return {
            "date": norm_date,
            "open": first_open,
            "high": max(highs),
            "low": min(lows),
            "close": last_close,
            "bars": len(today_bars),
            "source": fname,
        }
    return None


# ---------------------------------------------------------------------------
# Refresh cycle
# ---------------------------------------------------------------------------
def _freeze_from_full_matrix(matrix: Dict[str, Any]) -> None:
    """After a full recomputation, lock all past days and baselines as the
    permanent reference. Only today will be allowed to move afterwards."""
    from services import range_matrix as rm

    dates = matrix.get("dates") or []
    if not dates:
        return
    today_date = dates[-1]
    past_dates = dates[:-1]

    past_cells_by_sym: Dict[str, List[Dict[str, Any]]] = {}
    baseline_by_sym: Dict[str, float] = {}
    asset_meta: Dict[str, Dict[str, Any]] = {}
    for row in matrix.get("assets", []):
        sym = row.get("sym")
        if not sym:
            continue
        baseline_by_sym[sym] = row.get("baseline_pct") or 0.0
        past_cells_by_sym[sym] = [c for c in (row.get("cells") or []) if c.get("date") != today_date]
        asset_meta[sym] = {
            "name": row.get("name"),
            "cls": row.get("cls"),
            "file": row.get("file"),
        }

    per_date_stats = matrix.get("per_date_stats") or {}
    past_per_date_stats = {d: per_date_stats[d] for d in past_dates if d in per_date_stats}

    _frozen.update({
        "today_date": today_date,
        "past_dates": past_dates,
        "past_per_date_stats": past_per_date_stats,
        "past_cells_by_sym": past_cells_by_sym,
        "baseline_by_sym": baseline_by_sym,
        "asset_meta": asset_meta,
    })


def _refresh_today_only() -> Optional[Dict[str, Any]]:
    """Re-read each asset's .dly file but ONLY keep the most recent bar.
    Build the matrix by merging the frozen past cells with a live today cell
    computed against the frozen baseline. Returns the merged matrix or None
    if the rollover detection says we need a full recompute instead."""
    from services import range_matrix as rm

    frozen_today = _frozen.get("today_date")
    baseline_by_sym = _frozen.get("baseline_by_sym") or {}
    past_cells_by_sym = _frozen.get("past_cells_by_sym") or {}
    past_dates = list(_frozen.get("past_dates") or [])
    past_per_date_stats = dict(_frozen.get("past_per_date_stats") or {})
    asset_meta = _frozen.get("asset_meta") or {}

    if not frozen_today or not baseline_by_sym:
        return None

    merged_assets: List[Dict[str, Any]] = []
    today_cells: List[float] = []
    new_today_date: Optional[str] = None
    live_sources_used = 0

    for cfg in rm.ASSET_CONFIG:
        sym = cfg["sym"]
        baseline = baseline_by_sym.get(sym)
        if baseline is None:
            continue

        div = cfg.get("div", 1) or 1
        live_cell_src: Optional[str] = None
        today_cell: Optional[Dict[str, Any]] = None
        latest_date: Optional[str] = None

        # 1) Try the live BarStudyData CSV first (written by Sierra every 30-60s).
        live = _read_live_today(LIVE_FILE_CANDIDATES.get(sym, []))
        if live:
            latest_date = live["date"]
            # BarStudyData files already store human-readable prices (no divisor).
            o = live["open"]
            h = live["high"]
            lo = live["low"]
            c = live["close"]
            rng = h - lo
            close_denom = c or 1.0
            pct = (rng / close_denom) * 100
            vs_avg = (pct / baseline) * 100 if baseline else 0.0
            today_cell = {
                "date": latest_date,
                "open": round(o, 4),
                "high": round(h, 4),
                "low": round(lo, 4),
                "close": round(c, 4),
                "range_pct": round(pct, 4),
                "range_vs_avg": round(vs_avg, 2),
                "live_source": live["source"],
                "live_bars": live["bars"],
            }
            today_cells.append(vs_avg)
            live_cell_src = "bar-study"
            live_sources_used += 1

        # 2) Fall back to the .dly file (possibly stale for today, but some
        # assets only expose this source).
        if today_cell is None:
            raw = rm._read_dly(cfg["file"], max_rows=2)  # type: ignore[attr-defined]
            if not raw:
                cells = list(past_cells_by_sym.get(sym, []))
                merged_assets.append({
                    "sym": sym, "name": asset_meta.get(sym, {}).get("name", cfg["name"]),
                    "cls": asset_meta.get(sym, {}).get("cls", cfg["cls"]),
                    "file": cfg["file"], "baseline_pct": round(baseline, 4),
                    "cells": cells,
                })
                continue
            bar = raw[-1]
            latest_date = bar.get("date")
            rng = bar["high"] - bar["low"]
            close = bar["close"] or 1.0
            pct = (rng / close) * 100
            vs_avg = (pct / baseline) * 100 if baseline else 0.0
            today_cell = {
                "date": latest_date,
                "open": round(bar["open"] / div, 4),
                "high": round(bar["high"] / div, 4),
                "low": round(bar["low"] / div, 4),
                "close": round(bar["close"] / div, 4),
                "range_pct": round(pct, 4),
                "range_vs_avg": round(vs_avg, 2),
                "live_source": "dly",
            }
            today_cells.append(vs_avg)

        if new_today_date is None and latest_date:
            new_today_date = latest_date

        past_cells = past_cells_by_sym.get(sym, [])
        cells = list(past_cells) + [today_cell]
        merged_assets.append({
            "sym": sym,
            "name": asset_meta.get(sym, {}).get("name", cfg["name"]),
            "cls": asset_meta.get(sym, {}).get("cls", cfg["cls"]),
            "file": cfg["file"],
            "baseline_pct": round(baseline, 4),
            "cells": cells,
        })

    # Rollover detection: if the newly read "today" is strictly AFTER the
    # frozen today, the trading day has rolled. Return None so the caller
    # triggers a full recompute + re-freeze.
    if new_today_date and new_today_date > frozen_today:
        return None

    # Live today stats
    if today_cells:
        today_stats = {
            "assets": len(today_cells),
            "avg_vs_baseline": round(sum(today_cells) / len(today_cells), 2),
            "pct_expansion": round(sum(1 for v in today_cells if v >= 150) / len(today_cells) * 100, 1),
            "pct_compression": round(sum(1 for v in today_cells if v < 80) / len(today_cells) * 100, 1),
            "max_vs_baseline": round(max(today_cells), 2),
        }
    else:
        today_stats = {}

    per_date_stats = dict(past_per_date_stats)
    per_date_stats[frozen_today] = today_stats

    class_order: List[str] = []
    for cfg in rm.ASSET_CONFIG:
        if cfg["cls"] not in class_order:
            class_order.append(cfg["cls"])

    return {
        "ok": True,
        "generated_at": datetime.now().isoformat(),
        "days": len(past_dates) + 1,
        "baseline_window": 20,
        "dates": past_dates + [frozen_today],
        "class_order": class_order,
        "assets": merged_assets,
        "per_date_stats": per_date_stats,
        "asset_count": len(merged_assets),
        "mode": "live-today",
    }


def refresh(force_full: bool = False) -> Dict[str, Any]:
    """One refresh cycle. First call (or rollover / force_full) recomputes
    the whole matrix and freezes past days. Subsequent calls only refresh
    today's bar and merge it with the frozen reference."""
    from services import range_matrix as rm
    try:
        from services.range_dashboard import read_range_dashboard
    except Exception:
        read_range_dashboard = None  # type: ignore

    t0 = time.time()
    with _lock:
        full_needed = force_full or _frozen.get("today_date") is None

        matrix: Optional[Dict[str, Any]] = None
        mode = "live-today"

        if not full_needed:
            try:
                matrix = _refresh_today_only()
            except Exception as e:
                matrix = None
                _latest["last_error"] = f"live-today refresh: {e}"
            if matrix is None:
                # Rollover detected or failure -> fall through to full recompute
                full_needed = True

        if full_needed:
            try:
                rm._cache.clear()  # type: ignore[attr-defined]
            except Exception:
                pass
            try:
                matrix = rm.compute_range_matrix(days=30, baseline_window=20)
            except Exception as e:
                _latest["last_error"] = f"full recompute: {e}"
                return {"ok": False, "error": str(e)}
            _freeze_from_full_matrix(matrix)
            matrix["mode"] = "full"
            mode = "full"

        dashboard = None
        if read_range_dashboard is not None:
            try:
                dashboard = read_range_dashboard()
            except Exception as e:
                dashboard = {"ok": False, "error": str(e)}

        snap = _extract_today_snapshot(matrix)
        if snap and snap.get("assets"):
            hist = _load_history()
            snapshots = hist.get("snapshots", [])
            snapshots.append(snap)
            snapshots = _prune_snapshots(snapshots)
            hist["snapshots"] = snapshots
            hist["updated_at"] = datetime.now(timezone.utc).isoformat()
            try:
                _save_history(hist)
            except Exception as e:
                _latest["last_error"] = f"history save: {e}"

        duration = round(time.time() - t0, 3)
        _latest["matrix"] = matrix
        _latest["dashboard"] = dashboard
        _latest["last_refresh"] = datetime.now(timezone.utc).isoformat()
        _latest["refresh_count"] += 1
        _latest["last_duration_s"] = duration
        _latest["last_error"] = None
        _latest["mode"] = mode

        return {
            "ok": True,
            "mode": mode,
            "duration_s": duration,
            "asset_count": (matrix or {}).get("asset_count", 0),
            "trading_date": snap.get("trading_date") if snap else None,
            "refresh_count": _latest["refresh_count"],
        }


# ---------------------------------------------------------------------------
# Background thread
# ---------------------------------------------------------------------------
def _loop():
    try:
        refresh()
    except Exception as e:
        print(f"[range_scheduler] initial refresh error: {e}")
    while not _stop_event.is_set():
        if _stop_event.wait(REFRESH_INTERVAL_SECONDS):
            break
        try:
            refresh()
        except Exception as e:
            print(f"[range_scheduler] refresh error: {e}")


def start_range_scheduler() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop_event.clear()
    _thread = threading.Thread(target=_loop, name="range_scheduler", daemon=True)
    _thread.start()
    print(f"[range_scheduler] background thread started (every {REFRESH_INTERVAL_SECONDS}s, intraday retention {RETENTION_DAYS}d)")


def stop_range_scheduler() -> None:
    _stop_event.set()


def force_refresh() -> Dict[str, Any]:
    return refresh()


# ---------------------------------------------------------------------------
# Query API
# ---------------------------------------------------------------------------
def get_status() -> Dict[str, Any]:
    hist = _load_history()
    snaps = hist.get("snapshots", [])
    latest_snap_ts = snaps[-1].get("ts") if snaps else None
    return {
        "ok": True,
        "running": bool(_thread and _thread.is_alive()),
        "interval_s": REFRESH_INTERVAL_SECONDS,
        "retention_days": RETENTION_DAYS,
        "last_refresh": _latest.get("last_refresh"),
        "refresh_count": _latest.get("refresh_count"),
        "last_duration_s": _latest.get("last_duration_s"),
        "last_error": _latest.get("last_error"),
        "mode": _latest.get("mode"),
        "asset_count": (_latest.get("matrix") or {}).get("asset_count", 0),
        "snapshots_stored": len(snaps),
        "latest_snapshot_ts": latest_snap_ts,
        "frozen_today_date": _frozen.get("today_date"),
        "frozen_past_days": len(_frozen.get("past_dates") or []),
        "frozen_baselines": len(_frozen.get("baseline_by_sym") or {}),
    }


def get_latest_matrix() -> Optional[Dict[str, Any]]:
    """Return the last matrix produced by the scheduler, if any."""
    return _latest.get("matrix")


def get_intraday_history(
    trading_date: Optional[str] = None,
    symbol: Optional[str] = None,
    limit: int = 200,
) -> Dict[str, Any]:
    hist = _load_history()
    snaps = hist.get("snapshots", [])
    filtered = snaps
    if trading_date:
        filtered = [s for s in filtered if s.get("trading_date") == trading_date]
    if symbol:
        sym_upper = symbol.upper()
        out: List[Dict[str, Any]] = []
        for s in filtered:
            for a in s.get("assets", []):
                if (a.get("sym") or "").upper() == sym_upper:
                    out.append({
                        "ts": s.get("ts"),
                        "trading_date": s.get("trading_date"),
                        **a,
                    })
                    break
        filtered = out
    # Most recent first
    filtered = list(reversed(filtered))[:limit]
    return {
        "ok": True,
        "trading_date": trading_date,
        "symbol": symbol,
        "count": len(filtered),
        "total_snapshots": len(snaps),
        "items": filtered,
    }
