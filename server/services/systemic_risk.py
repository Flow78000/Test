"""
FLO.W - Systemic Risk Engine

Builds a composite Financial Stress Index from readily-available .dly data
and cross-asset correlations. Designed as a self-contained service that
doesn't depend on TWS being connected.

Components of the stress score (0-100, 100 = max stress):
  - Vol regime proxy   (via ES daily realized vol, 25 pts)
  - Treasury stress    (via ZN range expansion, 20 pts)
  - Energy stress      (via CL realized vol, 15 pts)
  - FX safe haven flow (via JPY + CHF strength, 15 pts)
  - Gold bid           (via GC realized vol, 10 pts)
  - Cross-asset corr   (how many assets move together, 15 pts)
"""
from __future__ import annotations

import math
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

SIERRA_DATA_DIR = r"C:\SierraChart\Data"


# Assets used for the stress model
STRESS_ASSETS = {
    "ES":   ("ESM6.CME.dly",   100),      # S&P 500 futures
    "NQ":   ("NQM6.CME.dly",   100),      # Nasdaq futures
    "ZN":   ("ZNM6.CBOT.dly",  1000000),  # 10Y Treasury
    "ZB":   ("ZBM6.CBOT.dly",  1000000),  # 30Y Treasury
    "CL":   ("CLK6.NYMEX.dly", 100),      # WTI Crude
    "GC":   ("GCM6.COMEX.dly", 10),       # Gold
    "SI":   ("SIK6.COMEX.dly", 1000),     # Silver
    "6E":   ("6EM6.CME.dly",   100000),   # EURUSD
    "6J":   ("6JM6.CME.dly",   10000000), # JPYUSD (inverse)
    "6S":   ("6SM6.CME.dly",   100000),   # CHFUSD
    "BTC":  ("BTCM6.CME.dly",  1),        # Bitcoin
}


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}
CACHE_TTL = 90


def _cached(key: str):
    e = _cache.get(key)
    if e and (time.time() - e[0]) < CACHE_TTL:
        return e[1]
    return None


def _store(key: str, val):
    _cache[key] = (time.time(), val)


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
def _read_closes(filename: str, n: int = 120) -> List[Tuple[str, float]]:
    path = os.path.join(SIERRA_DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception:
        return []
    if len(lines) < 2:
        return []

    out: List[Tuple[str, float]] = []
    for line in lines[1:]:
        parts = [c.strip() for c in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            date = parts[0].replace("/", "-")
            c = float(parts[4])
        except ValueError:
            continue
        if c > 0:
            out.append((date, c))
    return out[-n:]


def _log_returns(closes: List[float]) -> List[float]:
    rets = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0 and closes[i] > 0:
            rets.append(math.log(closes[i] / closes[i - 1]))
    return rets


def _stdev(xs: List[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / (len(xs) - 1)
    return math.sqrt(v)


def _mean(xs: List[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _annualized_vol(rets: List[float]) -> float:
    """Annualized realized vol from log returns (in %)."""
    return _stdev(rets) * math.sqrt(252) * 100


def _pearson(xs: List[float], ys: List[float]) -> float:
    n = min(len(xs), len(ys))
    if n < 5:
        return 0.0
    xs, ys = xs[-n:], ys[-n:]
    mx, my = _mean(xs), _mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx == 0 or dy == 0:
        return 0.0
    return num / (dx * dy)


# ---------------------------------------------------------------------------
# Core: load all stress assets
# ---------------------------------------------------------------------------
def _load_all(n: int = 120) -> Dict[str, Dict[str, Any]]:
    result = {}
    for sym, (fn, div) in STRESS_ASSETS.items():
        closes = _read_closes(fn, n=n)
        if len(closes) < 25:
            continue
        close_vals = [c for _, c in closes]
        rets = _log_returns(close_vals)
        result[sym] = {
            "symbol": sym,
            "file": fn,
            "divisor": div,
            "closes": close_vals,
            "dates": [d for d, _ in closes],
            "returns": rets,
            "vol_20d": _annualized_vol(rets[-20:]) if len(rets) >= 20 else _annualized_vol(rets),
            "vol_60d": _annualized_vol(rets[-60:]) if len(rets) >= 60 else None,
            "last_close": close_vals[-1] / div,
            "change_5d_pct": ((close_vals[-1] / close_vals[-6]) - 1) * 100 if len(close_vals) > 6 else None,
            "change_20d_pct": ((close_vals[-1] / close_vals[-21]) - 1) * 100 if len(close_vals) > 21 else None,
        }
    return result


# ---------------------------------------------------------------------------
# Composite stress score
# ---------------------------------------------------------------------------
def _score_vol_regime(es_vol: Optional[float]) -> Tuple[float, str]:
    if es_vol is None:
        return 0, "N/A"
    # Normal ES vol ~14%, crisis >35%
    if es_vol < 10:
        return 0, "CALME"
    if es_vol < 15:
        return 6, "NORMAL"
    if es_vol < 20:
        return 12, "ELEVE"
    if es_vol < 28:
        return 18, "STRESS"
    return 25, "CRISE"


def _score_treasury(zn_vol: Optional[float]) -> Tuple[float, str]:
    if zn_vol is None:
        return 0, "N/A"
    # Normal ZN vol ~4-5%, crisis >10%
    if zn_vol < 4:
        return 0, "CALME"
    if zn_vol < 6:
        return 5, "NORMAL"
    if zn_vol < 8:
        return 10, "AGITE"
    if zn_vol < 12:
        return 15, "STRESS"
    return 20, "CRISE"


def _score_energy(cl_vol: Optional[float]) -> Tuple[float, str]:
    if cl_vol is None:
        return 0, "N/A"
    # Normal CL ~30%, crisis >70%
    if cl_vol < 25:
        return 0, "CALME"
    if cl_vol < 35:
        return 4, "NORMAL"
    if cl_vol < 50:
        return 8, "AGITE"
    if cl_vol < 75:
        return 12, "STRESS"
    return 15, "CRISE"


def _score_fx_safe_haven(jpy_chg: Optional[float], chf_chg: Optional[float]) -> Tuple[float, str]:
    if jpy_chg is None or chf_chg is None:
        return 0, "N/A"
    # Both safe havens going up means risk-off flow
    bid = (jpy_chg + chf_chg) / 2
    if bid < 0:
        return 0, "RISK-ON"
    if bid < 0.5:
        return 4, "NEUTRE"
    if bid < 1.5:
        return 9, "FLIGHT"
    return 15, "PANIQUE"


def _score_gold_bid(gc_vol: Optional[float], gc_chg: Optional[float]) -> Tuple[float, str]:
    if gc_vol is None or gc_chg is None:
        return 0, "N/A"
    # Gold vol elevated AND price rising = stress
    score = 0
    if gc_vol > 15:
        score += 3
    if gc_vol > 25:
        score += 3
    if gc_chg > 1:
        score += 2
    if gc_chg > 3:
        score += 2
    label = "CALME" if score <= 2 else "BID" if score <= 6 else "FUITE"
    return score, label


def _score_correlations(assets: Dict[str, Dict[str, Any]]) -> Tuple[float, Dict[str, float]]:
    """High risk-on/risk-off correlation = everything moves together."""
    # Compute ES correlations to the other majors over the last 30 days
    if "ES" not in assets:
        return 0, {}
    es_ret = assets["ES"]["returns"][-30:]
    if len(es_ret) < 20:
        return 0, {}

    targets = ["NQ", "ZN", "CL", "GC", "6E", "BTC"]
    correls = {}
    for t in targets:
        if t not in assets:
            continue
        r = assets[t]["returns"][-30:]
        correls[t] = round(_pearson(es_ret, r), 3)

    # High absolute correlation across diverse assets = systemic
    if not correls:
        return 0, {}
    abs_vals = [abs(v) for v in correls.values()]
    mean_abs = sum(abs_vals) / len(abs_vals)
    # 0.2 = decoupled, 0.6 = systemic
    if mean_abs < 0.2:
        score = 0
    elif mean_abs < 0.35:
        score = 4
    elif mean_abs < 0.5:
        score = 9
    else:
        score = 15
    return score, correls


def _regime_from_score(score: float) -> Tuple[str, str]:
    if score < 15:
        return "CALME", "#22C55E"
    if score < 30:
        return "NORMAL", "#42A5F5"
    if score < 50:
        return "SURVEILLANCE", "#FFA726"
    if score < 70:
        return "STRESS", "#FF6B00"
    return "CRISE", "#EF4444"


def compute_systemic_risk() -> Dict[str, Any]:
    cached = _cached("systemic_risk")
    if cached:
        return cached

    assets = _load_all(n=120)

    es_vol = assets.get("ES", {}).get("vol_20d")
    zn_vol = assets.get("ZN", {}).get("vol_20d")
    cl_vol = assets.get("CL", {}).get("vol_20d")
    gc_vol = assets.get("GC", {}).get("vol_20d")
    gc_chg = assets.get("GC", {}).get("change_20d_pct")
    jpy_chg = assets.get("6J", {}).get("change_20d_pct")
    chf_chg = assets.get("6S", {}).get("change_20d_pct")

    score_vol, lbl_vol = _score_vol_regime(es_vol)
    score_tsy, lbl_tsy = _score_treasury(zn_vol)
    score_eng, lbl_eng = _score_energy(cl_vol)
    score_fx, lbl_fx = _score_fx_safe_haven(jpy_chg, chf_chg)
    score_gold, lbl_gold = _score_gold_bid(gc_vol, gc_chg)
    score_corr, correls = _score_correlations(assets)

    total = round(score_vol + score_tsy + score_eng + score_fx + score_gold + score_corr, 1)
    regime, regime_color = _regime_from_score(total)

    components = [
        {
            "id": "vol_regime",
            "label": "Vol regime (ES)",
            "max": 25,
            "score": score_vol,
            "state": lbl_vol,
            "value": round(es_vol, 2) if es_vol else None,
            "detail": f"Vol realisee 20j: {es_vol:.1f}%" if es_vol else "N/A",
        },
        {
            "id": "treasury",
            "label": "Stress Treasuries (ZN)",
            "max": 20,
            "score": score_tsy,
            "state": lbl_tsy,
            "value": round(zn_vol, 2) if zn_vol else None,
            "detail": f"Vol realisee 20j: {zn_vol:.1f}%" if zn_vol else "N/A",
        },
        {
            "id": "energy",
            "label": "Stress Energie (CL)",
            "max": 15,
            "score": score_eng,
            "state": lbl_eng,
            "value": round(cl_vol, 2) if cl_vol else None,
            "detail": f"Vol realisee 20j: {cl_vol:.1f}%" if cl_vol else "N/A",
        },
        {
            "id": "fx_haven",
            "label": "Flight-to-quality FX",
            "max": 15,
            "score": score_fx,
            "state": lbl_fx,
            "value": round((jpy_chg or 0) + (chf_chg or 0), 2) / 2 if jpy_chg is not None and chf_chg is not None else None,
            "detail": f"JPY 20j: {jpy_chg:+.2f}% | CHF 20j: {chf_chg:+.2f}%" if jpy_chg is not None and chf_chg is not None else "N/A",
        },
        {
            "id": "gold_bid",
            "label": "Fuite vers l'or (GC)",
            "max": 10,
            "score": score_gold,
            "state": lbl_gold,
            "value": round(gc_chg, 2) if gc_chg is not None else None,
            "detail": f"Vol {gc_vol:.1f}% | Var 20j {gc_chg:+.2f}%" if gc_vol is not None and gc_chg is not None else "N/A",
        },
        {
            "id": "correlations",
            "label": "Contagion cross-asset",
            "max": 15,
            "score": score_corr,
            "state": "SYSTEMIQUE" if score_corr >= 9 else "NORMAL" if score_corr > 0 else "DECOUPLE",
            "value": round(sum(abs(v) for v in correls.values()) / len(correls), 3) if correls else None,
            "detail": "Correlations abs moyennes ES vs majors",
        },
    ]

    # Build quick asset dashboard rows
    quick = []
    for sym in ("ES", "NQ", "ZN", "ZB", "CL", "GC", "SI", "6E", "6J", "6S", "BTC"):
        a = assets.get(sym)
        if not a:
            continue
        quick.append({
            "symbol": sym,
            "last": a["last_close"],
            "change_5d": round(a["change_5d_pct"], 2) if a["change_5d_pct"] is not None else None,
            "change_20d": round(a["change_20d_pct"], 2) if a["change_20d_pct"] is not None else None,
            "vol_20d": round(a["vol_20d"], 2) if a["vol_20d"] is not None else None,
            "vol_60d": round(a["vol_60d"], 2) if a["vol_60d"] is not None else None,
        })

    result = {
        "ok": True,
        "generated_at": datetime.now().isoformat(),
        "stress_score": total,
        "stress_score_max": 100,
        "regime": regime,
        "regime_color": regime_color,
        "components": components,
        "correlations_es": correls,
        "assets": quick,
    }
    _store("systemic_risk", result)
    return result
