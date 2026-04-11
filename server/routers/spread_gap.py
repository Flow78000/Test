"""
FLO.W - Spread Gap Tracker (auto mode)

Calcule en live le spread gap entre le spot SPX et des niveaux de reference
recuperes automatiquement depuis UW (pas de saisie manuelle). Classe chaque
gap en zone (SAFE / APPROACH / TRIGGER / INSIDE) selon le VIX courant.

Regles auto-scalees par VIX :
    VIX < 15  -> APPROACH 35pts  TRIGGER 20-30pts  INSIDE 5pts
    VIX 15-25 -> APPROACH 50pts  TRIGGER 35-45pts  INSIDE 5pts
    VIX 25-35 -> APPROACH 75pts  TRIGGER 55-70pts  INSIDE 8pts
    VIX > 35  -> APPROACH 100pts TRIGGER 75-95pts  INSIDE 10pts

Les niveaux proviennent du module services/auto_levels.py qui agrege :
    - Call Wall / Put Wall (UW GEX)
    - Gamma Flip (zero crossing net gamma)
    - Top 2 autres strikes (|net_gamma|)
    - Close J-1 (reference overnight)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter

from services.auto_levels import get_auto_levels, clear_cache

router = APIRouter()

# ---------------------------------------------------------------------------
# VIX-scaled thresholds — base configuration
# ---------------------------------------------------------------------------
VIX_TIERS = [
    {"vix_max": 15, "approach": 35, "trigger_hi": 30, "trigger_lo": 20, "inside": 5},
    {"vix_max": 25, "approach": 50, "trigger_hi": 45, "trigger_lo": 35, "inside": 5},
    {"vix_max": 35, "approach": 75, "trigger_hi": 70, "trigger_lo": 55, "inside": 8},
    {"vix_max": 999, "approach": 100, "trigger_hi": 95, "trigger_lo": 75, "inside": 10},
]


def resolve_tier(vix: float) -> Dict[str, float]:
    for t in VIX_TIERS:
        if vix <= t["vix_max"]:
            return t
    return VIX_TIERS[-1]


# ---------------------------------------------------------------------------
# Spot + VIX fetch
# ---------------------------------------------------------------------------
def _get_spot_and_vix(ticker: str = "SPX") -> Dict[str, Any]:
    """Recupere spot + VIX via le proxy UW existant."""
    try:
        from routers.proxy_uw import spot_price
        info = spot_price(ticker=ticker)
        if isinstance(info, dict) and info.get("spot"):
            return {
                "spot": float(info.get("spot", 0)),
                "vix": float(info.get("vix", 0)),
                "iv_rank": float(info.get("iv_rank", 0)),
                "source": "uw",
                "updated_at": info.get("updated_at"),
            }
        return {"spot": 0, "vix": 0, "source": "uw", "error": "no data"}
    except Exception as e:
        return {"spot": 0, "vix": 0, "source": "uw", "error": str(e)}


# ---------------------------------------------------------------------------
# Zone classification
# ---------------------------------------------------------------------------
def _classify_zone(gap_abs: float, tier: Dict[str, float]) -> str:
    if gap_abs <= tier["inside"]:
        return "INSIDE"
    if gap_abs <= tier["trigger_hi"]:
        if gap_abs >= tier["trigger_lo"]:
            return "TRIGGER"
        return "TRIGGER_INNER"
    if gap_abs <= tier["approach"]:
        return "APPROACH"
    return "SAFE"


def _zone_severity(zone: str) -> int:
    return {
        "SAFE": 0,
        "APPROACH": 40,
        "TRIGGER_INNER": 75,
        "TRIGGER": 85,
        "INSIDE": 100,
    }.get(zone, 0)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/auto-levels")
def auto_levels(ticker: str = "SPX", force: bool = False) -> Dict[str, Any]:
    """Retourne uniquement les niveaux auto (sans live eval)."""
    return get_auto_levels(ticker=ticker, force=force)


@router.post("/auto-levels/refresh")
def refresh_auto_levels(ticker: str = "SPX") -> Dict[str, Any]:
    """Force un refetch UW (ignore le cache 5min)."""
    clear_cache()
    return get_auto_levels(ticker=ticker, force=True)


@router.get("/live")
def live(ticker: str = "SPX", force: bool = False) -> Dict[str, Any]:
    """Retourne spot + VIX + tier + niveaux auto avec gap et zone live."""
    market = _get_spot_and_vix(ticker)
    spot = market.get("spot", 0)
    vix = market.get("vix", 0)
    tier = resolve_tier(vix)

    auto = get_auto_levels(ticker=ticker, force=force)
    raw_levels = auto.get("levels") or []

    rows = []
    for lvl in raw_levels:
        price = float(lvl.get("price", 0))
        if price <= 0:
            continue
        gap = spot - price  # positif = spot au-dessus du niveau
        gap_abs = abs(gap)
        zone = _classify_zone(gap_abs, tier) if spot > 0 else "UNKNOWN"
        rows.append({
            **lvl,
            "gap": round(gap, 2),
            "gap_abs": round(gap_abs, 2),
            "zone": zone,
            "severity": _zone_severity(zone),
            "direction": "above" if gap >= 0 else "below",
        })

    rows.sort(key=lambda r: r["gap_abs"])

    counts = {"SAFE": 0, "APPROACH": 0, "TRIGGER_INNER": 0, "TRIGGER": 0, "INSIDE": 0}
    for r in rows:
        counts[r["zone"]] = counts.get(r["zone"], 0) + 1

    return {
        "ticker": ticker,
        "spot": round(spot, 2),
        "vix": round(vix, 2),
        "tier": tier,
        "counts": counts,
        "rows": rows,
        "market": market,
        "auto": {
            "source": auto.get("source"),
            "from_cache": auto.get("from_cache"),
            "age_seconds": auto.get("age_seconds"),
            "strikes_analyzed": auto.get("strikes_analyzed"),
            "error": auto.get("error"),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/config")
def config() -> Dict[str, Any]:
    """Retourne la configuration des tiers VIX."""
    return {"tiers": VIX_TIERS}
