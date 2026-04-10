"""
FLO.W - Range Matrix Service

Reads Sierra Chart .dly daily bar files and builds an assets x dates
matrix of range percentages, like the Sierra 'Range Week' chart.

Matrix cell value = (daily_range / baseline_avg_range) * 100
    where baseline_avg_range = average daily range over the last N days.
    100% = average day, 200% = twice normal volatility, etc.

Covers: FX majors (6E, 6B, 6J, 6C, 6A, 6S, 6N), Treasuries (ZT, ZF, ZN,
TN, UB, ZB), Indices US + EU (ES, NQ, YM, RTY, EMD, NKD), Metals (GC,
SI, HG, PA), Energy (CL, NG, HO), Grains (ZW, ZS, ZC, ZL, ZM), Crypto (BTC).
"""
from __future__ import annotations

import os
import time
from datetime import datetime
from typing import Optional, Dict, List, Any

SIERRA_DATA_DIR = r"C:\SierraChart\Data"


# ---------------------------------------------------------------------------
# Asset configuration — front-month symbols
# ---------------------------------------------------------------------------
# symbol -> (display_name, asset_class, .dly filename, price_divisor)
# price_divisor: Sierra stores some prices in integer form. We only use it
# for the tooltip OHLC, the range% is scale-invariant.

ASSET_CONFIG: List[Dict[str, Any]] = [
    # --- FX ---
    {"sym": "6E",  "name": "EURUSD 6E",  "cls": "FX",        "file": "6EM6.CME.dly",    "div": 100000},
    {"sym": "6B",  "name": "GBPUSD 6B",  "cls": "FX",        "file": "6BM6.CME.dly",    "div": 100000},
    {"sym": "6J",  "name": "JPYUSD 6J",  "cls": "FX",        "file": "6JM6.CME.dly",    "div": 10000000},
    {"sym": "6C",  "name": "CADUSD 6C",  "cls": "FX",        "file": "6CM6.CME.dly",    "div": 100000},
    {"sym": "6A",  "name": "AUDUSD 6A",  "cls": "FX",        "file": "6AM6.CME.dly",    "div": 100000},
    {"sym": "6S",  "name": "CHFUSD 6S",  "cls": "FX",        "file": "6SM6.CME.dly",    "div": 100000},
    {"sym": "6N",  "name": "NZDUSD 6N",  "cls": "FX",        "file": "6NM6.CME.dly",    "div": 100000},

    # --- Treasuries ---
    {"sym": "ZT",  "name": "US 2Y ZT",    "cls": "TREASURIES", "file": "ZTM6.CBOT.dly", "div": 1000000},
    {"sym": "ZF",  "name": "US 5Y ZF",    "cls": "TREASURIES", "file": "ZFM6.CBOT.dly", "div": 1000000},
    {"sym": "ZN",  "name": "US 10Y ZN",   "cls": "TREASURIES", "file": "ZNM6.CBOT.dly", "div": 1000000},
    {"sym": "TN",  "name": "US 10Y TN",   "cls": "TREASURIES", "file": "TNM6.CBOT.dly", "div": 1000000},
    {"sym": "UB",  "name": "US ULTRA UB", "cls": "TREASURIES", "file": "UBM6.CBOT.dly", "div": 1000000},
    {"sym": "ZB",  "name": "US 30Y ZB",   "cls": "TREASURIES", "file": "ZBM6.CBOT.dly", "div": 1000000},

    # --- Indices US ---
    {"sym": "ES",  "name": "S&P 500 ES",    "cls": "INDICES US", "file": "ESM6.CME.dly",  "div": 100},
    {"sym": "NQ",  "name": "Nasdaq NQ",     "cls": "INDICES US", "file": "NQM6.CME.dly",  "div": 100},
    {"sym": "YM",  "name": "Dow YM",        "cls": "INDICES US", "file": "YMM6.CBOT.dly", "div": 1},
    {"sym": "RTY", "name": "Russell RTY",   "cls": "INDICES US", "file": "RTYM6.CME.dly", "div": 10},
    {"sym": "EMD", "name": "S&P 400 EMD",   "cls": "INDICES US", "file": "EMDM6.CME.dly", "div": 100},

    # --- Indices Asia ---
    {"sym": "NKD", "name": "Nikkei NKD",    "cls": "INDICES ASIE", "file": "NKDM6.CME.dly", "div": 1},

    # --- Metals ---
    {"sym": "GC",  "name": "Gold GC",       "cls": "METAUX", "file": "GCM6.COMEX.dly",  "div": 10},
    {"sym": "SI",  "name": "Silver SI",     "cls": "METAUX", "file": "SIK6.COMEX.dly",  "div": 1000},
    {"sym": "HG",  "name": "Copper HG",     "cls": "METAUX", "file": "HGK6.COMEX.dly",  "div": 10000},

    # --- Energy ---
    {"sym": "CL",  "name": "Crude CL",      "cls": "ENERGIE", "file": "CLK6.NYMEX.dly", "div": 100},
    {"sym": "NG",  "name": "NatGas NG",     "cls": "ENERGIE", "file": "NGK26.NYMEX.dly", "div": 10000},
    {"sym": "HO",  "name": "Heat HO",       "cls": "ENERGIE", "file": "HOK6.NYMEX.dly", "div": 10000},

    # --- Grains ---
    {"sym": "ZW",  "name": "Wheat ZW",      "cls": "GRAINS", "file": "ZWK6.CBOT.dly",  "div": 100},
    {"sym": "ZS",  "name": "Soybean ZS",    "cls": "GRAINS", "file": "ZSK6.CBOT.dly",  "div": 100},
    {"sym": "ZC",  "name": "Corn ZC",       "cls": "GRAINS", "file": "ZCK6.CBOT.dly",  "div": 100},
    {"sym": "ZL",  "name": "Soyoil ZL",     "cls": "GRAINS", "file": "ZLK6.CBOT.dly",  "div": 100},
    {"sym": "ZM",  "name": "Soymeal ZM",    "cls": "GRAINS", "file": "ZMK6.CBOT.dly",  "div": 10},

    # --- Crypto ---
    {"sym": "BTC", "name": "Bitcoin BTC",   "cls": "CRYPTO", "file": "BTCM6.CME.dly",  "div": 1},
]


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}
CACHE_TTL_SECONDS = 60


def _cached(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL_SECONDS:
        return entry[1]
    return None


def _store(key: str, value):
    _cache[key] = (time.time(), value)


# ---------------------------------------------------------------------------
# .dly reader
# ---------------------------------------------------------------------------
def _read_dly(filename: str, max_rows: int = 400) -> List[Dict[str, Any]]:
    """Read the last `max_rows` daily bars from a .dly file.
    Returns list of {date, open, high, low, close, volume}.
    Filters out zero-volume rows (partial/placeholder days).
    """
    path = os.path.join(SIERRA_DATA_DIR, filename)
    if not os.path.exists(path):
        return []

    rows: List[Dict[str, Any]] = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception:
        return []

    if len(lines) < 2:
        return []

    # Skip header
    data_lines = lines[1:]
    # Take enough rows to cover max_rows valid entries
    tail = data_lines[-(max_rows * 3):]

    for line in tail:
        parts = [c.strip() for c in line.split(",")]
        if len(parts) < 6:
            continue
        try:
            date = parts[0].replace("/", "-")
            o = float(parts[1])
            h = float(parts[2])
            lo = float(parts[3])
            c = float(parts[4])
            v = float(parts[5]) if parts[5] else 0
        except ValueError:
            continue
        if h <= 0 or lo <= 0 or c <= 0:
            continue
        if h == lo:
            # Flat/partial bar — skip
            continue
        rows.append({
            "date": date,
            "open": o,
            "high": h,
            "low": lo,
            "close": c,
            "volume": v,
        })

    return rows[-max_rows:]


# ---------------------------------------------------------------------------
# Range computation
# ---------------------------------------------------------------------------
def _compute_asset_row(
    cfg: Dict[str, Any],
    days: int,
    baseline_window: int,
) -> Optional[Dict[str, Any]]:
    """Read one asset and build its range series."""
    raw = _read_dly(cfg["file"], max_rows=days + baseline_window + 5)
    if len(raw) < 5:
        return None

    # Compute raw daily ranges
    ranges_pct = []  # H-L as % of close
    for r in raw:
        rng = r["high"] - r["low"]
        pct = (rng / r["close"]) * 100 if r["close"] else 0
        ranges_pct.append(pct)

    # Baseline = average of the last `baseline_window` days BEFORE the last day
    # (rolling average). If we have fewer bars, use what we have.
    if len(ranges_pct) < baseline_window:
        baseline = sum(ranges_pct) / len(ranges_pct)
    else:
        baseline = sum(ranges_pct[-baseline_window:]) / baseline_window
    if baseline <= 0:
        baseline = 0.01

    # Build cells for the last `days` days
    tail = raw[-days:]
    tail_pct = ranges_pct[-days:]
    cells = []
    for r, pct in zip(tail, tail_pct):
        vs_avg = (pct / baseline) * 100
        cells.append({
            "date": r["date"],
            "open": round(r["open"] / cfg.get("div", 1), 4),
            "high": round(r["high"] / cfg.get("div", 1), 4),
            "low": round(r["low"] / cfg.get("div", 1), 4),
            "close": round(r["close"] / cfg.get("div", 1), 4),
            "range_pct": round(pct, 4),
            "range_vs_avg": round(vs_avg, 2),
        })

    return {
        "sym": cfg["sym"],
        "name": cfg["name"],
        "cls": cfg["cls"],
        "file": cfg["file"],
        "baseline_pct": round(baseline, 4),
        "cells": cells,
    }


def compute_range_matrix(
    days: int = 30,
    baseline_window: int = 20,
) -> Dict[str, Any]:
    """Build the full asset x date matrix."""
    cache_key = f"matrix_{days}_{baseline_window}"
    cached = _cached(cache_key)
    if cached:
        return cached

    rows: List[Dict[str, Any]] = []
    for cfg in ASSET_CONFIG:
        row = _compute_asset_row(cfg, days, baseline_window)
        if row:
            rows.append(row)

    # Union of dates across all assets
    date_set = set()
    for r in rows:
        for c in r["cells"]:
            date_set.add(c["date"])
    all_dates = sorted(date_set)[-days:]

    # Group by class (preserve original order from ASSET_CONFIG)
    class_order: List[str] = []
    for cfg in ASSET_CONFIG:
        if cfg["cls"] not in class_order:
            class_order.append(cfg["cls"])

    # Market stats per date: how many assets had range_vs_avg > 150 (expansion)
    per_date_stats: Dict[str, Dict[str, float]] = {}
    for d in all_dates:
        vals = []
        for r in rows:
            for c in r["cells"]:
                if c["date"] == d:
                    vals.append(c["range_vs_avg"])
                    break
        if vals:
            per_date_stats[d] = {
                "assets": len(vals),
                "avg_vs_baseline": round(sum(vals) / len(vals), 2),
                "pct_expansion": round(sum(1 for v in vals if v >= 150) / len(vals) * 100, 1),
                "pct_compression": round(sum(1 for v in vals if v < 80) / len(vals) * 100, 1),
                "max_vs_baseline": round(max(vals), 2),
            }

    result = {
        "ok": True,
        "generated_at": datetime.now().isoformat(),
        "days": days,
        "baseline_window": baseline_window,
        "dates": all_dates,
        "class_order": class_order,
        "assets": rows,
        "per_date_stats": per_date_stats,
        "asset_count": len(rows),
    }
    _store(cache_key, result)
    return result
