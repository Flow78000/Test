"""
FLO.W - UW Usage Tracker

Garde un compteur persistant des appels UW pour afficher une barre de
consommation dans le frontend. Le compteur est mis a jour automatiquement
par proxy_uw.uw_fetch qui parse le header `x-uw-daily-req-count` sur
chaque reponse UW.

Reset : UW remet le compteur a zero a 8PM New York time (EDT ou EST).
On calcule l'heure UTC exacte via zoneinfo pour que l'UI affiche un
countdown fiable.

Persistance : server/uw_usage.json (pour survivre aux redemarrages et
pouvoir afficher le dernier count meme si le backend a redemarre depuis).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

try:
    from zoneinfo import ZoneInfo
    _NY = ZoneInfo("America/New_York")
except Exception:  # pragma: no cover
    _NY = None

UW_DAILY_LIMIT = 20000

STORE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "uw_usage.json",
)

_STATE: Dict[str, Any] = {
    "count": 0,
    "exhausted": False,
    "updated_at": None,
    "last_error": None,
    "last_reset_at": None,
}


def _load() -> None:
    if not os.path.exists(STORE_PATH):
        return
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            _STATE.update(data)
    except Exception:
        pass


def _save() -> None:
    try:
        with open(STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(_STATE, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


_load()


def next_reset_utc(ref: Optional[datetime] = None) -> datetime:
    """Retourne le prochain 8PM New York converti en UTC."""
    now = ref or datetime.now(timezone.utc)
    if _NY is not None:
        now_ny = now.astimezone(_NY)
        reset_ny = now_ny.replace(hour=20, minute=0, second=0, microsecond=0)
        if reset_ny <= now_ny:
            reset_ny = reset_ny + timedelta(days=1)
        return reset_ny.astimezone(timezone.utc)

    # Fallback approximatif : 00:30 UTC
    reset = now.replace(hour=0, minute=30, second=0, microsecond=0)
    if reset <= now:
        reset = reset + timedelta(days=1)
    return reset


def _previous_reset_utc(ref: Optional[datetime] = None) -> datetime:
    return next_reset_utc(ref) - timedelta(days=1)


def _maybe_rollover(now: datetime) -> None:
    """Si on a franchi une borne de reset UW depuis le dernier update,
    remet le compteur a zero."""
    updated_at = _STATE.get("updated_at")
    if not updated_at:
        return
    try:
        last = datetime.fromisoformat(updated_at)
    except Exception:
        return
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)

    prev_reset = _previous_reset_utc(now)
    if last < prev_reset <= now:
        _STATE["count"] = 0
        _STATE["exhausted"] = False
        _STATE["last_error"] = None
        _STATE["last_reset_at"] = prev_reset.isoformat()


def record_request(count_header: Optional[str], body_error_code: Optional[str]) -> None:
    """Appele par proxy_uw.uw_fetch apres chaque reponse UW.

    count_header  : valeur du header x-uw-daily-req-count (str ou None)
    body_error_code : code d'erreur UW si envelope d'erreur detectee
    """
    now = datetime.now(timezone.utc)
    _maybe_rollover(now)

    if count_header:
        try:
            val = int(count_header)
            # On garde toujours le max observe (au cas ou des reponses
            # arrivent dans le desordre)
            if val > _STATE.get("count", 0):
                _STATE["count"] = val
        except (TypeError, ValueError):
            pass

    if body_error_code:
        code_lo = str(body_error_code).lower()
        if "limit" in code_lo:
            _STATE["exhausted"] = True
            _STATE["last_error"] = body_error_code
            # Si on n'a pas de count header mais qu'on est exhausted, force le plein
            if _STATE.get("count", 0) < UW_DAILY_LIMIT:
                _STATE["count"] = UW_DAILY_LIMIT

    _STATE["updated_at"] = now.isoformat()
    _save()


def get_usage() -> Dict[str, Any]:
    """Retourne un snapshot serialisable de l'etat actuel."""
    now = datetime.now(timezone.utc)
    _maybe_rollover(now)

    count = int(_STATE.get("count", 0) or 0)
    limit = UW_DAILY_LIMIT
    pct = min(100.0, round(count / limit * 100, 1)) if limit else 0
    exhausted = bool(_STATE.get("exhausted")) or count >= limit
    reset_at = next_reset_utc(now)

    return {
        "count": count,
        "limit": limit,
        "pct": pct,
        "remaining": max(0, limit - count),
        "exhausted": exhausted,
        "updated_at": _STATE.get("updated_at"),
        "last_error": _STATE.get("last_error"),
        "last_reset_at": _STATE.get("last_reset_at"),
        "reset_at_utc": reset_at.isoformat(),
        "seconds_until_reset": max(0, int((reset_at - now).total_seconds())),
    }
