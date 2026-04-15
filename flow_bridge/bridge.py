"""
FLOW Signals Bridge
-------------------
Surveille le fichier JSON ecrit par Sierra Chart et diffuse les signaux
aux clients Flow (React) en temps reel via WebSocket.

Lancement :
    py -3.11 bridge.py
ou (Windows) :
    python bridge.py

Endpoints :
    GET  /api/signals        -> dernier JSON connu
    GET  /api/health         -> statut + timestamp derniere MAJ
    WS   /ws/signals         -> broadcast a chaque changement du fichier
    GET  /api/mock/toggle    -> active/desactive le mode mock (dev sans Sierra)

Port : 5050 (0.0.0.0 donc accessible en LAN WiFi).
"""
from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sock import Sock
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SIGNALS_FILE = Path(os.environ.get(
    "FLOW_SIGNALS_FILE",
    r"C:\SierraChart\Data\flow_signals.json",
))
PORT = int(os.environ.get("FLOW_BRIDGE_PORT", 5050))
HOST = os.environ.get("FLOW_BRIDGE_HOST", "0.0.0.0")
MOCK_FILE = Path(__file__).parent / "mock_signals.json"

# Origines autorisees (Flow en local + LAN)
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3850",
    "http://127.0.0.1:3850",
    # LAN : on laisse tout passer depuis le reseau prive
    "*",
]


# ---------------------------------------------------------------------------
# Etat partage
# ---------------------------------------------------------------------------
class SignalsState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.payload: Dict[str, Any] = {}
        self.last_update: str = ""
        self.source: str = "none"  # "sierra" | "mock" | "none"
        self.mock_enabled: bool = False
        self.clients: Set[Any] = set()  # websocket connections

    def set_payload(self, data: Dict[str, Any], source: str) -> None:
        with self.lock:
            self.payload = data
            self.last_update = datetime.now(timezone.utc).isoformat()
            self.source = source

    def snapshot(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "payload": self.payload,
                "last_update": self.last_update,
                "source": self.source,
                "mock_enabled": self.mock_enabled,
                "clients": len(self.clients),
            }


state = SignalsState()


# ---------------------------------------------------------------------------
# Lecture + diffusion
# ---------------------------------------------------------------------------
def read_signals_file(path: Path) -> Dict[str, Any] | None:
    """Lit le fichier JSON. Retourne None si erreur."""
    if not path.exists():
        return None
    try:
        # Petite attente pour eviter de lire un fichier en cours d'ecriture
        time.sleep(0.05)
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        # Relecture apres 200ms en cas de lecture partielle
        try:
            time.sleep(0.2)
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None


def broadcast_to_websockets(data: Dict[str, Any]) -> None:
    """Envoie les donnees a tous les clients WebSocket connectes."""
    message = json.dumps({
        "type": "signals_update",
        "data": data,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    dead: List[Any] = []
    with state.lock:
        clients = list(state.clients)
    for ws in clients:
        try:
            ws.send(message)
        except Exception:
            dead.append(ws)
    if dead:
        with state.lock:
            for ws in dead:
                state.clients.discard(ws)


def handle_new_signals(data: Dict[str, Any], source: str) -> None:
    state.set_payload(data, source)
    broadcast_to_websockets(data)
    print(f"  [bridge] signals mis a jour (source={source}) -> {len(state.clients)} clients")


# ---------------------------------------------------------------------------
# Watcher du fichier Sierra
# ---------------------------------------------------------------------------
class SierraFileHandler(FileSystemEventHandler):
    def __init__(self, target: Path) -> None:
        super().__init__()
        self.target = target.resolve()

    def _maybe_reload(self, changed_path: str) -> None:
        try:
            if Path(changed_path).resolve() != self.target:
                return
        except Exception:
            return
        if state.mock_enabled:
            return
        data = read_signals_file(self.target)
        if data is not None:
            handle_new_signals(data, source="sierra")

    def on_modified(self, event):
        if not event.is_directory:
            self._maybe_reload(event.src_path)

    def on_created(self, event):
        if not event.is_directory:
            self._maybe_reload(event.src_path)

    def on_moved(self, event):
        # Ecriture atomique : flow_signals.tmp -> flow_signals.json
        if not event.is_directory:
            self._maybe_reload(event.dest_path)


def start_watcher() -> Observer | None:
    if not SIGNALS_FILE.parent.exists():
        print(f"  [bridge] !! Dossier introuvable : {SIGNALS_FILE.parent}")
        return None
    handler = SierraFileHandler(SIGNALS_FILE)
    observer = Observer()
    observer.schedule(handler, str(SIGNALS_FILE.parent), recursive=False)
    observer.start()
    print(f"  [bridge] watcher actif sur {SIGNALS_FILE}")
    # Premier chargement si le fichier existe deja
    data = read_signals_file(SIGNALS_FILE)
    if data is not None:
        handle_new_signals(data, source="sierra")
    return observer


# ---------------------------------------------------------------------------
# Mock loop (pour dev sans Sierra)
# ---------------------------------------------------------------------------
def mock_loop() -> None:
    """Charge le mock toutes les 3 secondes quand le mode mock est actif."""
    while True:
        time.sleep(3)
        if not state.mock_enabled:
            continue
        if not MOCK_FILE.exists():
            continue
        try:
            with MOCK_FILE.open("r", encoding="utf-8") as f:
                data = json.load(f)
            # Rafraichir le timestamp pour simuler du temps reel
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
            handle_new_signals(data, source="mock")
        except Exception as e:
            print(f"  [bridge] !! erreur mock : {e}")


# ---------------------------------------------------------------------------
# Flask app + routes
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS, supports_credentials=False)
sock = Sock(app)


@app.route("/api/signals", methods=["GET"])
def get_signals():
    snap = state.snapshot()
    return jsonify({
        "ok": True,
        "data": snap["payload"],
        "last_update": snap["last_update"],
        "source": snap["source"],
    })


@app.route("/api/health", methods=["GET"])
def get_health():
    snap = state.snapshot()
    return jsonify({
        "ok": True,
        "bridge_version": "1.0",
        "signals_file": str(SIGNALS_FILE),
        "signals_file_exists": SIGNALS_FILE.exists(),
        "last_update": snap["last_update"],
        "source": snap["source"],
        "mock_enabled": snap["mock_enabled"],
        "ws_clients": snap["clients"],
        "server_time": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/api/mock/toggle", methods=["GET", "POST"])
def toggle_mock():
    """Active/desactive le mode mock. Pratique en dev sans Sierra."""
    with state.lock:
        state.mock_enabled = not state.mock_enabled
        enabled = state.mock_enabled
    if enabled and MOCK_FILE.exists():
        # Push immediat
        with MOCK_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        handle_new_signals(data, source="mock")
    return jsonify({"ok": True, "mock_enabled": enabled})


@sock.route("/ws/signals")
def ws_signals(ws):
    """Client WebSocket : envoi du snapshot actuel + diffusion des MAJ."""
    with state.lock:
        state.clients.add(ws)
    print(f"  [bridge] +WS client ({len(state.clients)} total)")
    try:
        # Push initial
        snap = state.snapshot()
        ws.send(json.dumps({
            "type": "signals_init",
            "data": snap["payload"],
            "last_update": snap["last_update"],
            "source": snap["source"],
        }))
        # Boucle : on attend les pings/pongs du client (keep-alive)
        while True:
            msg = ws.receive(timeout=30)
            if msg is None:
                continue
            # Repondre au ping applicatif
            if msg == "ping":
                ws.send("pong")
    except Exception:
        pass
    finally:
        with state.lock:
            state.clients.discard(ws)
        print(f"  [bridge] -WS client ({len(state.clients)} total)")


# ---------------------------------------------------------------------------
# Entree principale
# ---------------------------------------------------------------------------
def main() -> None:
    print("=" * 64)
    print("  FLOW Signals Bridge")
    print("=" * 64)
    print(f"  port            : {PORT} (host={HOST})")
    print(f"  signals file    : {SIGNALS_FILE}")
    print(f"  mock file       : {MOCK_FILE} (exists={MOCK_FILE.exists()})")
    print(f"  CORS origins    : {', '.join(CORS_ORIGINS)}")
    print()

    observer = start_watcher()

    # Thread mock
    t = threading.Thread(target=mock_loop, daemon=True, name="mock-loop")
    t.start()

    try:
        # use_reloader=False : evite le double-run des threads sous Flask debug
        app.run(host=HOST, port=PORT, debug=False, use_reloader=False, threaded=True)
    finally:
        if observer is not None:
            observer.stop()
            observer.join()


if __name__ == "__main__":
    main()
