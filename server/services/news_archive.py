"""
FLO.W - News archive with rolling 2-week retention

Periodically pulls the Unusual Whales /news/headlines endpoint,
deduplicates against the existing archive, appends new items, and
prunes anything older than RETENTION_DAYS (default 14).

The archive lives in a single JSON file on disk and is safe to
read while the writer is running because we always rewrite the
file atomically (tempfile -> os.replace).

Public API:
    start_news_archiver()         -> starts the background thread
    get_archive(limit, ticker, ...) -> queries the archive
    force_refresh()               -> triggers an immediate pull
"""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional


ARCHIVE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "news_archive.json",
)

RETENTION_DAYS = 14
REFRESH_INTERVAL_SECONDS = 300  # 5 minutes
UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")

_lock = threading.Lock()
_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_last_refresh_ts: Optional[str] = None
_last_new_count: int = 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _uw_headlines() -> List[Dict[str, Any]]:
    """Fetch UW news headlines via the centralised pooled client.

    Headlines are polled by a background thread; cache TTL is short (~30s) so
    polling stays effective while still benefitting from connection pooling
    and central usage tracking.
    """
    from services.uw_client import uw_get
    data = uw_get("/news/headlines", ttl=30)
    if isinstance(data, dict):
        if "error" in data and "data" not in data:
            return []
        return data.get("data") or data.get("headlines") or []
    if isinstance(data, list):
        return data
    return []


def _hash_headline(item: Dict[str, Any]) -> str:
    payload = (
        (item.get("headline") or "") + "||" +
        (item.get("created_at") or "") + "||" +
        (item.get("source") or "")
    )
    return hashlib.sha1(payload.encode("utf-8", errors="ignore")).hexdigest()[:16]


def _load_archive() -> Dict[str, Any]:
    if not os.path.exists(ARCHIVE_PATH):
        return {"items": [], "updated_at": None, "refresh_count": 0}
    try:
        with open(ARCHIVE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("items", [])
            data.setdefault("updated_at", None)
            data.setdefault("refresh_count", 0)
            return data
    except Exception:
        return {"items": [], "updated_at": None, "refresh_count": 0}


def _save_archive(data: Dict[str, Any]) -> None:
    # Atomic write via tempfile + os.replace
    dir_ = os.path.dirname(ARCHIVE_PATH)
    fd, tmp_path = tempfile.mkstemp(prefix=".news_archive_", suffix=".json", dir=dir_)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp_path, ARCHIVE_PATH)
    except Exception:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        raise


def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _prune(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    kept: List[Dict[str, Any]] = []
    for it in items:
        ts = _parse_iso(it.get("created_at"))
        if ts is None:
            # Missing timestamp -> keep but tag as stale after RETENTION_DAYS from first_seen
            first_seen = _parse_iso(it.get("first_seen_at"))
            if first_seen is None or first_seen >= cutoff:
                kept.append(it)
            continue
        if ts >= cutoff:
            kept.append(it)
    return kept


# ---------------------------------------------------------------------------
# Refresh cycle
# ---------------------------------------------------------------------------
def refresh() -> Dict[str, Any]:
    """One pull cycle. Returns summary of what was added."""
    global _last_refresh_ts, _last_new_count
    headlines = _uw_headlines()
    with _lock:
        archive = _load_archive()
        existing = {it.get("hash"): it for it in archive.get("items", []) if it.get("hash")}
        now_iso = datetime.now(timezone.utc).isoformat()
        added = 0
        for h in headlines:
            if not isinstance(h, dict):
                continue
            h_copy = dict(h)
            h_hash = _hash_headline(h_copy)
            if h_hash in existing:
                continue
            h_copy["hash"] = h_hash
            h_copy["first_seen_at"] = now_iso
            existing[h_hash] = h_copy
            added += 1

        merged = list(existing.values())
        merged = _prune(merged)
        # Sort descending by created_at then first_seen_at
        def _sort_key(it: Dict[str, Any]):
            ts = _parse_iso(it.get("created_at")) or _parse_iso(it.get("first_seen_at"))
            return ts or datetime(1970, 1, 1, tzinfo=timezone.utc)
        merged.sort(key=_sort_key, reverse=True)

        archive["items"] = merged
        archive["updated_at"] = now_iso
        archive["refresh_count"] = archive.get("refresh_count", 0) + 1
        _save_archive(archive)
        _last_refresh_ts = now_iso
        _last_new_count = added

        return {
            "ok": True,
            "added": added,
            "total": len(merged),
            "updated_at": now_iso,
            "refresh_count": archive["refresh_count"],
        }


# ---------------------------------------------------------------------------
# Background thread
# ---------------------------------------------------------------------------
def _loop():
    # Initial pull right away
    try:
        refresh()
    except Exception as e:
        print(f"[news_archive] initial refresh error: {e}")
    while not _stop_event.is_set():
        if _stop_event.wait(REFRESH_INTERVAL_SECONDS):
            break
        try:
            refresh()
        except Exception as e:
            print(f"[news_archive] refresh error: {e}")


def start_news_archiver() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop_event.clear()
    _thread = threading.Thread(target=_loop, name="news_archiver", daemon=True)
    _thread.start()
    print(f"[news_archive] background thread started (every {REFRESH_INTERVAL_SECONDS}s, retention {RETENTION_DAYS}d)")


def stop_news_archiver() -> None:
    _stop_event.set()


def force_refresh() -> Dict[str, Any]:
    return refresh()


# ---------------------------------------------------------------------------
# Query API
# ---------------------------------------------------------------------------
def get_archive(
    limit: int = 200,
    ticker: Optional[str] = None,
    source: Optional[str] = None,
    since: Optional[str] = None,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    archive = _load_archive()
    items = archive.get("items", [])

    since_dt = _parse_iso(since) if since else None

    def _match(it: Dict[str, Any]) -> bool:
        if ticker:
            tick_list = it.get("tickers") or it.get("ticker") or []
            if isinstance(tick_list, str):
                tick_list = [tick_list]
            if ticker.upper() not in [str(t).upper() for t in tick_list]:
                return False
        if source:
            src = (it.get("source") or "").lower()
            if source.lower() not in src:
                return False
        if since_dt:
            ts = _parse_iso(it.get("created_at"))
            if ts is None or ts < since_dt:
                return False
        if search:
            q = search.lower()
            hay = (it.get("headline") or "").lower()
            if q not in hay:
                return False
        return True

    filtered = [it for it in items if _match(it)]

    # Compute per-day histogram for UI timeline
    hist: Dict[str, int] = {}
    for it in items:
        ts = _parse_iso(it.get("created_at")) or _parse_iso(it.get("first_seen_at"))
        if ts is None:
            continue
        day = ts.astimezone(timezone.utc).strftime("%Y-%m-%d")
        hist[day] = hist.get(day, 0) + 1

    histogram = [{"date": d, "count": c} for d, c in sorted(hist.items())]

    return {
        "ok": True,
        "total": len(items),
        "filtered": len(filtered),
        "items": filtered[:limit],
        "updated_at": archive.get("updated_at"),
        "refresh_count": archive.get("refresh_count", 0),
        "retention_days": RETENTION_DAYS,
        "refresh_interval_s": REFRESH_INTERVAL_SECONDS,
        "last_new_count": _last_new_count,
        "histogram": histogram,
    }
