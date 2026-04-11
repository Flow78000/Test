"""
FLO.W - Auto Levels Service

Recupere automatiquement les niveaux de reference les plus pertinents pour
SPX a partir des donnees UW (pas de saisie manuelle). Combine :

    - Call Wall    -> strike avec le plus gros call gamma (resistance magnet)
    - Put Wall     -> strike avec le plus gros put gamma (support magnet)
    - Gamma Flip   -> croisement signe net gamma (regime flip intraday)
    - GEX #2/#3    -> 2 autres strikes les plus charges en gamma absolu
    - Prev Close   -> close J-1 (reference overnight)

Les donnees viennent de UW :
    /api/stock/SPX/spot-exposures/strike       (gamma par strike)
    /api/stock/SPX/iv-rank                     (close/spot J-1)

Resultat cache 5 minutes pour eviter de brûler le quota UW.
"""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from routers.proxy_uw import uw_fetch

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_CACHE: Dict[str, Any] = {"ts": 0, "data": None, "ticker": None}
_CACHE_TTL = 300  # 5 minutes


def _round_strike(v: float) -> float:
    return round(v, 2)


# ---------------------------------------------------------------------------
# Core fetch
# ---------------------------------------------------------------------------
def _fetch_gex_strikes(ticker: str) -> List[Dict[str, float]]:
    """Retourne la liste parseee [{strike, call_gamma, put_gamma, net_gamma}]."""
    raw = uw_fetch(f"/stock/{ticker}/spot-exposures/strike")
    if not isinstance(raw, dict):
        return []
    data = raw.get("data") or []
    if not isinstance(data, list):
        return []
    out: List[Dict[str, float]] = []
    for s in data:
        try:
            strike = float(s.get("strike", 0) or 0)
            call_g = float(s.get("call_gamma_oi", 0) or 0)
            put_g = float(s.get("put_gamma_oi", 0) or 0)
            if strike <= 0:
                continue
            out.append({
                "strike": strike,
                "call_gamma": call_g,
                "put_gamma": put_g,
                "net_gamma": call_g + put_g,
            })
        except (TypeError, ValueError):
            continue
    return out


def _fetch_prev_close(ticker: str) -> Optional[float]:
    """Close de la veille via iv-rank (derniere entree = close J-1 ou J)."""
    raw = uw_fetch(f"/stock/{ticker}/iv-rank")
    if not isinstance(raw, dict):
        return None
    data = raw.get("data") or []
    if not isinstance(data, list) or len(data) < 2:
        return None
    # Avant-derniere entree = close J-1 (la derniere peut etre incomplete intraday)
    try:
        return float(data[-2].get("close", 0) or 0) or None
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Level extraction
# ---------------------------------------------------------------------------
def _compute_gamma_flip(strikes: List[Dict[str, float]]) -> Optional[float]:
    """Point de basculement du signe du net gamma (interpolation lineaire)."""
    if not strikes:
        return None
    s = sorted(strikes, key=lambda x: x["strike"])
    for i in range(1, len(s)):
        prev = s[i - 1]
        curr = s[i]
        if prev["net_gamma"] * curr["net_gamma"] < 0:
            # Interpolation lineaire sur le zero crossing
            x0, y0 = prev["strike"], prev["net_gamma"]
            x1, y1 = curr["strike"], curr["net_gamma"]
            if y1 == y0:
                return (x0 + x1) / 2
            zero = x0 - y0 * (x1 - x0) / (y1 - y0)
            return round(zero, 2)
    return None


def _extract_levels(
    strikes: List[Dict[str, float]],
    prev_close: Optional[float],
) -> List[Dict[str, Any]]:
    """Extrait les 4-6 niveaux les plus pertinents."""
    levels: List[Dict[str, Any]] = []
    if not strikes:
        return levels

    # Call Wall — strike avec le plus gros call gamma positif
    call_wall = max(strikes, key=lambda x: x["call_gamma"])
    if call_wall["call_gamma"] > 0:
        levels.append({
            "id": "call_wall",
            "label": "Call Wall",
            "price": _round_strike(call_wall["strike"]),
            "side": "bear",  # resistance = rejette a la baisse au-dessus
            "source": "UW GEX",
            "weight": 100,
            "note": f"Max call gamma ({call_wall['call_gamma']:.0f})",
        })

    # Put Wall — strike avec le plus gros put gamma (le plus negatif)
    put_wall = min(strikes, key=lambda x: x["put_gamma"])
    if put_wall["put_gamma"] < 0:
        levels.append({
            "id": "put_wall",
            "label": "Put Wall",
            "price": _round_strike(put_wall["strike"]),
            "side": "bull",  # support = rejette a la hausse en dessous
            "source": "UW GEX",
            "weight": 100,
            "note": f"Max put gamma ({put_wall['put_gamma']:.0f})",
        })

    # Gamma Flip — zero crossing net gamma
    gflip = _compute_gamma_flip(strikes)
    if gflip:
        levels.append({
            "id": "gamma_flip",
            "label": "Gamma Flip",
            "price": _round_strike(gflip),
            "side": "pivot",
            "source": "UW GEX",
            "weight": 90,
            "note": "Regime flip long/short gamma",
        })

    # Top 2 autres strikes par |net_gamma| (hors walls et flip deja inclus)
    used_strikes = {lvl["price"] for lvl in levels}
    other = sorted(
        strikes,
        key=lambda x: abs(x["net_gamma"]),
        reverse=True,
    )
    rank = 2
    for s in other:
        if rank > 3:
            break
        if _round_strike(s["strike"]) in used_strikes:
            continue
        side = "bear" if s["net_gamma"] > 0 else "bull"
        levels.append({
            "id": f"gex_{rank}",
            "label": f"GEX #{rank}",
            "price": _round_strike(s["strike"]),
            "side": side,
            "source": "UW GEX",
            "weight": 70 - (rank - 2) * 10,
            "note": f"Net gamma {s['net_gamma']:+.0f}",
        })
        used_strikes.add(_round_strike(s["strike"]))
        rank += 1

    # Previous close overnight
    if prev_close and prev_close > 0:
        levels.append({
            "id": "prev_close",
            "label": "Prev Close",
            "price": _round_strike(prev_close),
            "side": "pivot",
            "source": "UW Daily",
            "weight": 60,
            "note": "Close J-1 (reference overnight)",
        })

    return levels


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def get_auto_levels(ticker: str = "SPX", force: bool = False) -> Dict[str, Any]:
    """Retourne les niveaux auto + metadata cache.
    Cache 5min pour menager le quota UW.
    """
    now = time.time()
    if (
        not force
        and _CACHE["data"] is not None
        and _CACHE["ticker"] == ticker
        and now - _CACHE["ts"] < _CACHE_TTL
    ):
        return {
            **_CACHE["data"],
            "from_cache": True,
            "age_seconds": int(now - _CACHE["ts"]),
        }

    strikes = _fetch_gex_strikes(ticker)
    prev_close = _fetch_prev_close(ticker)
    levels = _extract_levels(strikes, prev_close)

    result = {
        "ticker": ticker,
        "levels": levels,
        "count": len(levels),
        "strikes_analyzed": len(strikes),
        "source": "UW",
        "error": None if strikes else "No GEX data from UW (quota or downtime)",
        "from_cache": False,
    }

    # Ne cache pas les resultats vides pour retry plus tot
    if levels:
        _CACHE["ts"] = now
        _CACHE["data"] = result
        _CACHE["ticker"] = ticker

    return result


def clear_cache() -> None:
    _CACHE["ts"] = 0
    _CACHE["data"] = None
    _CACHE["ticker"] = None
