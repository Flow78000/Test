"""
FLO.W - Local secure messaging / journal store

Single-user message store for the internal FLO.W dashboard.
Messages live in a local JSON file, with support for:
  - Channels (trade_ideas, market_notes, journal, watchlist, alerts_review)
  - Tags
  - Pin / important flag
  - Full-text search
  - Simple PIN-based obfuscation for the body (local only)

Since the backend runs on 127.0.0.1 only and the file lives on the user's
disk, encryption is deliberately kept lightweight — the PIN is only a
barrier against casual inspection, not a full cryptographic guarantee.
For real encryption, install the `cryptography` package and swap the
_obfuscate functions for Fernet.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


STORE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "messages_store.json",
)

DEFAULT_CHANNELS = [
    "trade_ideas",
    "market_notes",
    "journal",
    "watchlist",
    "alerts_review",
]


# ---------------------------------------------------------------------------
# Obfuscation (XOR + base64 — light security for local-only storage)
# ---------------------------------------------------------------------------
def _derive_key(pin: str) -> bytes:
    return hashlib.sha256(pin.encode("utf-8")).digest()


def _xor(data: bytes, key: bytes) -> bytes:
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


def _obfuscate(text: str, pin: Optional[str]) -> str:
    if not pin:
        return text
    key = _derive_key(pin)
    enc = _xor(text.encode("utf-8"), key)
    return "enc::" + base64.b64encode(enc).decode("ascii")


def _deobfuscate(text: str, pin: Optional[str]) -> str:
    if not text.startswith("enc::"):
        return text
    if not pin:
        return "[PIN required]"
    try:
        key = _derive_key(pin)
        raw = base64.b64decode(text[5:])
        return _xor(raw, key).decode("utf-8")
    except Exception:
        return "[decrypt failed]"


# ---------------------------------------------------------------------------
# Store persistence
# ---------------------------------------------------------------------------
def _load() -> Dict[str, Any]:
    if not os.path.exists(STORE_PATH):
        return {"messages": [], "locked": False, "channels": DEFAULT_CHANNELS}
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("messages", [])
            data.setdefault("locked", False)
            data.setdefault("channels", DEFAULT_CHANNELS)
            return data
    except Exception:
        return {"messages": [], "locked": False, "channels": DEFAULT_CHANNELS}


def _save(store: Dict[str, Any]) -> None:
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def list_messages(
    channel: Optional[str] = None,
    search: Optional[str] = None,
    pin: Optional[str] = None,
) -> Dict[str, Any]:
    store = _load()
    messages = store.get("messages", [])

    if channel:
        messages = [m for m in messages if m.get("channel") == channel]

    # Deobfuscate body for display
    for m in messages:
        m = m  # reference
        if m.get("encrypted"):
            m["body_display"] = _deobfuscate(m.get("body", ""), pin)
        else:
            m["body_display"] = m.get("body", "")

    if search:
        q = search.lower()
        messages = [
            m for m in messages
            if q in (m.get("title") or "").lower()
            or q in (m.get("body_display") or "").lower()
            or q in " ".join(m.get("tags", [])).lower()
        ]

    # Sort: pinned first, then by timestamp desc
    messages = sorted(
        messages,
        key=lambda m: (not m.get("pinned", False), -m.get("ts", 0)),
    )

    stats: Dict[str, int] = {}
    for m in store.get("messages", []):
        ch = m.get("channel", "other")
        stats[ch] = stats.get(ch, 0) + 1

    return {
        "ok": True,
        "locked": store.get("locked", False),
        "channels": store.get("channels", DEFAULT_CHANNELS),
        "channel_stats": stats,
        "messages": messages,
        "total": len(store.get("messages", [])),
    }


def create_message(
    channel: str,
    title: str,
    body: str,
    tags: Optional[List[str]] = None,
    important: bool = False,
    encrypt: bool = False,
    pin: Optional[str] = None,
) -> Dict[str, Any]:
    store = _load()
    now = datetime.now(timezone.utc)
    msg = {
        "id": str(uuid.uuid4())[:12],
        "channel": channel,
        "title": title,
        "body": _obfuscate(body, pin) if encrypt and pin else body,
        "encrypted": bool(encrypt and pin),
        "tags": tags or [],
        "important": important,
        "pinned": False,
        "ts": int(now.timestamp() * 1000),
        "created_at": now.isoformat(),
    }
    store["messages"].append(msg)
    if channel not in store.get("channels", DEFAULT_CHANNELS):
        store.setdefault("channels", DEFAULT_CHANNELS).append(channel)
    _save(store)
    return {"ok": True, "id": msg["id"]}


def update_message(
    message_id: str,
    pinned: Optional[bool] = None,
    important: Optional[bool] = None,
    tags: Optional[List[str]] = None,
    title: Optional[str] = None,
    body: Optional[str] = None,
) -> Dict[str, Any]:
    store = _load()
    for m in store["messages"]:
        if m["id"] == message_id:
            if pinned is not None:
                m["pinned"] = pinned
            if important is not None:
                m["important"] = important
            if tags is not None:
                m["tags"] = tags
            if title is not None:
                m["title"] = title
            if body is not None and not m.get("encrypted"):
                m["body"] = body
            m["updated_at"] = datetime.now(timezone.utc).isoformat()
            _save(store)
            return {"ok": True}
    return {"ok": False, "error": "Message not found"}


def delete_message(message_id: str) -> Dict[str, Any]:
    store = _load()
    before = len(store["messages"])
    store["messages"] = [m for m in store["messages"] if m["id"] != message_id]
    if len(store["messages"]) == before:
        return {"ok": False, "error": "Message not found"}
    _save(store)
    return {"ok": True}


def set_lock(locked: bool) -> Dict[str, Any]:
    store = _load()
    store["locked"] = locked
    _save(store)
    return {"ok": True, "locked": locked}
