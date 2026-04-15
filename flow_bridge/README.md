# FLOW Signals Bridge

Pont Python entre **Sierra Chart** et le frontend **Flow** (Next.js).

## Pipeline

```
Sierra Chart (étude ACSIL)
    │  écrit C:\SierraChart\Data\flow_signals.json
    ▼
Bridge Python (ce dossier)   — port 5050
    │  REST + WebSocket
    ▼
Flow React   — http://localhost:3000/signals-flow
```

## Démarrage en 3 étapes

### 1. Installer les dépendances (une seule fois)
```cmd
cd D:\flo-w\flow_bridge
py -3.11 -m pip install -r requirements.txt
```

### 2. Lancer le bridge
Double-clic sur `start-bridge.bat` — ou en ligne de commande :
```cmd
py -3.11 bridge.py
```

Tu dois voir :
```
  FLOW Signals Bridge
  port            : 5050 (host=0.0.0.0)
  signals file    : C:\SierraChart\Data\flow_signals.json
  watcher actif sur C:\SierraChart\Data\flow_signals.json
  Running on http://127.0.0.1:5050
```

### 3. Ouvrir Flow
```
http://localhost:3000/signals-flow
```

## Mode mock (développement sans Sierra)

Si Sierra Chart n'est pas lancé, tu peux activer le mode mock pour voir
l'interface avec des données fictives :

- Depuis l'interface Flow : clique sur le bouton **Toggle Mock**
- Ou via curl : `curl -X POST http://127.0.0.1:5050/api/mock/toggle`

Le mock utilise `mock_signals.json` et pousse un snapshot toutes les 3 secondes.

## Endpoints

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/health` | GET | Statut + timestamp dernière MAJ |
| `/api/signals` | GET | Dernier JSON connu |
| `/api/mock/toggle` | POST | Active/désactive le mode mock |
| `/ws/signals` | WS | Broadcast temps réel des changements |

## Configuration

Par variables d'environnement :

| Variable | Défaut | Description |
|---|---|---|
| `FLOW_SIGNALS_FILE` | `C:\SierraChart\Data\flow_signals.json` | Chemin du fichier watché |
| `FLOW_BRIDGE_PORT` | `5050` | Port d'écoute |
| `FLOW_BRIDGE_HOST` | `0.0.0.0` | Bind address (accès LAN) |

## Accès LAN / Mobile

Le bridge écoute sur `0.0.0.0` → accessible depuis tablette/mobile
sur le même WiFi :

```
http://192.168.X.X:5050/api/health
```

Remplace `192.168.X.X` par l'IP de ton PC (`ipconfig`).

## Structure des fichiers

```
flow_bridge/
  bridge.py              # Serveur Flask + WebSocket
  mock_signals.json      # Données de test
  requirements.txt       # Dépendances Python
  start-bridge.bat       # Lanceur Windows
  SIERRA_ACSIL_GUIDE.md  # Guide pour modifier Sierra Chart
  README.md              # Ce fichier
```

## Modification Sierra Chart

Voir [SIERRA_ACSIL_GUIDE.md](./SIERRA_ACSIL_GUIDE.md) pour la procédure
complète de modification de l'étude SVI existante.

## Dépannage rapide

| Symptôme | Vérifier |
|---|---|
| Bridge ne démarre pas | Port 5050 libre ? `netstat -ano \| findstr 5050` |
| `signals_file_exists: false` | Le fichier JSON existe-t-il ? L'étude Sierra est-elle chargée ? |
| WebSocket se déconnecte | Pare-feu Windows — autoriser `python.exe` en privé |
| Frontend affiche "En attente..." | Toggle Mock pour tester sans Sierra |

---

*Module Signals Flow — v1.0*
