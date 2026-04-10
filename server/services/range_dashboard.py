"""
FLO.W — Range Dashboard Reader
Lit le fichier Sierra Chart "RangeDash-BarStudyData" qui contient
le tableau de bord des ranges agrege sur tous les actifs suivis.

Sierra Chart produit ce fichier en activant sur le chart Range Dashboard
"Write Bar and Study Data to File". Le DLL custom RangeDashboard_CustomStudy_64
ecrit les subgraphs (un par actif) dans des colonnes du CSV/TXT.

Si le fichier n'existe pas encore, on renvoie un fallback base sur les fichiers
RangeWeek existants (ESM6, NQM6, YMM6, RTYM6, Bund, GER30...).
"""
import os
import time
from datetime import datetime, timezone

SIERRA_DATA_DIR = r"C:\SierraChart\Data"

# Candidats de noms de fichiers (Sierra peut utiliser des variantes)
RANGEDASH_CANDIDATES = [
    "RangeDash-BarStudyData.txt",
    "RangeDash-BarStudyData.csv",
    "Range Dashboard-BarStudyData.txt",
    "Range Dashboard-BarStudyData.csv",
    "RangeDashboard-BarStudyData.txt",
    "RangeDashboard-BarStudyData.csv",
]

# Fallback: RangeWeek files permettent de calculer la position actuelle dans le range
RANGEWEEK_FALLBACK = {
    "SPY-NQTV-RangeWeek": {"name": "SPY", "class": "Indices US"},
    "NQ-RangeWeek": {"name": "NQ", "class": "Indices US"},
    "NQM6.CME-RangeWeek": {"name": "NQ M6", "class": "Indices US"},
    "YM-RangeWeek": {"name": "YM", "class": "Indices US"},
    "YMM6.CBOT-RangeWeek": {"name": "YM M6", "class": "Indices US"},
    "RTY-RangeWeek": {"name": "RTY", "class": "Indices US"},
    "RTYM6.CME-RangeWeek": {"name": "RTY M6", "class": "Indices US"},
}


def _find_rangedash_file():
    """Retourne le chemin du premier fichier RangeDash trouve, ou None."""
    if not os.path.exists(SIERRA_DATA_DIR):
        return None
    for name in RANGEDASH_CANDIDATES:
        p = os.path.join(SIERRA_DATA_DIR, name)
        if os.path.exists(p):
            return p
    # Scan large: n'importe quoi qui contient "rangedash" ou "range dashboard"
    try:
        for f in os.listdir(SIERRA_DATA_DIR):
            lower = f.lower()
            if ("rangedash" in lower or "range dashboard" in lower) and (f.endswith(".txt") or f.endswith(".csv")):
                return os.path.join(SIERRA_DATA_DIR, f)
    except Exception:
        pass
    return None


def _parse_float(val):
    try:
        v = float(val)
        return v
    except (ValueError, TypeError):
        return None


def read_range_dashboard():
    """Lit le fichier RangeDash Sierra. Retourne le header + la derniere barre
    + quelques barres recentes pour le contexte."""
    path = _find_rangedash_file()
    if not path:
        return {
            "available": False,
            "error": "Fichier RangeDash-BarStudyData introuvable",
            "message": (
                "Ouvrir 'Range Dashboard.Cht' dans Sierra Chart puis Chart Settings -> "
                "onglet 'File Output' -> cocher 'Write Bar Data to File'. "
                "Sierra creera automatiquement RangeDash-BarStudyData.txt"
            ),
            "expected_paths": [
                os.path.join(SIERRA_DATA_DIR, c) for c in RANGEDASH_CANDIDATES
            ],
            "fallback_used": True,
            "fallback": _fallback_from_rangeweek(),
        }

    try:
        mtime = os.path.getmtime(path)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        if len(lines) < 2:
            return {
                "available": True,
                "path": path,
                "error": "Fichier vide",
                "header": [],
                "rows": [],
                "data_age_seconds": round(time.time() - mtime),
            }

        header = [h.strip() for h in lines[0].split(",")]

        # Derniere ligne = snapshot actuel
        last_cols = [c.strip() for c in lines[-1].split(",")]

        # Construit le dict colonne -> valeur (cast float si possible)
        last_bar = {}
        for i, h in enumerate(header):
            if i < len(last_cols):
                v = last_cols[i]
                fv = _parse_float(v)
                last_bar[h] = fv if fv is not None else v

        # Separe meta (Date/Time/OHLC) des studies/subgraphs
        meta_keys = {"Date", "Time", "Open", "High", "Low", "Last", "Volume", "# of Trades"}
        studies = {}
        for k, v in last_bar.items():
            if k and k not in meta_keys and not k.startswith("Unnamed"):
                studies[k] = v

        # Derriere 50 barres pour les mini-charts/sparklines
        recent = []
        for line in lines[-50:]:
            cols = [c.strip() for c in line.split(",")]
            if len(cols) < 6 or cols[0] == "Date":
                continue
            row = {}
            for i, h in enumerate(header):
                if i < len(cols):
                    fv = _parse_float(cols[i])
                    row[h] = fv if fv is not None else cols[i]
            recent.append(row)

        return {
            "available": True,
            "path": path,
            "filename": os.path.basename(path),
            "header": header,
            "column_count": len(header),
            "row_count": len(lines) - 1,
            "last_bar": last_bar,
            "studies": studies,
            "recent": recent,
            "date": last_bar.get("Date", ""),
            "time": last_bar.get("Time", ""),
            "price": last_bar.get("Last") or last_bar.get("Close"),
            "data_age_seconds": round(time.time() - mtime),
            "is_stale": (time.time() - mtime) > 300,
            "file_modified": datetime.fromtimestamp(mtime).isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        return {
            "available": True,
            "path": path,
            "error": str(e),
        }


def _fallback_from_rangeweek():
    """Construit une vue tableau de bord depuis les fichiers RangeWeek existants.
    Calcule pour chaque actif:
      - prix courant
      - PWAP
      - niveau % atteint (la zone ou se trouve le prix)
      - % du range realise (distance du PWAP / distance 100% full)
      - High/Low de la semaine
    """
    from services.range_signals import _get_range_cols, _parse_bar
    from services.sierra_reader import sierra_get_csv_path

    rows = []

    for symbol, meta in RANGEWEEK_FALLBACK.items():
        csv_path = sierra_get_csv_path(symbol)
        if not csv_path:
            continue

        try:
            mtime = os.path.getmtime(csv_path)
            with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            if len(lines) < 2:
                continue

            range_cols = _get_range_cols(symbol)

            # Derniere barre
            cols = [c.strip() for c in lines[-1].split(",")]
            bar = _parse_bar(cols, range_cols)
            if not bar or not bar.get("last"):
                continue

            price = bar["last"]
            levels = bar.get("levels", {})
            pwap = levels.get("PWAP", 0) or 0
            rf = levels.get("RF", 0) or 0

            # Determine la zone exacte du prix
            current_pct = None
            current_level_name = None
            if pwap > 0:
                dist_pwap = price - pwap
                # Scan des niveaux pour trouver le plus proche dans la direction
                candidates = []
                for name, val in levels.items():
                    if name in ("PWAP", "RF", "U1", "L1", "U2", "L2", "U3", "L3", "High", "Low"):
                        continue
                    if val and val > 0:
                        candidates.append((name, val))
                candidates.sort(key=lambda x: x[1])

                # Trouve le niveau % correspondant au prix
                if dist_pwap >= 0:
                    # Cherche le plus grand niveau + encore sous le prix
                    best = 0
                    for name, val in candidates:
                        if name.endswith("+") and val <= price:
                            pct = _extract_pct(name)
                            if pct is not None and pct > best:
                                best = pct
                                current_level_name = name
                    current_pct = best if best > 0 else 0
                else:
                    best = 0
                    for name, val in candidates:
                        if name.endswith("-") and val >= price:
                            pct = _extract_pct(name)
                            if pct is not None and pct > best:
                                best = pct
                                current_level_name = name
                    current_pct = -best if best > 0 else 0

            # Amplitude du range 100% -> 100% en pourcentage du prix
            hi100 = levels.get("100%+", 0) or 0
            lo100 = levels.get("100%-", 0) or 0
            range_pts = (hi100 - lo100) if (hi100 > 0 and lo100 > 0) else 0
            range_pct = round(range_pts / pwap * 100, 3) if pwap > 0 else 0

            # Pct realise: la distance absolue parcourue vs le range 100-100 total
            realized_pct = 0
            if pwap > 0 and range_pts > 0:
                dist_abs = abs(price - pwap)
                realized_pct = round(dist_abs / (range_pts / 2) * 100, 2)  # range_pts/2 = 100%+ side

            # Distance vs PWAP en %
            dist_pwap_pct = round((price - pwap) / pwap * 100, 3) if pwap > 0 else 0

            rows.append({
                "symbol": symbol,
                "name": meta["name"],
                "class": meta["class"],
                "price": round(price, 4),
                "pwap": round(pwap, 4) if pwap > 0 else None,
                "rf": round(rf, 4) if rf > 0 else None,
                "dist_pwap_pct": dist_pwap_pct,
                "current_pct_level": current_pct,
                "current_level_name": current_level_name,
                "hi_100": round(hi100, 4) if hi100 > 0 else None,
                "lo_100": round(lo100, 4) if lo100 > 0 else None,
                "week_range_pct": range_pct,
                "realized_pct": realized_pct,
                "date": bar.get("date", ""),
                "time": bar.get("time", ""),
                "data_age_seconds": round(time.time() - mtime),
            })
        except Exception:
            continue

    # Trier par % realise decroissant
    rows.sort(key=lambda r: abs(r.get("realized_pct", 0)), reverse=True)

    return {
        "rows": rows,
        "count": len(rows),
        "source": "RangeWeek fallback",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _extract_pct(name):
    """Extrait la valeur entiere d'un libelle '125%+' -> 125"""
    if not name:
        return None
    try:
        return int(name.replace("%+", "").replace("%-", "").strip())
    except ValueError:
        return None
