# FLOW — Trading Signals Module
## Brief complet pour Claude Code

---

> **À lire en premier.** Ce document est le contexte de travail principal pour toute session Claude Code sur le module **Signals** de Flow. Ne pas coder sans avoir lu intégralement jusqu'à la section "Phase de travail."

---

## 1. Contexte projet

**Flow** est un tableau de bord de trading propriétaire développé pour un usage interne. Il centralise des signaux, des métriques de volatilité et des outils d'analyse de range multi-actifs. L'utilisateur final est un trader professionnel, non développeur.

**Stack supposée** (à confirmer/adapter en début de session) :
- Frontend : React + TypeScript + Tailwind CSS
- Backend bridge : Python (Flask) — cohérent avec l'existant du projet (vol desk Flask déjà en place)
- Source de données : Sierra Chart (logiciel de trading installé localement sous Windows)
- Transport : fichiers JSON locaux + WebSocket local (LAN WiFi)

---

## 2. Objectif du module Signals

Récupérer des signaux calculés dans **Sierra Chart** et les afficher en temps réel dans Flow.

### 2.1 — Signaux prioritaires (V1)

#### Signal A : Volatilité Synthétique (SVI — Synthetic Volatility Index)
Approche propriétaire. Le signal est déjà calculé dans Sierra Chart via une étude ACSIL custom.

**Logique de calcul (pour référence, ne pas recalculer côté Flow)** :
- Calcul du range moyen sur 6 périodes : **7, 20, 50, 100, 200 et 500 jours**
- Moyenne générale des 6 périodes = **Range Moyen Composite (RMC)**
- Ce RMC est la base de pricing : il représente le potentiel d'extension "propre" de l'actif, sans distorsion des événements extrêmes

**Ce que Flow doit afficher** :
- Valeur brute du RMC (en points/ticks selon l'actif)
- Pourcentage du range journalier actuel vs RMC (ex : "43.95%" comme visible sur les charts)
- Indicateur de niveau : sous 75% (range faible), 75–125% (normal), >125% (extension)

#### Signal B : Niveaux de Range Daily & Hebdomadaire
Zones calculées à partir du RMC, projetées depuis l'open.

**Structure des niveaux** (visible sur Image 1 — chart ES 1 min) :
- Niveaux symétriques depuis l'open : ±25%, ±50%, ±75%, ±100%, ±125%, ±150%, ±175%, ±200%
- Ces niveaux s'affichent comme des "marches" qui évoluent en temps réel
- Chaque niveau a un prix associé (ex : 5329.50 @ 200%, 5314.43 @ -50%, etc.)
- Les niveaux se mettent à jour à chaque nouvelle bougie

**Ce que Flow doit afficher** :
- Tableau des niveaux actifs (prix + % du range)
- Niveau actuel du prix par rapport à ces zones
- Highlight du niveau le plus proche

#### Signal C : Tableau Multi-Actifs (Range Heatmap)
Tableau de données représentant pour chaque actif et chaque jour la **position relative du range journalier vs range moyen** (voir Image 3).

**Actifs couverts** (liste visible sur Image 3) :
- FX : EURUSD, GBPUSD, JPYUSD, AUDUSD, NZDUSD, USDCAD, USDCHF, EURGBP
- Taux : 10YYIELD, 2Y ZN, 5Y ZN, 10Y ZN, U10Y TN, U30Y UB, 30Y ZB
- Commodités : GOLD GC, SILVER SI, COPPER HG, CRUDE CL, NATGAS NG
- Indices : SP500 ES, NASDAQ NQ, RUSSELL RTY, DOWJONES YM, NIKKEI NKD, SP400 EMD
- Agri : CORN ZC, SOY OIL ZL, SOY MEAL ZM, SOYBEAN ZS, WHEAT ZW

**Ce que Flow doit afficher** :
- Grille colorée (heatmap) : vert = range > moyenne, rouge = range < moyenne, jaune = neutre
- La valeur % affiché dans chaque cellule
- Possibilité de filtrer par famille d'actifs
- Lecture des patterns : ex. journée où tous les actifs montrent >150% = journée de vol extrême

---

## 3. Architecture technique — Pipeline de données

```
┌─────────────────────────────────────────────────────────────┐
│                     SIERRA CHART (Windows)                   │
│                                                              │
│  Études ACSIL custom → calculent SVI + niveaux de range     │
│                    ↓                                         │
│  Écriture fichier JSON local toutes les Xs                   │
│  C:\SierraChart\Data\flow_signals.json                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ lecture fichier
┌──────────────────────────▼──────────────────────────────────┐
│              PYTHON BRIDGE (Flask + WebSocket)               │
│              port 5050 — accessible LAN WiFi                 │
│                                                              │
│  - Watch du fichier JSON (watchdog)                         │
│  - REST endpoint  GET /api/signals                          │
│  - WebSocket      ws://localhost:5050/ws/signals            │
│  - Broadcast dès que le fichier change                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket / REST
┌──────────────────────────▼──────────────────────────────────┐
│                    FLOW FRONTEND (React)                     │
│                                                              │
│  - Hook useSignals() — connexion WebSocket auto-reconnect   │
│  - Composant <SVI /> — volatilité synthétique               │
│  - Composant <RangeLevels /> — tableau niveaux              │
│  - Composant <RangeHeatmap /> — grille multi-actifs         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Format du fichier JSON produit par Sierra Chart

Sierra Chart doit écrire ce fichier. L'étude ACSIL existante doit être modifiée pour produire ce format. C'est la **seule modification à faire dans Sierra Chart**.

```json
{
  "timestamp": "2024-08-20T17:01:49Z",
  "session_date": "2024-08-20",

  "svi": {
    "ES": {
      "rmc": 70.79,
      "current_range": 30.25,
      "pct_of_rmc": 42.74,
      "level": "low"
    },
    "NQ": { ... },
    "GC": { ... }
  },

  "range_levels": {
    "ES": {
      "open": 5290.00,
      "current_price": 5329.50,
      "rmc": 70.79,
      "levels": [
        { "pct": 200,  "price": 5430.58, "side": "up" },
        { "pct": 175,  "price": 5413.88, "side": "up" },
        { "pct": 150,  "price": 5396.19, "side": "up" },
        { "pct": 125,  "price": 5378.49, "side": "up" },
        { "pct": 100,  "price": 5360.79, "side": "up" },
        { "pct": 75,   "price": 5343.09, "side": "up" },
        { "pct": 50,   "price": 5325.40, "side": "up" },
        { "pct": 25,   "price": 5307.70, "side": "up" },
        { "pct": -25,  "price": 5272.30, "side": "down" },
        { "pct": -50,  "price": 5254.60, "side": "down" },
        { "pct": -75,  "price": 5236.91, "side": "down" },
        { "pct": -100, "price": 5219.21, "side": "down" },
        { "pct": -125, "price": 5201.51, "side": "down" },
        { "pct": -150, "price": 5183.82, "side": "down" },
        { "pct": -175, "price": 5166.12, "side": "down" },
        { "pct": -200, "price": 5148.42, "side": "down" }
      ]
    }
  },

  "range_heatmap": {
    "date": "2024-08-20",
    "assets": [
      { "symbol": "ES",     "family": "indices",     "pct_vs_rmc": 43.95,  "range_pts": 30.25, "rmc": 70.79 },
      { "symbol": "NQ",     "family": "indices",     "pct_vs_rmc": 57.12,  "range_pts": 185.0, "rmc": 324.0 },
      { "symbol": "GC",     "family": "commodities", "pct_vs_rmc": 86.61,  "range_pts": 18.5,  "rmc": 21.36 },
      { "symbol": "EURUSD", "family": "fx",          "pct_vs_rmc": 72.3,   "range_pts": 0.0065,"rmc": 0.0090 }
    ]
  }
}
```

---

## 5. Structure des composants React à créer

### 5.1 Hook `useSignals()`
```
hooks/useSignals.ts
- Connexion WebSocket à ws://localhost:5050/ws/signals
- Auto-reconnect toutes les 3s si déconnexion
- Fallback REST polling toutes les 5s si WebSocket indispo
- Expose : { signals, isConnected, lastUpdate, error }
```

### 5.2 Composant `<SVICard />`
```
components/signals/SVICard.tsx
- Props : asset: string, sviData: SVIData
- Affiche : % actuel du range vs RMC + jauge visuelle
- Couleur : rouge (<50%), orange (50-75%), vert (75-125%), violet (>125%)
- Mise à jour temps réel via hook
```

### 5.3 Composant `<RangeLevels />`
```
components/signals/RangeLevels.tsx
- Props : asset: string, levelsData: RangeLevelsData
- Affiche un "ruler" vertical avec les 16 niveaux
- Highlight du niveau actuel + flèche position prix
- Fond coloré selon zone (vert au-dessus open, rouge en-dessous)
```

### 5.4 Composant `<RangeHeatmap />`
```
components/signals/RangeHeatmap.tsx
- Props : heatmapData: HeatmapData, filter?: FamilyFilter
- Grille multi-actifs : colonnes = actifs, ligne = valeur + couleur
- Couleurs : rouge (#c0392b) si <75%, jaune (#f39c12) si 75-100%, vert (#27ae60) si 100-150%, violet (#8e44ad) si >150%
- Clic sur cellule = drill-down avec détail des niveaux de range de l'actif
- Filtre par famille : FX / Indices / Commodités / Taux / Agri
```

---

## 6. Python Bridge — bridge.py

### Fichier : `flow_bridge/bridge.py`

```python
# Dépendances : flask, flask-sock, watchdog
# Lancer avec : py -3.11 bridge.py
# Port : 5050
# Accessible LAN : 0.0.0.0 (donc http://192.168.x.x:5050 depuis autre appareil)

# Fonctionnalités :
# - Surveille C:\SierraChart\Data\flow_signals.json
# - Dès que le fichier est modifié, broadcast aux clients WebSocket connectés
# - REST endpoint GET /api/signals retourne le dernier JSON connu
# - REST endpoint GET /api/health retourne statut + timestamp dernière MAJ
# - CORS activé pour le frontend React local
```

### Fichier : `flow_bridge/requirements.txt`
```
flask>=3.0
flask-sock>=0.7
watchdog>=4.0
flask-cors>=4.0
```

---

## 7. Modification Sierra Chart (ACSIL)

### Fichier cible : étude existante SVI (déjà codée en C++)

**Modification à ajouter** : à chaque calcul de la bougie courante, écrire le fichier JSON.

```cpp
// À ajouter dans la fonction sc.SetDefaults ou dans la boucle principale :
// Chemin hardcodé : C:\SierraChart\Data\flow_signals.json
// Format : le JSON décrit en section 4
// Fréquence : à chaque nouvelle bougie 1-min (ou sur tick selon perf)
// Utiliser fprintf sur FILE* — éviter fopen/fclose en boucle, 
// ouvrir en début de calcul, fermer en fin

// Astuce : écrire d'abord dans flow_signals.tmp puis renommer en flow_signals.json
// pour éviter une lecture partielle par le bridge Python
```

**Variables à exposer depuis l'étude existante** :
- `sc.Subgraph[0]` → RMC (Range Moyen Composite)
- `sc.Subgraph[1]` → % range actuel / RMC
- Pour les niveaux : calculer `open + (RMC * pct / 100)` pour chaque %

---

## 8. Phases de travail — ordre d'exécution

### PHASE 1 — Bridge Python (1-2h)
1. Créer `flow_bridge/bridge.py` avec le watcher + WebSocket + REST
2. Tester avec un fichier JSON statique mockant `flow_signals.json`
3. Valider connexion depuis navigateur (WebSocket test)

### PHASE 2 — Frontend hooks & types (1h)
1. Définir tous les types TypeScript (`SVIData`, `RangeLevelsData`, `HeatmapData`)
2. Créer `useSignals()` avec mock data en fallback si bridge non connecté
3. Tester la reconnexion automatique

### PHASE 3 — Composant SVICard (1h)
1. `<SVICard />` avec les 4 états de couleur
2. Jauge animée CSS
3. Intégration dans page principale Flow

### PHASE 4 — Composant RangeLevels (2h)
1. "Ruler" vertical avec les 16 niveaux
2. Position prix actuel en temps réel
3. Scroll automatique pour garder le prix visible

### PHASE 5 — Composant RangeHeatmap (2-3h)
1. Grille colorée statique d'abord (mock data)
2. Filtre par famille d'actifs
3. Drill-down clic → détail actif
4. Connexion données réelles

### PHASE 6 — Modification ACSIL Sierra Chart (1-2h)
1. Ouvrir l'étude SVI existante dans Sierra Chart IDE
2. Ajouter la fonction d'écriture JSON
3. Tester l'écriture du fichier
4. Valider le bridge Python lit bien les données

---

## 9. Contraintes techniques importantes

| Contrainte | Détail |
|---|---|
| Python | Utiliser `py -3.11` dans tous les scripts/commandes |
| PowerShell | Ne jamais chaîner avec `&&` — entrer les commandes séparément |
| Sierra Chart port | `7496` (TWS déjà configuré — ne pas utiliser ce port pour le bridge) |
| Bridge port | `5050` (vérifier qu'il est libre) |
| Accès LAN | Le Flask bridge doit écouter sur `0.0.0.0` pour accès depuis tablet/mobile |
| Windows paths | Utiliser des raw strings Python `r"C:\SierraChart\Data\..."` |
| Pas de `site:` dans recherches | N/A ici |
| Format fichier Sierra | Écriture atomique via `.tmp` → rename pour éviter race condition |

---

## 10. Ce que Flow N'a PAS à faire (hors scope V1)

- Recalculer le RMC côté Flow (Sierra Chart le fait déjà)
- Stocker un historique des signaux (V2)
- Envoyer des alertes push/SMS (V2)
- Gérer plusieurs sessions simultanées multi-utilisateur
- Se connecter directement à un broker ou à une API de marché

---

## 11. Données de test (mock)

Si Sierra Chart n'est pas disponible pendant le développement, utiliser ce mock :

```json
{
  "timestamp": "2024-08-20T17:01:49Z",
  "session_date": "2024-08-20",
  "svi": {
    "ES": { "rmc": 70.79, "current_range": 30.25, "pct_of_rmc": 42.74, "level": "low" },
    "NQ": { "rmc": 324.50, "current_range": 185.00, "pct_of_rmc": 57.01, "level": "low" },
    "GC": { "rmc": 21.36, "current_range": 18.50, "pct_of_rmc": 86.61, "level": "normal" },
    "CL": { "rmc": 1.85, "current_range": 2.20, "pct_of_rmc": 118.92, "level": "normal" }
  },
  "range_levels": {
    "ES": {
      "open": 5290.00,
      "current_price": 5329.50,
      "rmc": 70.79,
      "levels": [
        {"pct": 200, "price": 5431.58, "side": "up"},
        {"pct": 175, "price": 5413.88, "side": "up"},
        {"pct": 150, "price": 5396.19, "side": "up"},
        {"pct": 125, "price": 5378.49, "side": "up"},
        {"pct": 100, "price": 5360.79, "side": "up"},
        {"pct": 75,  "price": 5343.09, "side": "up"},
        {"pct": 50,  "price": 5325.40, "side": "up"},
        {"pct": 25,  "price": 5307.70, "side": "up"},
        {"pct": -25, "price": 5272.30, "side": "down"},
        {"pct": -50, "price": 5254.60, "side": "down"},
        {"pct": -75, "price": 5236.91, "side": "down"},
        {"pct": -100,"price": 5219.21, "side": "down"},
        {"pct": -125,"price": 5201.51, "side": "down"},
        {"pct": -150,"price": 5183.82, "side": "down"},
        {"pct": -175,"price": 5166.12, "side": "down"},
        {"pct": -200,"price": 5148.42, "side": "down"}
      ]
    }
  },
  "range_heatmap": {
    "date": "2024-08-20",
    "assets": [
      {"symbol":"ES",     "family":"indices",    "pct_vs_rmc":43.95, "range_pts":30.25, "rmc":70.79},
      {"symbol":"NQ",     "family":"indices",    "pct_vs_rmc":57.01, "range_pts":185.0, "rmc":324.5},
      {"symbol":"RTY",    "family":"indices",    "pct_vs_rmc":78.24, "range_pts":12.5,  "rmc":15.97},
      {"symbol":"YM",     "family":"indices",    "pct_vs_rmc":62.11, "range_pts":180.0, "rmc":289.8},
      {"symbol":"GC",     "family":"commodities","pct_vs_rmc":86.61, "range_pts":18.5,  "rmc":21.36},
      {"symbol":"SI",     "family":"commodities","pct_vs_rmc":103.4, "range_pts":0.55,  "rmc":0.532},
      {"symbol":"CL",     "family":"commodities","pct_vs_rmc":118.9, "range_pts":2.20,  "rmc":1.85},
      {"symbol":"NG",     "family":"commodities","pct_vs_rmc":65.3,  "range_pts":0.08,  "rmc":0.122},
      {"symbol":"EURUSD", "family":"fx",         "pct_vs_rmc":72.3,  "range_pts":65,    "rmc":90},
      {"symbol":"GBPUSD", "family":"fx",         "pct_vs_rmc":88.1,  "range_pts":95,    "rmc":108},
      {"symbol":"ZN",     "family":"rates",      "pct_vs_rmc":110.5, "range_pts":0.22,  "rmc":0.199},
      {"symbol":"ZB",     "family":"rates",      "pct_vs_rmc":97.2,  "range_pts":1.08,  "rmc":1.11}
    ]
  }
}
```

---

## 12. Questions à poser à l'utilisateur en début de session

Avant de coder, demander :

1. **Quelle est la structure actuelle du projet Flow ?** (`ls` à la racine du repo)
2. **Le bridge Python Flask vol desk est-il déjà dans le même repo ou séparé ?**
3. **Quel est le chemin exact de Sierra Chart sur le PC ?** (défaut : `C:\SierraChart`)
4. **Le nom de l'étude ACSIL SVI existante ?** (pour savoir quel fichier `.cpp` modifier)
5. **Flow tourne sur quel port actuellement ?** (pour configurer les CORS du bridge)

---

*Document version 1.0 — Module Signals Flow — Juillet 2024*
*Auteur : Florian Auffray / Phidias PropFirm*
