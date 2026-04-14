"""
Sierra Chart CSV Reader — Multi-asset signal analysis
Reads BarStudyData CSV files from Sierra Chart data directory.
Detects mean reversion signals with strength levels 0-4.
"""
import os
import time
from datetime import datetime

SIERRA_DATA_DIR = r"C:\SierraChart\Data"

# Asset class mapping
SIERRA_ASSETS = {
    "ESM6.CME": {"name": "E-mini S&P 500", "class": "Indices US", "timeframe": "5min"},
    "NQM6.CME": {"name": "E-mini Nasdaq", "class": "Indices US", "timeframe": "1min"},
    "RTYM6.CME": {"name": "E-mini Russell 2000", "class": "Indices US", "timeframe": "5min"},
    "YMM6.CBOT": {"name": "E-mini Dow Jones", "class": "Indices US", "timeframe": "1min"},
    "USEquities": {"name": "US Equities Composite", "class": "Indices US", "timeframe": "5min"},
    "Bund": {"name": "Euro Bund (FGBL)", "class": "EUREX", "timeframe": "5min", "chartbook": "EUREX Metrics"},
    "GER30": {"name": "DAX 30", "class": "EUREX", "timeframe": "5min", "chartbook": "EUREX Metrics"},
    "EUSTX50": {"name": "Euro Stoxx 50", "class": "EUREX", "timeframe": "5min", "chartbook": "EUREX Metrics"},
    "VOLX": {"name": "VSTOXX", "class": "EUREX", "timeframe": "5min", "chartbook": "EUREX Metrics"},
    "VXX-NQTV": {"name": "VXX Short-Term VIX ETN", "class": "Volatilite", "timeframe": "5min"},
    "SPXS-NQTV": {"name": "SPDR S&P 500 Bear 3x", "class": "Inverse", "timeframe": "5min"},
    "TICK-NYSE_NASDAQ_NYSEMKT": {"name": "TICK Composite NYSE+NASDAQ", "class": "Breadth", "timeframe": "1min"},
    "SP500GEX": {"name": "SP500 GEX Total Delta", "class": "GEX", "timeframe": "5min"},
    "SP500GEX-NQ": {"name": "NQ Period OHLC Vol Synth", "class": "GEX", "timeframe": "5min"},
    "SP500GEX-VXX": {"name": "VXX Vol Synthetique", "class": "Volatilite", "timeframe": "5min"},
    "SP500GEX-SPXS": {"name": "SPXS Vol Synthetique", "class": "Inverse", "timeframe": "5min"},
    "SP500GEX-TICK": {"name": "TICK Renko Breadth", "class": "Breadth", "timeframe": "renko"},
    # INDICE_US_RANGE_Week
    "SPY-NQTV-RangeWeek": {"name": "SPY Range Hebdo", "class": "Indices US", "timeframe": "60min", "chartbook": "INDICE_US_RANGE_Week"},
    "NQ-RangeWeek": {"name": "NQ Range Hebdo", "class": "Indices US", "timeframe": "60min", "chartbook": "INDICE_US_RANGE_Week"},
    "YM-RangeWeek": {"name": "YM Range Hebdo", "class": "Indices US", "timeframe": "60min", "chartbook": "INDICE_US_RANGE_Week"},
    "RTY-RangeWeek": {"name": "RTY Range Hebdo", "class": "Indices US", "timeframe": "60min", "chartbook": "INDICE_US_RANGE_Week"},
    "SPX-CGI": {"name": "SPX CGI GEX Levels", "class": "GEX", "timeframe": "5min", "chartbook": "INDICE_US_RANGE_Week"},
    # DiscordStream
    "DiscordStream": {"name": "SPX+QQQ+SPY Notional Delta", "class": "GEX", "timeframe": "1min", "chartbook": "DiscordStream"},
    "DiscordStream-ES5s": {"name": "ES GEX Levels 5s", "class": "GEX", "timeframe": "5sec", "chartbook": "DiscordStream"},
    "DiscordStream-ES30s-QQQ": {"name": "ES GEX Levels QQQ 30s", "class": "GEX", "timeframe": "30sec", "chartbook": "DiscordStream"},
    "DiscordStream-ES30s-Zones": {"name": "ES GEX Zones 30s", "class": "GEX", "timeframe": "30sec", "chartbook": "DiscordStream"},
}

# Simple in-module cache
_cache = {}
CACHE_TTL = 30


def _get_cached(key, ttl=CACHE_TTL):
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < ttl:
            return data
    return None


def _set_cache(key, data):
    _cache[key] = (time.time(), data)


def sierra_scan_files():
    """Scan all BarStudyData CSV/TXT files in Sierra Data directory"""
    found = {}
    if not os.path.exists(SIERRA_DATA_DIR):
        return found
    # Also track known symbols from SIERRA_ASSETS that might not have -BarStudyData suffix
    known_symbols = set(SIERRA_ASSETS.keys())
    for f in os.listdir(SIERRA_DATA_DIR):
        symbol = None
        if f.endswith("-BarStudyData.csv") or f.endswith("-BarStudyData.txt"):
            symbol = f.replace("-BarStudyData.csv", "").replace("-BarStudyData.txt", "")
        else:
            # Check if file matches a known symbol without -BarStudyData suffix
            for ext in [".csv", ".txt"]:
                if f.endswith(ext):
                    candidate = f.replace(ext, "")
                    if candidate in known_symbols:
                        symbol = candidate
                        break
        if not symbol:
            continue
        # Skip if already found with -BarStudyData version (priority)
        if symbol in found:
            continue
        path = os.path.join(SIERRA_DATA_DIR, f)
        size = os.path.getsize(path)
        mtime = os.path.getmtime(path)
        meta = SIERRA_ASSETS.get(symbol, {"name": symbol, "class": "Autre", "timeframe": "?"})
        found[symbol] = {
            "path": path,
            "name": meta["name"],
            "asset_class": meta["class"],
            "timeframe": meta["timeframe"],
            "size_mb": round(size / 1024 / 1024, 2),
            "last_modified": datetime.fromtimestamp(mtime).isoformat(),
        }
    return found


def sierra_get_csv_path(symbol=None):
    """Get CSV path for a symbol, default to USEquities"""
    if not symbol:
        symbol = "USEquities"
    # Check all possible naming patterns
    for pattern in [
        f"{symbol}-BarStudyData.csv",
        f"{symbol}-BarStudyData.txt",
        f"{symbol}.csv",
        f"{symbol}.txt",
    ]:
        path = os.path.join(SIERRA_DATA_DIR, pattern)
        if os.path.exists(path):
            return path
    return None


def sierra_read_last_bars(n=20, symbol=None):
    """Lit les N dernieres barres du CSV Sierra Chart pour un symbole donne"""
    csv_path = sierra_get_csv_path(symbol)
    if not csv_path:
        return {"error": f"Fichier Sierra non trouve pour {symbol or 'USEquities'}"}

    try:
        mtime = os.path.getmtime(csv_path)
        cache_key = f"sierra_bars_{symbol or 'USEquities'}_{n}"
        cached = _get_cached(cache_key, 5)
        if cached and cached.get("_mtime") == mtime:
            return cached

        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        if len(lines) < 2:
            return {"error": "Fichier Sierra vide"}

        # Parse header
        header = [h.strip() for h in lines[0].split(",")]

        # Parse last N bars
        bars = []
        for line in lines[-n:]:
            cols = [c.strip() for c in line.split(",")]
            if len(cols) < len(header):
                continue

            bar = {}
            for i, h in enumerate(header):
                if i < len(cols):
                    val = cols[i]
                    # Try to convert to float
                    try:
                        bar[h] = float(val)
                    except (ValueError, TypeError):
                        bar[h] = val
            bars.append(bar)

        # Build summary from last bar
        last = bars[-1] if bars else {}

        # Extract key signals
        signals = {
            "date": last.get("Date", ""),
            "time": last.get(" Time", last.get("Time", "")),
            "open": last.get(" Open", last.get("Open")),
            "high": last.get(" High", last.get("High")),
            "low": last.get(" Low", last.get("Low")),
            "last": last.get(" Last", last.get("Last")),
            "volume": last.get(" Volume", last.get("Volume")),
            "bid_volume": last.get(" Bid Volume", last.get("Bid Volume")),
            "ask_volume": last.get(" Ask Volume", last.get("Ask Volume")),
            "vwap": last.get(" VWAP", last.get("VWAP")),
        }

        # Extract all study subgraphs (SG1-SG60)
        studies = {}
        for key in last:
            k = key.strip()
            if k.startswith("SG"):
                studies[k] = last[key]

        # Extract deviation levels
        deviations = {}
        for key in last:
            k = key.strip()
            if "%" in k or k in ["U2", "L2", "U3", "L3"]:
                deviations[k] = last[key]

        # Extract sigma, rho, stochastic
        greeks = {}
        for key in last:
            k = key.strip()
            if k in ["\u03c3", "\u03c1", "MA", "Avg", "Stochastic Function", "Trigger", "Center Line"]:
                greeks[k] = last[key]

        # Extract GEX/MenthorQ specific columns
        gex_data = {}
        GEX_KEYS = [
            "Call Resistance", "Put Support", "Put Support & Put Support 0DTE",
            "HVL", "HVL 0DTE", "1D Min", "1D Max",
            "Call Resistance 0DTE & Gamma Wall 0DTE", "Gamma Wall 0DTE",
            "GEX 1", "GEX 2",
            "Call Delta", "Put Delta", "Total Delta",
            "Call GEX", "Put GEX", "Total GEX",
            "GTS", "Volatility Trend",
        ]
        for key in last:
            k = key.strip()
            if k in GEX_KEYS:
                gex_data[k] = last[key]

        data_age = time.time() - mtime
        result = {
            "symbol": symbol or "USEquities",
            "signals": signals,
            "studies": studies,
            "deviations": deviations,
            "greeks": greeks,
            "gex": gex_data,
            "bars_count": len(bars),
            "total_bars": len(lines) - 1,
            "columns_count": len(header),
            "file_modified": datetime.fromtimestamp(mtime).isoformat(),
            "data_age_seconds": round(data_age),
            "is_stale": data_age > 300,  # >5 min = stale
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "_mtime": mtime,
        }

        _set_cache(cache_key, result)
        return result

    except Exception as e:
        return {"error": str(e)}


def sierra_read_history(bars=100, symbol=None):
    """Lit l'historique des N dernieres barres pour les charts"""
    csv_path = sierra_get_csv_path(symbol)
    if not csv_path:
        return {"error": f"Fichier Sierra non trouve pour {symbol or 'USEquities'}"}

    try:
        mtime = os.path.getmtime(csv_path)
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        header = [h.strip() for h in lines[0].split(",")]

        history = []
        for line in lines[-bars:]:
            cols = [c.strip() for c in line.split(",")]
            if len(cols) < 5:
                continue
            row = {}
            for i, h in enumerate(header):
                if i < len(cols):
                    try:
                        row[h.strip()] = float(cols[i])
                    except (ValueError, TypeError):
                        row[h.strip()] = cols[i].strip()
            history.append(row)

        data_age = time.time() - mtime
        return {
            "symbol": symbol or "USEquities",
            "history": history,
            "columns": [h.strip() for h in header],
            "count": len(history),
            "file_modified": datetime.fromtimestamp(mtime).isoformat(),
            "data_age_seconds": round(data_age),
            "is_stale": data_age > 300,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        return {"error": str(e)}


def sierra_mean_reversion_signals(bars=50, symbol=None):
    """Detecte les signaux de mean reversion:
    Franchissement d'un range (25/50/75/100%) sans retrace jusqu'au prochain = signal MR
    """
    csv_path = sierra_get_csv_path(symbol)
    if not csv_path:
        return {"error": f"Fichier Sierra non trouve pour {symbol or 'USEquities'}"}

    try:
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        header = [h.strip() for h in lines[0].split(",")]

        # Find deviation column indices
        # Niveaux de range + niveaux de MR (U2/L2, U3/L3 = niveaux 2,3,4 de MR forte)
        dev_levels = [
            "25%", "-25%", "50%", "-50%", "75%", "-75%",
            "100%", "-100%", "125%", "-125%", "150%", "-150%",
            "200%", "-200%", "300%", "-300%",
            "U2", "L2", "U3", "L3",  # Niveaux MR 2 et 3 (forts)
        ]
        dev_indices = {}
        for lvl in dev_levels:
            for i, h in enumerate(header):
                if h.strip() == lvl:
                    dev_indices[lvl] = i
                    break

        last_idx = None
        high_idx = None
        low_idx = None
        for i, h in enumerate(header):
            hs = h.strip()
            if hs == "Last" and last_idx is None:
                last_idx = i
            elif hs == "High" and high_idx is None:
                high_idx = i
            elif hs == "Low" and low_idx is None:
                low_idx = i

        if not dev_indices or last_idx is None:
            return {"error": "Colonnes de deviation non trouvees"}

        # Analyze last N bars
        signals = []
        recent_lines = lines[-bars:]

        for line_idx, line in enumerate(recent_lines):
            cols = [c.strip() for c in line.split(",")]
            if len(cols) < max(dev_indices.values(), default=0) + 1:
                continue

            try:
                price = float(cols[last_idx])
                high = float(cols[high_idx]) if high_idx else price
                low = float(cols[low_idx]) if low_idx else price
            except (ValueError, IndexError):
                continue

            # Check each deviation level for breach
            for lvl, idx in dev_indices.items():
                try:
                    level_val = float(cols[idx])
                except (ValueError, IndexError):
                    continue

                if level_val == 0:
                    continue

                # Detect breach: high crossed above positive level or low crossed below negative level
                is_upper = not lvl.startswith("-")

                # Determine signal strength based on level
                def mr_strength(level_name):
                    if level_name in ("U3", "L3"):
                        return 4  # MR Niveau 4 — extreme
                    elif level_name in ("U2", "L2"):
                        return 3  # MR Niveau 3 — tres fort
                    elif "200" in level_name or "300" in level_name or "150" in level_name:
                        return 3  # MR Niveau 3
                    elif "100" in level_name or "125" in level_name:
                        return 2  # MR Niveau 2 — fort
                    elif "75" in level_name:
                        return 1  # MR Niveau 1 — standard
                    else:
                        return 0  # Faible

                strength = mr_strength(lvl)
                strength_label = ["FAIBLE", "STANDARD", "FORT", "TRES FORT", "EXTREME"][min(strength, 4)]

                if is_upper and high >= level_val and price < level_val:
                    signals.append({
                        "symbol": symbol or "USEquities",
                        "bar_index": line_idx,
                        "date": cols[0] if cols else "",
                        "time": cols[1].strip() if len(cols) > 1 else "",
                        "level": lvl,
                        "level_price": level_val,
                        "high": high,
                        "close": price,
                        "direction": "SHORT",
                        "strength": strength,
                        "strength_label": strength_label,
                        "type": "MEAN_REVERSION",
                        "description": f"MR {strength_label} \u2014 {lvl} ({level_val:.1f}) franchi sans tenir"
                    })
                elif not is_upper and low <= level_val and price > level_val:
                    signals.append({
                        "symbol": symbol or "USEquities",
                        "bar_index": line_idx,
                        "date": cols[0] if cols else "",
                        "time": cols[1].strip() if len(cols) > 1 else "",
                        "level": lvl,
                        "level_price": level_val,
                        "low": low,
                        "close": price,
                        "direction": "LONG",
                        "strength": strength,
                        "strength_label": strength_label,
                        "type": "MEAN_REVERSION",
                        "description": f"MR {strength_label} \u2014 {lvl} ({level_val:.1f}) franchi sans tenir"
                    })

        return {
            "symbol": symbol or "USEquities",
            "signals": signals[-20:],  # Last 20 signals
            "signal_count": len(signals),
            "bars_analyzed": len(recent_lines),
            "deviation_levels": {k: None for k in dev_indices.keys()},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        return {"error": str(e)}


def sierra_columns(symbol=None):
    """Liste les colonnes disponibles dans le CSV Sierra"""
    csv_path = sierra_get_csv_path(symbol)
    if not csv_path:
        return {"error": f"Fichier Sierra non trouve pour {symbol or 'USEquities'}"}

    try:
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            header_line = f.readline()

        header = [h.strip() for h in header_line.split(",")]
        return {
            "symbol": symbol or "USEquities",
            "columns": header,
            "count": len(header),
            "file": csv_path,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        return {"error": str(e)}


def sierra_performance(symbol=None):
    """Calcule les stats de performance historique de chaque signal MR.
    Retourne win rate, avg drawdown, avg profit pour chaque combinaison signal/niveau.
    PAS DE STOP LOSS — on mesure le drawdown max en % et le profit max en %.
    """
    csv_path = sierra_get_csv_path(symbol)
    if not csv_path:
        return {"error": f"Fichier non trouve pour {symbol or 'USEquities'}"}

    cache_key = f"perf_{symbol or 'USEquities'}"
    cached = _get_cached(cache_key, 300)  # Cache 5 min (heavy calc)
    if cached:
        return cached

    try:
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        header = [h.strip() for h in lines[0].split(",")]

        levels_to_check = [
            "25%", "-25%", "50%", "-50%", "75%", "-75%",
            "100%", "-100%", "125%", "-125%", "150%", "-150%",
            "U2", "L2", "U3", "L3"
        ]

        dev_cols = {}
        last_idx = high_idx = low_idx = None
        for i, h in enumerate(header):
            hs = h.strip()
            if hs in levels_to_check:
                dev_cols[hs] = i
            if hs == "Last" and last_idx is None:
                last_idx = i
            if hs == "High" and high_idx is None:
                high_idx = i
            if hs == "Low" and low_idx is None:
                low_idx = i

        bars = []
        for line in lines[1:]:
            cols = [c.strip() for c in line.split(",")]
            try:
                bar = {"last": float(cols[last_idx]), "high": float(cols[high_idx]), "low": float(cols[low_idx])}
                for k, idx in dev_cols.items():
                    try:
                        bar[k] = float(cols[idx])
                    except (ValueError, IndexError):
                        bar[k] = 0
                bars.append(bar)
            except (ValueError, IndexError):
                continue

        # Determine timeframe from bar count
        total_bars = len(bars)
        is_1min = total_bars > 15000
        tf_label = "1min" if is_1min else "5min"

        # Analyze at 2 horizons
        horizons = {"court": 10, "moyen": 50} if is_1min else {"court": 10, "moyen": 30}

        all_results = {}
        for hz_name, horizon in horizons.items():
            hz_minutes = horizon * (1 if is_1min else 5)
            results = {}

            for i in range(len(bars) - horizon - 1):
                bar = bars[i]
                price = bar["last"]
                if price == 0:
                    continue

                for lvl in levels_to_check:
                    level_val = bar.get(lvl, 0)
                    if level_val == 0:
                        continue

                    is_upper = not lvl.startswith("-") and lvl not in ("L2", "L3")

                    signal_key = None
                    if is_upper and bar["high"] >= level_val and price < level_val:
                        signal_key = f"SHORT_{lvl}"
                        entry = price
                        max_dd = max((bars[i + j]["high"] - entry) / entry * 100 for j in range(1, horizon + 1))
                        max_prof = max((entry - bars[i + j]["last"]) / entry * 100 for j in range(1, horizon + 1))
                        final_pnl = (entry - bars[i + horizon]["last"]) / entry * 100
                    elif not is_upper and bar["low"] <= level_val and price > level_val:
                        signal_key = f"LONG_{lvl}"
                        entry = price
                        max_dd = max((entry - bars[i + j]["low"]) / entry * 100 for j in range(1, horizon + 1))
                        max_prof = max((bars[i + j]["last"] - entry) / entry * 100 for j in range(1, horizon + 1))
                        final_pnl = (bars[i + horizon]["last"] - entry) / entry * 100

                    if signal_key:
                        if signal_key not in results:
                            results[signal_key] = {"total": 0, "wins": 0, "dd_sum": 0, "prof_sum": 0, "pnl_sum": 0}
                        r = results[signal_key]
                        r["total"] += 1
                        r["wins"] += 1 if final_pnl > 0 else 0
                        r["dd_sum"] += max_dd
                        r["prof_sum"] += max_prof
                        r["pnl_sum"] += final_pnl

            # Build output
            perf = []
            for key, r in results.items():
                if r["total"] < 5:
                    continue
                direction, level = key.split("_", 1)
                win_rate = round(r["wins"] / r["total"] * 100, 1)
                avg_dd = round(r["dd_sum"] / r["total"], 3)
                avg_prof = round(r["prof_sum"] / r["total"], 3)
                avg_pnl = round(r["pnl_sum"] / r["total"], 3)

                # Score: combines win rate, profit/dd ratio, and sample size
                ratio = avg_prof / avg_dd if avg_dd > 0 else 0
                size_bonus = min(1.0, r["total"] / 30)
                score = round(win_rate * ratio * size_bonus, 1)

                # Rating
                if win_rate >= 65:
                    rating = "A"
                elif win_rate >= 55:
                    rating = "B"
                elif win_rate >= 50:
                    rating = "C"
                else:
                    rating = "D"

                perf.append({
                    "signal": key,
                    "direction": direction,
                    "level": level,
                    "occurrences": r["total"],
                    "win_rate": win_rate,
                    "avg_drawdown_pct": avg_dd,
                    "avg_profit_pct": avg_prof,
                    "avg_pnl_pct": avg_pnl,
                    "profit_dd_ratio": round(ratio, 2),
                    "score": score,
                    "rating": rating,
                })

            perf.sort(key=lambda x: x["score"], reverse=True)
            all_results[hz_name] = {
                "horizon_bars": horizon,
                "horizon_minutes": hz_minutes,
                "signals": perf,
            }

        result = {
            "symbol": symbol or "USEquities",
            "timeframe": tf_label,
            "total_bars": total_bars,
            "horizons": all_results,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        _set_cache(cache_key, result)
        return result

    except Exception as e:
        return {"error": str(e)}


def sierra_gex_analysis(bars=5000):
    """Analyse Total GEX crossings: zero line, levels 10/20/30/40 and negatives.
    Returns time series + crossing stats + level distribution.
    Source: DiscordStream-ES5s (has Total GEX, Delta, GTS columns)."""
    # Try DiscordStream-ES5s first (has all GEX columns), fallback to SP500GEX
    csv_path = sierra_get_csv_path("DiscordStream-ES5s")
    if not csv_path:
        csv_path = sierra_get_csv_path("SP500GEX")
    if not csv_path:
        return {"error": "Fichier GEX non trouve (DiscordStream-ES5s ou SP500GEX)"}

    cache_key = f"gex_analysis_{bars}"
    cached = _get_cached(cache_key, 120)
    if cached:
        return cached

    try:
        mtime = os.path.getmtime(csv_path)
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        header = [h.strip() for h in lines[0].split(",")]

        # Find key column indices
        col_map = {}
        targets = ["Total GEX", "Total Delta", "Call GEX", "Put GEX",
                    "Call Delta", "Put Delta", "GTS", "Volatility Trend",
                    "Last", "High", "Low", "Date", "Time"]
        for i, h in enumerate(header):
            hs = h.strip()
            if hs in targets:
                if hs not in col_map:
                    col_map[hs] = i

        if "Total GEX" not in col_map:
            return {"error": "Colonne Total GEX non trouvee dans SP500GEX"}

        # Parse bars
        data_lines = lines[1:]
        start = max(0, len(data_lines) - bars)
        parsed = []

        for line in data_lines[start:]:
            cols = [c.strip() for c in line.split(",")]
            try:
                row = {
                    "date": cols[col_map.get("Date", 0)] if "Date" in col_map else cols[0],
                    "time": cols[col_map.get("Time", 1)] if "Time" in col_map else (cols[1] if len(cols) > 1 else ""),
                }
                for key in ["Total GEX", "Total Delta", "Call GEX", "Put GEX",
                            "Call Delta", "Put Delta", "GTS", "Volatility Trend", "Last"]:
                    if key in col_map and col_map[key] < len(cols):
                        try:
                            row[key] = float(cols[col_map[key]])
                        except (ValueError, TypeError):
                            row[key] = None
                    else:
                        row[key] = None

                if row.get("Total GEX") is not None:
                    parsed.append(row)
            except (IndexError, ValueError):
                continue

        if not parsed:
            return {"error": "Aucune donnee GEX parsee"}

        # === CASH SESSION FILTER (09:30 - 16:00 ET) ===
        # GEX ne cote que pendant la session cash — retirer les barres hors marche
        def _is_cash_session(row):
            t = str(row.get("time", ""))
            if len(t) < 5:
                return False
            return "09:30" <= t[:5] <= "16:00"

        parsed = [r for r in parsed if _is_cash_session(r)]

        if not parsed:
            return {"error": "Aucune donnee GEX en session cash"}

        # === CROSSING ANALYSIS ===
        levels = [-40, -30, -20, -10, 0, 10, 20, 30, 40]
        crossings = {str(lvl): {"up": 0, "down": 0, "events": []} for lvl in levels}

        # Track what happens after each crossing (price move in next N bars)
        LOOK_AHEAD = 20  # bars after crossing

        for i in range(1, len(parsed)):
            prev_gex = parsed[i - 1].get("Total GEX")
            curr_gex = parsed[i].get("Total GEX")
            if prev_gex is None or curr_gex is None:
                continue

            for lvl in levels:
                # Crossing up
                if prev_gex < lvl and curr_gex >= lvl:
                    event = {
                        "bar": i, "date": parsed[i]["date"], "time": parsed[i]["time"],
                        "gex_before": round(prev_gex, 2), "gex_after": round(curr_gex, 2),
                        "price": parsed[i].get("Last"), "direction": "up",
                    }
                    # Measure price outcome
                    if parsed[i].get("Last") and i + LOOK_AHEAD < len(parsed):
                        entry = parsed[i]["Last"]
                        future_prices = [parsed[i + j].get("Last") for j in range(1, LOOK_AHEAD + 1)
                                         if parsed[i + j].get("Last") is not None]
                        if future_prices:
                            event["price_change_pct"] = round((future_prices[-1] - entry) / entry * 100, 4)
                            event["max_up_pct"] = round((max(future_prices) - entry) / entry * 100, 4)
                            event["max_down_pct"] = round((min(future_prices) - entry) / entry * 100, 4)
                    crossings[str(lvl)]["up"] += 1
                    crossings[str(lvl)]["events"].append(event)

                # Crossing down
                elif prev_gex > lvl and curr_gex <= lvl:
                    event = {
                        "bar": i, "date": parsed[i]["date"], "time": parsed[i]["time"],
                        "gex_before": round(prev_gex, 2), "gex_after": round(curr_gex, 2),
                        "price": parsed[i].get("Last"), "direction": "down",
                    }
                    if parsed[i].get("Last") and i + LOOK_AHEAD < len(parsed):
                        entry = parsed[i]["Last"]
                        future_prices = [parsed[i + j].get("Last") for j in range(1, LOOK_AHEAD + 1)
                                         if parsed[i + j].get("Last") is not None]
                        if future_prices:
                            event["price_change_pct"] = round((future_prices[-1] - entry) / entry * 100, 4)
                            event["max_up_pct"] = round((max(future_prices) - entry) / entry * 100, 4)
                            event["max_down_pct"] = round((min(future_prices) - entry) / entry * 100, 4)
                    crossings[str(lvl)]["down"] += 1
                    crossings[str(lvl)]["events"].append(event)

        # === STATS PER LEVEL ===
        level_stats = {}
        for lvl_str, data in crossings.items():
            events_with_outcome = [e for e in data["events"] if "price_change_pct" in e]
            up_events = [e for e in events_with_outcome if e["direction"] == "up"]
            down_events = [e for e in events_with_outcome if e["direction"] == "down"]

            def avg(lst, key):
                vals = [e[key] for e in lst if key in e]
                return round(sum(vals) / len(vals), 4) if vals else 0

            level_stats[lvl_str] = {
                "crossings_up": data["up"],
                "crossings_down": data["down"],
                "total_crossings": data["up"] + data["down"],
                "up_avg_price_change": avg(up_events, "price_change_pct"),
                "up_avg_max_up": avg(up_events, "max_up_pct"),
                "up_avg_max_down": avg(up_events, "max_down_pct"),
                "down_avg_price_change": avg(down_events, "price_change_pct"),
                "down_avg_max_up": avg(down_events, "max_up_pct"),
                "down_avg_max_down": avg(down_events, "max_down_pct"),
                "last_5_events": data["events"][-5:],
            }

        # === GEX DISTRIBUTION ===
        gex_values = [p["Total GEX"] for p in parsed if p["Total GEX"] is not None]
        distribution = {}
        if gex_values:
            distribution = {
                "min": round(min(gex_values), 2),
                "max": round(max(gex_values), 2),
                "mean": round(sum(gex_values) / len(gex_values), 2),
                "current": round(gex_values[-1], 2),
                "pct_positive": round(sum(1 for v in gex_values if v > 0) / len(gex_values) * 100, 1),
                "pct_above_20": round(sum(1 for v in gex_values if v > 20) / len(gex_values) * 100, 1),
                "pct_below_neg20": round(sum(1 for v in gex_values if v < -20) / len(gex_values) * 100, 1),
            }

        # === TIME SERIES (downsample for frontend) ===
        # Return every Nth bar to keep under ~500 points
        step = max(1, len(parsed) // 500)
        time_series = []
        for i in range(0, len(parsed), step):
            p = parsed[i]
            raw_time = str(p.get("time", ""))
            short_time = raw_time[:5] if len(raw_time) >= 5 else raw_time  # "20:24" from "20:24:00.000000"
            time_series.append({
                "date": p["date"],
                "time": short_time,
                "total_gex": p.get("Total GEX"),
                "total_delta": p.get("Total Delta"),
                "call_gex": p.get("Call GEX"),
                "put_gex": p.get("Put GEX"),
                "gts": p.get("GTS"),
                "price": p.get("Last"),
            })

        result = {
            "bars_analyzed": len(parsed),
            "total_bars_available": len(data_lines),
            "level_stats": level_stats,
            "distribution": distribution,
            "time_series": time_series,
            "current": {
                "total_gex": parsed[-1].get("Total GEX") if parsed else None,
                "total_delta": parsed[-1].get("Total Delta") if parsed else None,
                "call_gex": parsed[-1].get("Call GEX") if parsed else None,
                "put_gex": parsed[-1].get("Put GEX") if parsed else None,
                "gts": parsed[-1].get("GTS") if parsed else None,
                "price": parsed[-1].get("Last") if parsed else None,
                "date": parsed[-1].get("date") if parsed else None,
                "time": parsed[-1].get("time") if parsed else None,
            },
            "file_modified": datetime.fromtimestamp(mtime).isoformat(),
            "data_age_seconds": round(time.time() - mtime),
            "is_stale": (time.time() - mtime) > 300,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        _set_cache(cache_key, result)
        return result

    except Exception as e:
        return {"error": str(e)}


def sierra_dashboard():
    """Build a complete dashboard view across all available Sierra CSV files"""
    files = sierra_scan_files()
    if not files:
        return {"error": "Aucun fichier Sierra trouve", "data_dir": SIERRA_DATA_DIR}

    VOL_SIGMA_THRESHOLD = 0.5
    asset_classes = {}
    all_mr_signals = []

    for symbol, file_info in files.items():
        # Read last bar for this symbol
        data = sierra_read_last_bars(1, symbol)
        if "error" in data:
            continue

        signals_data = data.get("signals", {})
        deviations = data.get("deviations", {})
        greeks = data.get("greeks", {})

        price = signals_data.get("last")
        vwap = signals_data.get("vwap")

        # Extract zone levels
        zones = {}
        for key, val in deviations.items():
            if val is not None:
                zones[key] = val

        # Collect sigma values from greeks and from all columns containing sigma
        sigma_values = []
        if "\u03c3" in greeks and greeks["\u03c3"] is not None:
            try:
                sigma_values.append(float(greeks["\u03c3"]))
            except (ValueError, TypeError):
                pass

        # Also scan studies for sigma-like values
        for key, val in data.get("studies", {}).items():
            if val is not None:
                try:
                    sigma_values.append(float(val))
                except (ValueError, TypeError):
                    pass

        # Detect vol synthetic signal: any sigma with abs > threshold
        vol_signal = any(abs(s) > VOL_SIGMA_THRESHOLD for s in sigma_values) if sigma_values else False

        # Detect mean reversion: check if price breached and returned from range levels
        mean_reversion = None
        if price is not None:
            for lvl_name in ["100%", "-100%", "75%", "-75%", "50%", "-50%"]:
                lvl_val = zones.get(lvl_name)
                if lvl_val is None:
                    continue
                try:
                    lvl_val = float(lvl_val)
                except (ValueError, TypeError):
                    continue
                if lvl_val == 0:
                    continue
                is_upper = not lvl_name.startswith("-")
                if is_upper and price > lvl_val:
                    mean_reversion = {"level": lvl_name, "price": lvl_val, "direction": "above"}
                    break
                elif not is_upper and price < lvl_val:
                    mean_reversion = {"level": lvl_name, "price": lvl_val, "direction": "below"}
                    break

        # Collect MR signals for this asset
        mr_data = sierra_mean_reversion_signals(20, symbol)
        if "signals" in mr_data:
            all_mr_signals.extend(mr_data["signals"][-5:])

        # Format last update time
        last_update = ""
        date_val = signals_data.get("date", "")
        time_val = signals_data.get("time", "")
        if date_val:
            last_update = f"{date_val} {time_val}".strip()

        # Group by asset class
        asset_class = file_info["asset_class"]
        if asset_class not in asset_classes:
            asset_classes[asset_class] = {"assets": {}}

        asset_classes[asset_class]["assets"][symbol] = {
            "name": file_info["name"],
            "price": price,
            "vwap": vwap,
            "zones": zones,
            "sigma": sigma_values if sigma_values else [],
            "vol_signal": vol_signal,
            "mean_reversion": mean_reversion,
            "last_update": last_update,
        }

    # Sort MR signals by date/time (most recent first)
    all_mr_signals.sort(key=lambda s: (s.get("date", ""), s.get("time", "")), reverse=True)

    # Compute freshness from most recent file
    newest_mtime = 0
    for sym, info in files.items():
        try:
            mt = os.path.getmtime(info["path"])
            if mt > newest_mtime:
                newest_mtime = mt
        except:
            pass
    data_age = round(time.time() - newest_mtime) if newest_mtime else None

    return {
        "asset_classes": asset_classes,
        "signals": all_mr_signals[:20],
        "files_detected": len(files),
        "file_modified": datetime.fromtimestamp(newest_mtime).isoformat() if newest_mtime else None,
        "data_age_seconds": data_age,
        "is_stale": data_age > 300 if data_age else True,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
