# FLO.W — Flow Liquidity & Options Warehouse

## REGLES NON-NEGOCIABLES

### L'utilisateur n'est PAS developpeur
- **Flo n'est pas developpeur.** Il ne sait pas lancer des commandes, redemarrer des serveurs, ni debugger.
- **Tu dois TOUT faire toi-meme** : build, lancement des serveurs, push git, redemarrage apres modification.
- **Apres chaque modification de code** : relancer le backend (`D:\flo-w\server\python main.py`) et le frontend (`D:\flo-w && npm run dev`) automatiquement.
- **Ne jamais dire "lance ca dans un terminal"** — le faire soi-meme.
- **Ne jamais dire "verifie que le serveur tourne"** — le verifier soi-meme.
- **Push git automatiquement** apres chaque commit.

### Pas de donnees bidon
- **INTERDICTION de generer des donnees aleatoires** (`Math.random()`, fake data, simulated data).
- Chaque valeur affichee doit venir d'une **vraie source** : UW API, TWS API, ou Sierra Chart CSV.
- Si une source n'est pas disponible, afficher clairement "Donnees non disponibles" — ne PAS inventer.
- **UW est la source principale** (toujours disponible sans TWS).
- **TWS est un bonus** pour les donnees supplementaires (FX live, Vol Desk collector, dividendes).
- **Sierra Chart** est la source pour les signaux MR et les ranges.

### Securite
- **FLO.W est INFORMATION ONLY** — aucune position, P&L, equity, compte, ordre. JAMAIS.
- TWS en `readonly=True` uniquement.
- "Sierra Chart" ne doit PAS apparaitre dans l'UI → renomme en "Signaux Quantitatifs".
- TICK renomme en "BRI" (Breadth Indicator).

## Architecture

### Stack
- **Frontend** : Next.js 14+ / TypeScript / Tailwind CSS / Recharts (port 3000)
- **Backend** : FastAPI Python (port 3850)
- **Trading** : Sierra Chart (CSV dans `C:\SierraChart\Data\`)
- **Market Data** : Unusual Whales API (token: `da6adf76-f312-4572-acff-e7f99d63c650`)
- **TWS** : Interactive Brokers (`readonly=True`, port 7496, clientId 50)

### Lancement
```
# Backend (fenetre 1)
cd D:\flo-w\server && python main.py

# Frontend (fenetre 2)
cd D:\flo-w && npm run dev

# Ou via le raccourci bureau FLO.W (VBS)
```

### Demarrage serveur (main.py)
- `python main.py` = mode production (pas de reload)
- `python main.py --dev` = mode dev (reload sur .py, exclut .json/.csv/.txt)
- Auto-collecte Vol Desk au demarrage si TWS connecte
- Auto-reconnexion TWS si deconnecte

### Sources de donnees par page
| Page | Source principale | Fallback |
|------|------------------|----------|
| Dashboard | UW + Sierra | — |
| Chain | UW option-contracts + greek-exposure | — |
| Flow | UW flow-alerts + market-tide | — |
| GEX | Sierra SP500GEX | — |
| Dark Pool | UW darkpool + Regime engine | — |
| Signaux | Sierra dashboard (tous CSV) | — |
| Vol Desk | UW iv-rank | TWS vol-regime |
| Vol Monitor | TWS vol-desk-collector | Cache JSON |
| Vol Cone | UW realized-vol | — |
| Heatmap | UW sector-etfs + sector-rotation | — |
| Earnings | UW earnings pre/afterhours | TWS dividendes |
| News | UW economic-calendar | — |
| Central Banks | Donnees statiques + UW calendar | — |
| Range Dashboard | Sierra daily-ranges (CSV col 0-5) | — |
| FX Matrix | UW market-tide | Donnees demo |
| Option Lab | UW iv-rank (spot), tout local (calculs) | — |
| CBOE Tickers | UW iv-rank (charts detail) | — |

### Sierra Chart — Fichiers detectes
Les fichiers BarStudyData dans `C:\SierraChart\Data\` sont lus par index de colonnes (0=Date, 2=Open, 3=High, 4=Low, 5=Last) pour eviter les conflits de colonnes dupliquees.

| Chartbook | Fichiers |
|-----------|----------|
| Equities MetricsV1 | ESM6.CME, NQM6.CME, YMM6.CBOT, RTYM6.CME, USEquities |
| EUREX Metrics | GER30, EUSTX50, Bund, VOLX |
| SP500GEX | SP500GEX, SP500GEX-NQ, SP500GEX-VXX, SP500GEX-SPXS, SP500GEX-TICK |
| Autre | VXX-NQTV, SPXS-NQTV, TICK-NYSE_NASDAQ_NYSEMKT |

### DA (Design)
- Background : `#08080A` / `#0A0A0C`
- Cards : `#111114`
- Borders : `#1E1E22`
- Accent : `#FF6B00` (orange) — utiliser avec parcimonie
- Texte principal : `#F0F0F0` / `#E0E0E5`
- Texte secondaire : `#6B6B75`
- Success : `#22C55E`
- Danger : `#EF4444`
- Font : system default (pas de Google Fonts custom)
- Style : dark fintech pro, sobre, pas de glow ni neon

### Contact
- Fondateur : Flo (Flow78000 sur GitHub)
- Repo : https://github.com/Flow78000/Test
