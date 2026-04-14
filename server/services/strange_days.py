"""
FLO.W — Nanex #3 Strange Days
Anomaly detection: identify sessions where market behavior is statistically abnormal.

7 indicators (each scored 0-100):
  1. VIX Disconnect      — VIX and SPX moving in same direction (should be inverse)
  2. Volume Anomaly      — Abnormal volume vs recent average (very high or very low)
  3. Correlation Break   — SPY/QQQ or SPY/IWM diverging significantly intraday
  4. Options Skew Extreme— SKEW index at extremes (>150 or <110)
  5. Term Structure Inv. — VIX9D > VIX (backwardation = near-term fear premium)
  6. Dark Pool Divergence— DP buying but price falling (or selling but price rising)
  7. Breadth Divergence  — Market up but internals weak, or vice versa
"""
from __future__ import annotations

import math
import time
import json
import requests
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}
CACHE_TTL = 120  # 2 minutes


def _cached(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    return None


def _store(key: str, val: Any) -> None:
    _cache[key] = (time.time(), val)


# ---------------------------------------------------------------------------
# Internal API helpers
# ---------------------------------------------------------------------------
BASE_URL = "http://127.0.0.1:3850"


def _get(path: str, timeout: int = 8) -> Optional[Dict]:
    try:
        r = requests.get(f"{BASE_URL}{path}", timeout=timeout)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Indicator helpers
# ---------------------------------------------------------------------------

def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


def _safe_float(obj: Any, *keys: str, default: float = 0.0) -> Optional[float]:
    """Walk a nested dict/list using the given keys and return the float value."""
    cur = obj
    for k in keys:
        if cur is None:
            return None
        if isinstance(cur, dict):
            cur = cur.get(k)
        elif isinstance(cur, list) and isinstance(k, int):
            cur = cur[k] if k < len(cur) else None
        else:
            return None
    if cur is None:
        return None
    try:
        return float(cur)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Indicator 1 — VIX Disconnect
# ---------------------------------------------------------------------------

def compute_vix_disconnect(regime_data: Optional[Dict]) -> Dict:
    """
    VIX and SPX should be inversely correlated.
    Score high when they move in the same direction, or VIX barely reacts to a big SPX move.
    """
    indicator = {
        "id": "vix_disconnect",
        "label": "Deconnexion VIX",
        "description": "VIX et SPX devraient etre inverses. Un mouvement dans le meme sens indique une anomalie de marche.",
        "score": 0,
        "value": None,
        "unit": "pts",
        "threshold": "Meme direction = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    if not regime_data:
        return indicator

    try:
        layers = regime_data.get("layers", {})
        # Try to get VIX and SPX changes from regime data
        vix_change = _safe_float(regime_data, "vix_change_pct")
        spx_change = _safe_float(regime_data, "spx_change_pct")

        # Fallback: look inside raw quotes
        quotes = regime_data.get("quotes", {})
        if vix_change is None:
            vix_change = _safe_float(quotes, "VIX", "change_pct")
        if spx_change is None:
            spx_change = _safe_float(quotes, "SPY", "change_pct")

        # Also try top-level fields that some regime endpoints expose
        if vix_change is None:
            vix_change = _safe_float(regime_data, "vix", "change_pct")
        if spx_change is None:
            spx_change = _safe_float(regime_data, "spx", "change_pct")

        if vix_change is None or spx_change is None:
            return indicator

        indicator["available"] = True

        # VIX expected direction: opposite of SPX
        # A positive product means same direction (anomaly)
        product = vix_change * spx_change

        # Score logic:
        # Same direction (product > 0) -> higher anomaly
        # Magnitude matters: stronger co-movement = higher score
        if product > 0:
            # Anomaly: same direction
            magnitude = abs(vix_change) + abs(spx_change)
            score = _clamp(30 + magnitude * 8)
        else:
            # Normal inverse relationship
            # Check if VIX didn't react enough to a big SPX move
            if abs(spx_change) > 0.5 and abs(vix_change) < 0.3:
                score = _clamp(20 + abs(spx_change) * 5)
            else:
                score = _clamp(max(0, 10 - abs(vix_change + spx_change) * 2))

        indicator["score"] = round(score, 1)
        indicator["value"] = round(product, 3)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Indicator 2 — Volume Anomaly
# ---------------------------------------------------------------------------

def compute_volume_anomaly(tide_data: Optional[Dict]) -> Dict:
    indicator = {
        "id": "volume_anomaly",
        "label": "Anomalie Volume",
        "description": "Volume anormalement eleve ou faible par rapport a la moyenne recente. Les extremes signalent une activite inhabituelle.",
        "score": 0,
        "value": None,
        "unit": "x avg",
        "threshold": "> 3x ou < 0.3x = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    if not tide_data:
        return indicator

    try:
        # Market tide can have different shapes depending on UW response
        # Try various paths
        data = tide_data.get("data") or tide_data

        volume_ratio = None

        # Check if there's a volume_ratio or similar field
        if isinstance(data, dict):
            volume_ratio = _safe_float(data, "volume_ratio")
            if volume_ratio is None:
                volume_ratio = _safe_float(data, "vol_ratio")
            # Try computing from current vs average
            current = _safe_float(data, "volume") or _safe_float(data, "total_volume")
            avg = _safe_float(data, "avg_volume") or _safe_float(data, "volume_avg")
            if current and avg and avg > 0:
                volume_ratio = current / avg

        if isinstance(data, list) and len(data) > 0:
            first = data[0] if isinstance(data[0], dict) else {}
            current = _safe_float(first, "volume") or _safe_float(first, "total_volume")
            avg = _safe_float(first, "avg_volume")
            if current and avg and avg > 0:
                volume_ratio = current / avg

        if volume_ratio is None:
            return indicator

        indicator["available"] = True
        indicator["value"] = round(volume_ratio, 2)

        # Score: anomaly at both extremes
        if volume_ratio > 3.0:
            score = _clamp(40 + (volume_ratio - 3.0) * 15)
        elif volume_ratio > 2.0:
            score = _clamp(20 + (volume_ratio - 2.0) * 20)
        elif volume_ratio < 0.3:
            score = _clamp(50 + (0.3 - volume_ratio) * 100)
        elif volume_ratio < 0.5:
            score = _clamp(20 + (0.5 - volume_ratio) * 150)
        else:
            # Normal range 0.5 - 2.0
            score = max(0, (abs(volume_ratio - 1.0) - 0.3) * 10)

        indicator["score"] = round(score, 1)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Indicator 3 — Correlation Break
# ---------------------------------------------------------------------------

def compute_correlation_break(regime_data: Optional[Dict]) -> Dict:
    indicator = {
        "id": "correlation_break",
        "label": "Rupture Correlation",
        "description": "SPY/QQQ et SPY/IWM sont normalement tres correles. Une divergence significative indique une anomalie sectorielle.",
        "score": 0,
        "value": None,
        "unit": "pts div",
        "threshold": "Divergence > 1.5% = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    if not regime_data:
        return indicator

    try:
        quotes = regime_data.get("quotes", {})

        spy_chg = _safe_float(quotes, "SPY", "change_pct")
        qqq_chg = _safe_float(quotes, "QQQ", "change_pct")
        iwm_chg = _safe_float(quotes, "IWM", "change_pct")

        if spy_chg is None:
            return indicator

        indicator["available"] = True

        max_div = 0.0

        if qqq_chg is not None:
            div_qqq = abs(spy_chg - qqq_chg)
            max_div = max(max_div, div_qqq)

        if iwm_chg is not None:
            div_iwm = abs(spy_chg - iwm_chg)
            max_div = max(max_div, div_iwm)

        if max_div == 0.0:
            return indicator

        indicator["value"] = round(max_div, 2)

        # Score based on divergence magnitude
        if max_div > 3.0:
            score = _clamp(70 + (max_div - 3.0) * 10)
        elif max_div > 1.5:
            score = _clamp(30 + (max_div - 1.5) * 26)
        elif max_div > 0.8:
            score = _clamp(10 + (max_div - 0.8) * 28)
        else:
            score = max(0.0, max_div * 12)

        indicator["score"] = round(score, 1)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Indicator 4 — Options Skew Extreme
# ---------------------------------------------------------------------------

def compute_skew_extreme(regime_data: Optional[Dict]) -> Dict:
    indicator = {
        "id": "skew_extreme",
        "label": "Skew Options Extreme",
        "description": "L'indice SKEW mesure la demande de protection extreme. >150 = peur tail risk, <110 = complaisance dangereuse.",
        "score": 0,
        "value": None,
        "unit": "pts",
        "threshold": ">150 ou <110 = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    if not regime_data:
        return indicator

    try:
        skew = _safe_float(regime_data, "skew")
        if skew is None:
            skew = _safe_float(regime_data, "skew_index")
        if skew is None:
            quotes = regime_data.get("quotes", {})
            skew = _safe_float(quotes, "SKEW", "last")

        if skew is None or skew <= 0:
            return indicator

        indicator["available"] = True
        indicator["value"] = round(skew, 1)

        # Score: anomaly at extremes
        if skew > 150:
            score = _clamp(60 + (skew - 150) * 2)
        elif skew > 135:
            score = _clamp(30 + (skew - 135) * 2)
        elif skew < 110:
            score = _clamp(60 + (110 - skew) * 2)
        elif skew < 120:
            score = _clamp(20 + (120 - skew) * 4)
        else:
            # Normal range 120-135
            score = 5.0

        indicator["score"] = round(score, 1)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Indicator 5 — Term Structure Inversion
# ---------------------------------------------------------------------------

def compute_term_structure_inversion(regime_data: Optional[Dict]) -> Dict:
    indicator = {
        "id": "term_structure_inv",
        "label": "Inversion Structure Terme",
        "description": "VIX9D > VIX signifie que la peur a court terme depasse la peur a moyen terme (backwardation) — signal de stress aigu.",
        "score": 0,
        "value": None,
        "unit": "pts diff",
        "threshold": "VIX9D > VIX = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    if not regime_data:
        return indicator

    try:
        vix = _safe_float(regime_data, "vix")
        vix9d = _safe_float(regime_data, "vix9d")

        if vix is None or vix9d is None:
            quotes = regime_data.get("quotes", {})
            if vix is None:
                vix = _safe_float(quotes, "VIX", "last")
            if vix9d is None:
                vix9d = _safe_float(quotes, "VIX9D", "last")

        if vix is None or vix9d is None or vix <= 0:
            return indicator

        indicator["available"] = True
        diff = vix9d - vix  # positive = backwardation = inversion
        indicator["value"] = round(diff, 2)

        if diff > 0:
            # Backwardation — anomaly
            score = _clamp(40 + diff * 8)
        elif diff > -1:
            # Nearly flat — mild
            score = _clamp(15 + (1 + diff) * 10)
        else:
            # Normal contango
            score = max(0.0, 10 + diff * 2)

        indicator["score"] = round(score, 1)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Indicator 6 — Dark Pool Divergence
# ---------------------------------------------------------------------------

def compute_dark_pool_divergence(regime_data: Optional[Dict], dp_data: Optional[Dict]) -> Dict:
    indicator = {
        "id": "dark_pool_divergence",
        "label": "Divergence Dark Pool",
        "description": "Achats massifs en dark pool mais prix baissier (ou l'inverse) — signal de distribution cachee ou d'accumulation furtive.",
        "score": 0,
        "value": None,
        "unit": "indice",
        "threshold": "Conflit DP/prix = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    try:
        # Get DPSS from regime layers
        dpss = None
        spy_chg = None

        if regime_data:
            layers = regime_data.get("layers", {})
            dp_layer = layers.get("dark_pool", {})
            dpss = _safe_float(dp_layer, "dpss_5d")
            if dpss is None:
                dpss = _safe_float(dp_layer, "dpss")
            if dpss is None:
                dpss = _safe_float(regime_data, "dpss")

            quotes = regime_data.get("quotes", {})
            spy_chg = _safe_float(quotes, "SPY", "change_pct")

        if dpss is None and dp_data:
            # Try from dp scanner data
            dpss = _safe_float(dp_data, "dpss") or _safe_float(dp_data, "dpss_5d")

        if dpss is None or spy_chg is None:
            return indicator

        indicator["available"] = True

        # DPSS > 0.5 = bullish dark pool, < 0.5 = bearish
        dp_bullish = dpss > 0.5
        price_bullish = spy_chg > 0

        # Divergence: dp and price in opposite directions
        if dp_bullish != price_bullish:
            # Conflict: how strong?
            dp_strength = abs(dpss - 0.5) * 2  # 0-1
            price_strength = min(abs(spy_chg) / 2.0, 1.0)  # 0-1 (capped at 2% move)
            conflict_strength = dp_strength * price_strength
            score = _clamp(20 + conflict_strength * 80)
        else:
            score = max(0.0, 5.0 - abs(dpss - 0.5) * 10)

        indicator["value"] = round(dpss, 3)
        indicator["score"] = round(score, 1)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Indicator 7 — Breadth Divergence
# ---------------------------------------------------------------------------

def compute_breadth_divergence(regime_data: Optional[Dict]) -> Dict:
    indicator = {
        "id": "breadth_divergence",
        "label": "Divergence Breadth",
        "description": "Marche en hausse mais secteurs majoritairement en baisse (ou l'inverse) — signal de marche a double vitesse ou de retournement imminent.",
        "score": 0,
        "value": None,
        "unit": "ratio",
        "threshold": "> 0.6 en opposition = anomalie",
        "status": "NORMAL",
        "available": False,
    }

    if not regime_data:
        return indicator

    try:
        # Look for sector breadth data
        quotes = regime_data.get("quotes", {})
        sector_etfs = ["XLF", "XLK", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"]

        spy_chg = _safe_float(quotes, "SPY", "change_pct")
        if spy_chg is None:
            return indicator

        sector_changes = []
        for etf in sector_etfs:
            chg = _safe_float(quotes, etf, "change_pct")
            if chg is not None:
                sector_changes.append(chg)

        if len(sector_changes) < 3:
            return indicator

        indicator["available"] = True

        market_up = spy_chg > 0
        sectors_up = sum(1 for c in sector_changes if c > 0)
        sectors_down = len(sector_changes) - sectors_up
        total = len(sector_changes)

        # Fraction of sectors going against the market
        if market_up:
            against_fraction = sectors_down / total
        else:
            against_fraction = sectors_up / total

        indicator["value"] = round(against_fraction, 2)

        if against_fraction > 0.7:
            score = _clamp(60 + (against_fraction - 0.7) * 133)
        elif against_fraction > 0.5:
            score = _clamp(25 + (against_fraction - 0.5) * 175)
        elif against_fraction > 0.3:
            score = _clamp(5 + (against_fraction - 0.3) * 100)
        else:
            score = against_fraction * 16

        indicator["score"] = round(score, 1)
        indicator["status"] = _score_to_status(score)

    except Exception:
        pass

    return indicator


# ---------------------------------------------------------------------------
# Status helper
# ---------------------------------------------------------------------------

def _score_to_status(score: float) -> str:
    if score >= 70:
        return "CRITIQUE"
    if score >= 30:
        return "ALERTE"
    return "NORMAL"


def _score_to_color(score: float) -> str:
    if score >= 80:
        return "#EF4444"
    if score >= 60:
        return "#FF6B00"
    if score >= 30:
        return "#FFA726"
    return "#22C55E"


# ---------------------------------------------------------------------------
# Market session helper
# ---------------------------------------------------------------------------

def _get_session_status() -> str:
    from datetime import datetime
    import pytz
    try:
        et = datetime.now(pytz.timezone("America/New_York"))
        h, d = et.hour, et.weekday()
        if d >= 5:
            return "FERME"
        if 9 <= h < 16:
            return "CASH"
        if 4 <= h < 9:
            return "PRE-MKT"
        if 16 <= h < 20:
            return "AFTER-H"
        return "FERME"
    except Exception:
        return "INCONNU"


# ---------------------------------------------------------------------------
# Main compute function
# ---------------------------------------------------------------------------

def compute_strange_days() -> Dict:
    cached = _cached("strange_days")
    if cached is not None:
        return cached

    generated_at = datetime.now(timezone.utc).isoformat()

    # Fetch data sources
    regime_data = _get("/api/regime/full")
    tide_data = _get("/api/uw/market-tide")
    dp_data = _get("/api/market/darkpool-summary")  # may not exist, handled gracefully

    # Compute all indicators
    indicators = [
        compute_vix_disconnect(regime_data),
        compute_volume_anomaly(tide_data),
        compute_correlation_break(regime_data),
        compute_skew_extreme(regime_data),
        compute_term_structure_inversion(regime_data),
        compute_dark_pool_divergence(regime_data, dp_data),
        compute_breadth_divergence(regime_data),
    ]

    # Weights (must sum to 1.0)
    WEIGHTS = {
        "vix_disconnect": 0.20,
        "volume_anomaly": 0.12,
        "correlation_break": 0.15,
        "skew_extreme": 0.14,
        "term_structure_inv": 0.16,
        "dark_pool_divergence": 0.13,
        "breadth_divergence": 0.10,
    }

    # Weighted average using only available indicators
    # Re-normalise weights to available indicators
    available = [ind for ind in indicators if ind.get("available")]
    unavailable = [ind for ind in indicators if not ind.get("available")]

    if available:
        weight_sum = sum(WEIGHTS.get(ind["id"], 0.143) for ind in available)
        overall = 0.0
        for ind in available:
            w = WEIGHTS.get(ind["id"], 0.143)
            overall += ind["score"] * (w / weight_sum)
        overall = round(_clamp(overall), 1)
    else:
        overall = 0.0

    active_anomalies = sum(1 for ind in indicators if ind["score"] >= 30)
    critiques = [ind for ind in indicators if ind["score"] >= 70]
    most_severe = max(indicators, key=lambda x: x["score"]) if indicators else None

    result = {
        "ok": True,
        "generated_at": generated_at,
        "session": _get_session_status(),
        "overall_score": overall,
        "overall_color": _score_to_color(overall),
        "overall_status": _score_to_status(overall),
        "active_anomalies": active_anomalies,
        "critique_count": len(critiques),
        "most_severe": most_severe["label"] if most_severe and most_severe["score"] >= 10 else "Aucune",
        "most_severe_score": most_severe["score"] if most_severe else 0,
        "indicators": indicators,
        "available_count": len(available),
        "total_count": len(indicators),
    }

    _store("strange_days", result)
    return result
