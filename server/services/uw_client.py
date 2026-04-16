"""
Centralised Unusual Whales HTTP client.

Replaces the per-call `subprocess.run(curl, ...)` pattern with a single
pooled `requests.Session` + in-memory TTL cache + central usage tracking.

Wins:
- Connection pooling: 10-50x faster than spawning a curl process per call
- TTL cache: identical endpoints hit within `ttl` seconds skip the network entirely
- Single chokepoint for usage tracking (the X-UW-Daily-Req-Count header is
  recorded for every call regardless of which service made it)

Public API:
    uw_get(endpoint: str, ttl: int | None = None) -> Any
        Returns the parsed JSON body, or a small error dict shaped
        {"error": "...", "endpoint": "..."} on failure. Caches successful
        responses for `ttl` seconds (default = endpoint-aware lookup via
        DEFAULT_TTLS).

    cache_stats() -> dict
        Inspection helper: returns size, hits, misses, evictions, etc.

    invalidate(prefix: str | None = None) -> int
        Drops cached entries whose key starts with `prefix`. Returns count.
"""
from __future__ import annotations

import os
import time
import threading
from typing import Any, Dict, Optional, Tuple

import requests
from requests.adapters import HTTPAdapter

try:
    # Optional: use the existing usage tracker so the dashboard counter keeps working
    from services.uw_usage import record_request  # type: ignore
except Exception:  # pragma: no cover - tracker is optional
    def record_request(_count_header: Optional[str], _error_code: Optional[str]) -> None:
        return


UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")
UW_BASE = "https://api.unusualwhales.com/api"
DEFAULT_TIMEOUT = 15  # seconds


# ─── TTL policy per endpoint pattern ──────────────────────────────────────────
# Longer TTL = fewer UW calls = faster pages. Tune by data volatility.
# Order matters: first prefix match wins.
DEFAULT_TTLS: Tuple[Tuple[str, int], ...] = (
    # Live / fast-moving: keep short
    ("/darkpool/", 30),
    ("/darkpool-alerts", 30),
    ("/option-trades/flow-alerts", 20),
    ("/stock/SPY/iv-rank", 20),       # spot via iv-rank — needs to feel fresh
    ("/stock/QQQ/iv-rank", 20),
    ("/stock/IWM/iv-rank", 20),
    ("/stock/VIX/iv-rank", 30),
    ("/stock/", 60),                   # generic per-ticker (greek-exposure, etc.)
    # Heavier / less volatile
    ("/option-contracts", 90),         # full chain — large payload, slow on UW side
    ("/greek-exposure", 60),
    # Default
    ("__default__", 45),
)


def _ttl_for(endpoint: str) -> int:
    for prefix, ttl in DEFAULT_TTLS:
        if prefix == "__default__":
            continue
        if prefix in endpoint:
            return ttl
    return next((ttl for prefix, ttl in DEFAULT_TTLS if prefix == "__default__"), 45)


# ─── Session (pool of keep-alive connections) ─────────────────────────────────
_session: requests.Session | None = None
_session_lock = threading.Lock()


def _get_session() -> requests.Session:
    global _session
    if _session is None:
        with _session_lock:
            if _session is None:
                s = requests.Session()
                # Pool size matches typical concurrency on the dashboard
                adapter = HTTPAdapter(pool_connections=20, pool_maxsize=40, max_retries=0)
                s.mount("https://", adapter)
                s.mount("http://", adapter)
                s.headers.update({
                    "Authorization": f"Bearer {UW_TOKEN}",
                    "Accept": "application/json",
                    "User-Agent": "flo-w/1.0 (+pooled)",
                })
                _session = s
    return _session


# ─── In-memory TTL cache ──────────────────────────────────────────────────────
_cache: Dict[str, Tuple[float, Any]] = {}
_cache_lock = threading.Lock()
_stats = {"hits": 0, "misses": 0, "stores": 0, "evictions": 0, "errors": 0}


def _cache_get(key: str) -> Optional[Any]:
    with _cache_lock:
        item = _cache.get(key)
        if not item:
            _stats["misses"] += 1
            return None
        expires_at, value = item
        if time.time() > expires_at:
            _cache.pop(key, None)
            _stats["evictions"] += 1
            _stats["misses"] += 1
            return None
        _stats["hits"] += 1
        return value


def _cache_put(key: str, value: Any, ttl: int) -> None:
    with _cache_lock:
        _cache[key] = (time.time() + ttl, value)
        _stats["stores"] += 1


def invalidate(prefix: Optional[str] = None) -> int:
    """Drop entries whose key starts with `prefix` (or all if None)."""
    with _cache_lock:
        if prefix is None:
            n = len(_cache)
            _cache.clear()
            return n
        keys = [k for k in _cache if k.startswith(prefix)]
        for k in keys:
            _cache.pop(k, None)
        return len(keys)


def cache_stats() -> Dict[str, Any]:
    with _cache_lock:
        return {
            "size": len(_cache),
            **_stats,
            "hit_ratio": (
                _stats["hits"] / (_stats["hits"] + _stats["misses"])
                if (_stats["hits"] + _stats["misses"]) > 0 else 0
            ),
        }


# ─── Core fetch ───────────────────────────────────────────────────────────────
def uw_get(endpoint: str, ttl: Optional[int] = None) -> Any:
    """Fetch from UW API with pooled session + TTL cache + usage tracking.

    Returns the parsed JSON, or {"error": "...", "endpoint": "..."} on failure.
    `ttl` overrides the per-endpoint default; pass 0 to bypass the cache.
    """
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
    cache_key = endpoint  # no per-user keys, all calls share

    if ttl is None:
        ttl = _ttl_for(endpoint)

    if ttl > 0:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    session = _get_session()
    url = UW_BASE + endpoint
    try:
        resp = session.get(url, timeout=DEFAULT_TIMEOUT)
    except requests.Timeout:
        _stats["errors"] += 1
        return {"error": f"UW API timeout ({DEFAULT_TIMEOUT}s)", "endpoint": endpoint}
    except requests.RequestException as e:
        _stats["errors"] += 1
        return {"error": str(e), "endpoint": endpoint}

    # Pull the daily request count header (lower-case header keys are fine in requests)
    count_header = resp.headers.get("x-uw-daily-req-count") or resp.headers.get("X-UW-Daily-Req-Count")

    parsed: Any = None
    body = (resp.text or "").strip()
    if body:
        try:
            parsed = resp.json()
        except ValueError:
            parsed = None

    error_code = None
    if isinstance(parsed, dict) and "code" in parsed and "data" not in parsed:
        error_code = parsed.get("code")

    # Track usage (best-effort, never blocks)
    try:
        record_request(count_header, error_code)
    except Exception:
        pass

    # Build the return payload
    if parsed is not None:
        result = parsed
    elif body:
        result = {"error": "Invalid JSON from UW", "endpoint": endpoint, "status": resp.status_code}
    else:
        result = {"error": "Empty response from UW API", "endpoint": endpoint, "status": resp.status_code}

    # Cache only successful responses (no error envelope, no HTTP error)
    is_success = (
        ttl > 0
        and resp.status_code == 200
        and error_code is None
        and not (isinstance(result, dict) and "error" in result)
    )
    if is_success:
        _cache_put(cache_key, result, ttl)

    return result
