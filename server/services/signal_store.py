"""
FLO.W — Signal Persistence Store
Sauvegarde les signaux Sierra détectés en base JSON permanente.
Sierra peut supprimer l'historique ancien — ce store le conserve à vie.
Collecte automatique à chaque appel /api/sierra/signals.
"""
import os
import json
import time
from datetime import datetime, timezone

STORE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "signal_history.json")
MAX_SIGNALS_PER_SYMBOL = 5000  # Garde les 5000 derniers par symbole


def _load_store():
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"signals": {}, "stats": {"total_collected": 0, "last_collection": None}}


def _save_store(store):
    try:
        with open(STORE_FILE, "w") as f:
            json.dump(store, f, indent=1)
    except Exception as e:
        print(f"[SignalStore] Erreur sauvegarde: {e}")


def _signal_key(signal):
    """Clé unique pour dédupliquer: symbol + date + time + level + direction"""
    return f"{signal.get('symbol', '')}|{signal.get('date', '')}|{signal.get('time', '')}|{signal.get('level', '')}|{signal.get('direction', '')}"


def collect_signals(signals, symbol):
    """Ajoute de nouveaux signaux au store, déduplique automatiquement.
    Retourne le nombre de nouveaux signaux ajoutés."""
    if not signals:
        return 0

    store = _load_store()

    if symbol not in store["signals"]:
        store["signals"][symbol] = []

    # Construire un set des clés existantes pour déduplication rapide
    existing_keys = set()
    for s in store["signals"][symbol]:
        existing_keys.add(_signal_key(s))

    new_count = 0
    for sig in signals:
        key = _signal_key(sig)
        if key not in existing_keys:
            # Ajouter timestamp de collection
            sig["_collected_at"] = datetime.now(timezone.utc).isoformat()
            store["signals"][symbol].append(sig)
            existing_keys.add(key)
            new_count += 1

    # Tronquer si trop de signaux (garder les plus récents)
    if len(store["signals"][symbol]) > MAX_SIGNALS_PER_SYMBOL:
        store["signals"][symbol] = store["signals"][symbol][-MAX_SIGNALS_PER_SYMBOL:]

    # Mettre à jour les stats
    store["stats"]["total_collected"] = store["stats"].get("total_collected", 0) + new_count
    store["stats"]["last_collection"] = datetime.now(timezone.utc).isoformat()

    if new_count > 0:
        _save_store(store)

    return new_count


def get_stored_signals(symbol=None, days=None, min_strength=0):
    """Récupère les signaux stockés avec filtres optionnels."""
    store = _load_store()

    if symbol:
        signals = store["signals"].get(symbol, [])
    else:
        # Tous les symboles
        signals = []
        for sym_signals in store["signals"].values():
            signals.extend(sym_signals)

    # Filtre par force minimum
    if min_strength > 0:
        signals = [s for s in signals if s.get("strength", 0) >= min_strength]

    # Filtre par nombre de jours
    if days:
        cutoff = time.time() - (days * 86400)
        filtered = []
        for s in signals:
            collected = s.get("_collected_at", "")
            if collected:
                try:
                    dt = datetime.fromisoformat(collected.replace("Z", "+00:00"))
                    if dt.timestamp() >= cutoff:
                        filtered.append(s)
                except Exception:
                    filtered.append(s)  # En cas de doute, garder
            else:
                filtered.append(s)
        signals = filtered

    # Trier par date/time décroissant
    signals.sort(key=lambda s: (s.get("date", ""), s.get("time", "")), reverse=True)

    return {
        "signals": signals,
        "count": len(signals),
        "symbols": list(store["signals"].keys()),
        "stats": store["stats"],
    }


def get_store_summary():
    """Résumé du store: nb signaux par symbole, dates min/max, stats."""
    store = _load_store()
    summary = {}

    for symbol, signals in store["signals"].items():
        if not signals:
            continue
        dates = [s.get("date", "") for s in signals if s.get("date")]
        strengths = [s.get("strength", 0) for s in signals]
        summary[symbol] = {
            "count": len(signals),
            "date_min": min(dates) if dates else None,
            "date_max": max(dates) if dates else None,
            "avg_strength": round(sum(strengths) / len(strengths), 1) if strengths else 0,
            "by_direction": {
                "LONG": sum(1 for s in signals if s.get("direction") == "LONG"),
                "SHORT": sum(1 for s in signals if s.get("direction") == "SHORT"),
            },
            "by_strength": {
                "EXTREME": sum(1 for s in signals if s.get("strength", 0) >= 4),
                "TRES_FORT": sum(1 for s in signals if s.get("strength", 0) == 3),
                "FORT": sum(1 for s in signals if s.get("strength", 0) == 2),
                "STANDARD": sum(1 for s in signals if s.get("strength", 0) == 1),
                "FAIBLE": sum(1 for s in signals if s.get("strength", 0) == 0),
            }
        }

    return {
        "symbols": summary,
        "total_signals": sum(s["count"] for s in summary.values()),
        "stats": store["stats"],
    }
