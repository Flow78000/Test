"""
FLO.W - Real Implied Volatility Surface builder

Fetches all option contracts from Unusual Whales for a given ticker, parses
symbols into (expiration, call/put, strike), groups them into moneyness x
DTE buckets, and computes average IV per bucket to build a clean surface.

Output:
  {
    ok, ticker, spot, vix, atm,
    moneyness: ["80%", ..., "115%"],  # ~12 buckets
    dtes: [7, 14, 21, 30, 45, 60, 90, 120],
    surface: [[iv, iv, ...], ...],    # rows = moneyness, cols = dte
    sample_size: [[n, n, ...], ...],   # number of contracts per bucket
    skew_25d: [...],                  # 25-delta risk reversal per DTE
    atm_term: [...],                  # ATM IV per DTE (term structure)
  }
"""
from __future__ import annotations

import json
import math
import os
import subprocess
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")


MONEYNESS_BUCKETS = [
    (0.79, 0.82, "80%"),
    (0.82, 0.87, "85%"),
    (0.87, 0.92, "90%"),
    (0.92, 0.94, "93%"),
    (0.94, 0.96, "95%"),
    (0.96, 0.98, "97%"),
    (0.98, 1.02, "100%"),
    (1.02, 1.04, "103%"),
    (1.04, 1.06, "105%"),
    (1.06, 1.09, "108%"),
    (1.09, 1.12, "110%"),
    (1.12, 1.21, "115%"),
]

DTE_BUCKETS = [
    (1, 10, 7),
    (10, 18, 14),
    (18, 25, 21),
    (25, 35, 30),
    (35, 52, 45),
    (52, 75, 60),
    (75, 105, 90),
    (105, 150, 120),
]


def _uw_fetch(endpoint: str) -> Any:
    try:
        result = subprocess.run(
            ["curl", "-s", f"https://api.unusualwhales.com/api{endpoint}",
             "-H", f"Authorization: Bearer {UW_TOKEN}",
             "-H", "Accept: application/json"],
            capture_output=True, text=True, timeout=15
        )
        if not result.stdout:
            return None
        return json.loads(result.stdout)
    except Exception:
        return None


def _parse_symbol(sym: str, ticker: str) -> Tuple[Optional[str], Optional[str], float]:
    """Parse SPXW260409C06800000 -> ('260409', 'C', 6800.0)."""
    for i in range(len(ticker), len(sym)):
        if i < 4:
            continue
        if sym[i] in ("C", "P") and i + 1 < len(sym) and sym[i + 1:].isdigit():
            prefix_len = len(ticker) + 1 if sym.startswith(ticker + "W") else len(ticker)
            date_part = sym[prefix_len:i]
            if len(date_part) != 6 or not date_part.isdigit():
                continue
            try:
                return date_part, sym[i], int(sym[i + 1:]) / 1000
            except (ValueError, TypeError):
                continue
    return None, None, 0


def _get_spot(ticker: str) -> Tuple[float, float]:
    """Return (spot, vix) using iv-rank endpoint."""
    iv_data = _uw_fetch(f"/stock/{ticker}/iv-rank")
    spot = 0.0
    if isinstance(iv_data, dict):
        items = iv_data.get("data", [])
        if items:
            spot = float(items[-1].get("close", 0) or 0)
    vix_data = _uw_fetch("/stock/VIX/iv-rank")
    vix = 0.0
    if isinstance(vix_data, dict):
        items = vix_data.get("data", [])
        if items:
            vix = float(items[-1].get("close", 0) or 0)
    return spot, vix


def _bucket_moneyness(m: float) -> Optional[int]:
    for i, (lo, hi, _) in enumerate(MONEYNESS_BUCKETS):
        if lo <= m < hi:
            return i
    return None


def _bucket_dte(dte: int) -> Optional[int]:
    for i, (lo, hi, _) in enumerate(DTE_BUCKETS):
        if lo <= dte < hi:
            return i
    return None


def build_vol_surface(ticker: str = "SPY") -> Dict[str, Any]:
    """Build an IV surface + term structure + 25d skew from real option IVs."""
    spot, vix = _get_spot(ticker)
    if spot <= 0:
        return {"ok": False, "error": "Cannot fetch spot price", "ticker": ticker}

    raw = _uw_fetch(f"/stock/{ticker}/option-contracts")
    contracts = []
    if isinstance(raw, dict):
        contracts = raw.get("data", []) or []
    elif isinstance(raw, list):
        contracts = raw

    if not contracts:
        return {"ok": False, "error": "No contracts", "ticker": ticker, "spot": spot, "vix": vix}

    today = datetime.now().date()
    atm = round(spot / (5 if spot > 200 else 1)) * (5 if spot > 200 else 1)

    # Group by (moneyness_bucket, dte_bucket)
    bucket_ivs: Dict[Tuple[int, int], List[float]] = {}
    # Also collect ATM term structure (±3% of spot) and 25d skew samples
    atm_term_samples: Dict[int, List[float]] = {}  # dte_bucket_idx -> [iv]
    call_otm_25d: Dict[int, List[float]] = {}      # rough 5% OTM call
    put_otm_25d: Dict[int, List[float]] = {}       # rough 5% OTM put

    for c in contracts:
        sym = c.get("option_symbol", "")
        if not sym:
            continue
        date_part, opt_type, strike = _parse_symbol(sym, ticker)
        if not date_part or not opt_type or strike <= 0:
            continue
        try:
            y = 2000 + int(date_part[:2])
            mo = int(date_part[2:4])
            d = int(date_part[4:6])
            exp_date = datetime(y, mo, d).date()
            dte = (exp_date - today).days
            if dte < 1 or dte > 150:
                continue
        except Exception:
            continue

        iv = c.get("implied_volatility")
        if iv is None:
            continue
        try:
            iv_pct = float(iv) * 100
        except (ValueError, TypeError):
            continue
        if iv_pct <= 0 or iv_pct > 500:
            continue

        moneyness = strike / spot
        m_idx = _bucket_moneyness(moneyness)
        d_idx = _bucket_dte(dte)
        if m_idx is None or d_idx is None:
            continue

        bucket_ivs.setdefault((m_idx, d_idx), []).append(iv_pct)

        # ATM term samples: within ±3% of spot
        if 0.97 <= moneyness <= 1.03:
            atm_term_samples.setdefault(d_idx, []).append(iv_pct)

        # ~25d put : ~5% OTM put (moneyness ~0.95)
        if opt_type == "P" and 0.93 <= moneyness <= 0.97:
            put_otm_25d.setdefault(d_idx, []).append(iv_pct)
        # ~25d call : ~5% OTM call (moneyness ~1.05)
        if opt_type == "C" and 1.03 <= moneyness <= 1.07:
            call_otm_25d.setdefault(d_idx, []).append(iv_pct)

    # Build surface matrix: len(MONEYNESS) rows x len(DTE) cols
    rows = len(MONEYNESS_BUCKETS)
    cols = len(DTE_BUCKETS)
    surface: List[List[Optional[float]]] = [[None] * cols for _ in range(rows)]
    sample_size: List[List[int]] = [[0] * cols for _ in range(rows)]

    for (r, c), ivs in bucket_ivs.items():
        if ivs:
            surface[r][c] = round(sum(ivs) / len(ivs), 2)
            sample_size[r][c] = len(ivs)

    # Forward-fill None cells with nearest neighbor within the same row
    for r in range(rows):
        last = None
        for c in range(cols):
            if surface[r][c] is not None:
                last = surface[r][c]
            elif last is not None:
                surface[r][c] = last
        last = None
        for c in range(cols - 1, -1, -1):
            if surface[r][c] is not None:
                last = surface[r][c]
            elif last is not None:
                surface[r][c] = last

    # Fill still-None cells by column average
    col_avgs = []
    for c in range(cols):
        vals = [surface[r][c] for r in range(rows) if surface[r][c] is not None]
        col_avgs.append(sum(vals) / len(vals) if vals else None)
    for r in range(rows):
        for c in range(cols):
            if surface[r][c] is None and col_avgs[c] is not None:
                surface[r][c] = round(col_avgs[c], 2)

    # ATM term structure (one IV per DTE bucket)
    atm_term = []
    for d_idx, (_, _, dte_label) in enumerate(DTE_BUCKETS):
        samples = atm_term_samples.get(d_idx, [])
        iv = round(sum(samples) / len(samples), 2) if samples else None
        atm_term.append({"dte": dte_label, "iv": iv, "samples": len(samples)})

    # 25d skew = put_iv - call_iv per DTE
    skew_25d = []
    for d_idx, (_, _, dte_label) in enumerate(DTE_BUCKETS):
        puts = put_otm_25d.get(d_idx, [])
        calls = call_otm_25d.get(d_idx, [])
        put_iv = sum(puts) / len(puts) if puts else None
        call_iv = sum(calls) / len(calls) if calls else None
        skew = None
        if put_iv is not None and call_iv is not None:
            skew = round(put_iv - call_iv, 2)
        skew_25d.append({
            "dte": dte_label,
            "put_iv": round(put_iv, 2) if put_iv else None,
            "call_iv": round(call_iv, 2) if call_iv else None,
            "skew": skew,
        })

    # Basic surface stats
    all_ivs = [v for row in surface for v in row if v is not None]
    min_iv = min(all_ivs) if all_ivs else 0
    max_iv = max(all_ivs) if all_ivs else 0
    avg_iv = round(sum(all_ivs) / len(all_ivs), 2) if all_ivs else 0
    total_contracts = sum(sample_size[r][c] for r in range(rows) for c in range(cols))

    return {
        "ok": True,
        "ticker": ticker,
        "spot": spot,
        "vix": vix,
        "atm": atm,
        "moneyness": [lbl for _, _, lbl in MONEYNESS_BUCKETS],
        "dtes": [lbl for _, _, lbl in DTE_BUCKETS],
        "surface": surface,
        "sample_size": sample_size,
        "atm_term": atm_term,
        "skew_25d": skew_25d,
        "stats": {
            "min_iv": round(min_iv, 2),
            "max_iv": round(max_iv, 2),
            "avg_iv": avg_iv,
            "total_contracts": total_contracts,
            "total_raw_contracts": len(contracts),
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
