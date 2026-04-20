"""Sierra Chart CSV reader — multi-asset signal analysis"""
import os
from fastapi import APIRouter, Query
from services.sierra_reader import (
    sierra_scan_files, sierra_read_last_bars, sierra_read_history,
    sierra_mean_reversion_signals, sierra_columns, sierra_dashboard,
    sierra_performance, sierra_gex_analysis
)
from services.signal_store import collect_signals, get_stored_signals, get_store_summary
from services.range_signals import detect_range_signals, get_current_position, persist_signals as persist_range_signals
from services.sigma_signals import detect_sigma_signals, detect_hundred_pct_signals
from services.range_dashboard import read_range_dashboard
from services.range_matrix import compute_range_matrix

router = APIRouter()

@router.get("/files")
def list_files():
    return sierra_scan_files()

@router.get("/signals")
def signals(symbol: str = "USEquities"):
    return sierra_read_last_bars(1, symbol)

@router.get("/last")
def last_bars(symbol: str = "USEquities", n: int = 20):
    return sierra_read_last_bars(n, symbol)

@router.get("/history")
def history(symbol: str = "USEquities", bars: int = 200):
    return sierra_read_history(bars, symbol)

@router.get("/columns")
def columns(symbol: str = "USEquities"):
    return sierra_columns(symbol)

@router.get("/zones")
def zones(symbol: str = "USEquities"):
    data = sierra_read_last_bars(1, symbol)
    if "deviations" in data:
        z = data["deviations"]
        z["symbol"] = symbol
        z["price"] = data.get("signals", {}).get("last")
        z["vwap"] = data.get("signals", {}).get("vwap")
        return z
    return data

@router.get("/mean-reversion")
def mean_reversion(symbol: str = "USEquities", bars: int = 100):
    result = sierra_mean_reversion_signals(bars, symbol)
    # Persist signals automatically
    if "signals" in result and result["signals"]:
        new_count = collect_signals(result["signals"], symbol)
        result["_persisted"] = new_count
    return result

@router.get("/dashboard")
def dashboard():
    return sierra_dashboard()

@router.get("/performance")
def performance(symbol: str = "USEquities"):
    return sierra_performance(symbol)

@router.get("/performance-all")
def performance_all():
    files = sierra_scan_files()
    all_perf = {}
    for sym in files:
        all_perf[sym] = sierra_performance(sym)
    return {"assets": all_perf, "asset_count": len(all_perf)}

@router.get("/daily-ranges")
def daily_ranges(days: int = 10):
    """Compute daily OHLC ranges from all Sierra CSV files.
    Reads Date(col0), Open(col2), High(col3), Low(col4), Last(col5) by INDEX
    to avoid duplicate column name issues.
    Filters to meaningful assets only (no raw timeframes, no GEX sub-charts, etc.)."""
    from services.sierra_reader import sierra_scan_files, sierra_get_csv_path
    files = sierra_scan_files()

    # Only include meaningful assets — skip raw timeframe files, GEX sub-charts,
    # DiscordStream variants, TICK breadth, and duplicate range week files
    INCLUDE_SYMBOLS = {
        # Indices
        "ESM6.CME", "NQM6.CME", "YMM6.CBOT", "RTYM6.CME", "USEquities",
        # Range Week
        "SPY-NQTV-RangeWeek", "NQ-RangeWeek", "YM-RangeWeek", "RTY-RangeWeek",
        # EUREX
        "Bund", "EUSTX50", "GER30",
        # Volatility
        "VXX-NQTV", "VOLX",
        # Inverse
        "SPXS-NQTV",
        # Treasuries
        "UST-ZN", "UST-ZB", "UST-ZF", "UST-UB", "UST-10YX",
        # Grains
        "ZWK6.CBOT", "ZSK6.CBOT", "ZCU6.CBOT", "ZMK6.CBOT",
    }

    result = {}
    for sym in files:
        if sym not in INCLUDE_SYMBOLS:
            continue
        csv_path = sierra_get_csv_path(sym)
        if not csv_path:
            continue
        try:
            with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            if len(lines) < 2:
                continue
            # Use fixed column indices: 0=Date, 1=Time, 2=Open, 3=High, 4=Low, 5=Last
            daily = {}
            for line in lines[-3000:]:  # Last 3000 bars max
                cols = [c.strip() for c in line.split(",")]
                if len(cols) < 6:
                    continue
                date = cols[0].strip()
                if not date or date == "Date":
                    continue
                try:
                    o = float(cols[2])
                    h = float(cols[3])
                    l = float(cols[4])
                    c = float(cols[5])
                except (ValueError, IndexError):
                    continue
                if c <= 0:
                    continue  # Skip invalid prices
                if date not in daily:
                    daily[date] = {"open": o, "high": h, "low": l, "close": c}
                else:
                    d = daily[date]
                    if h > d["high"]: d["high"] = h
                    if l < d["low"]: d["low"] = l
                    d["close"] = c
            # Take last N days
            sorted_days = sorted(daily.keys())[-days:]
            ranges = []
            prev_close = None
            for dt in sorted_days:
                d = daily[dt]
                range_pts = round(d["high"] - d["low"], 4)
                range_pct = round(range_pts / d["close"] * 100, 4) if d["close"] else 0
                rv_daily = round(abs(d["close"] - prev_close) / prev_close * 100, 4) if prev_close and prev_close != 0 else None
                change_pct = round((d["close"] - prev_close) / prev_close * 100, 4) if prev_close and prev_close != 0 else None
                ranges.append({
                    "date": dt,
                    "open": round(d["open"], 4),
                    "high": round(d["high"], 4),
                    "low": round(d["low"], 4),
                    "close": round(d["close"], 4),
                    "range_pts": range_pts,
                    "range_pct": range_pct,
                    "rv_daily": rv_daily,
                    "change_pct": change_pct,
                })
                prev_close = d["close"]
            meta = files[sym]
            result[sym] = {
                "name": meta["name"],
                "asset_class": meta["asset_class"],
                "days": ranges,
                "latest": ranges[-1] if ranges else None,
            }
        except Exception:
            continue
    return {"assets": result, "asset_count": len(result)}

@router.get("/gex-analysis")
def gex_analysis(bars: int = 5000):
    """Analyse Total GEX crossings, distribution, and time series from SP500GEX"""
    return sierra_gex_analysis(bars)

@router.get("/signal-history")
def signal_history():
    """Return pre-computed 5-day signal history from all Sierra CSVs"""
    import json
    history_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sierra_signal_history.json")
    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            return json.load(f)
    return {"error": "Historique non genere. Lancer le script d'extraction."}

# ================================================================
# Signal Store — Persistence permanente
# ================================================================

@router.get("/store/signals")
def store_signals(symbol: str = None, days: int = None, min_strength: int = 0):
    """Récupère les signaux persistés (survivent après suppression Sierra).
    Filtres: symbol, days (derniers N jours), min_strength (0-4)."""
    return get_stored_signals(symbol, days, min_strength)

@router.get("/store/summary")
def store_summary():
    """Résumé du store: nb signaux par symbole, dates, stats."""
    return get_store_summary()

@router.get("/store/collect-all")
def store_collect_all():
    """Collecte les signaux de TOUS les fichiers Sierra et les persiste."""
    files = sierra_scan_files()
    total_new = 0
    collected = {}
    for sym in files:
        result = sierra_mean_reversion_signals(200, sym)
        if "signals" in result and result["signals"]:
            new = collect_signals(result["signals"], sym)
            total_new += new
            collected[sym] = {"detected": len(result["signals"]), "new_persisted": new}
    return {
        "status": "ok",
        "total_new_signals": total_new,
        "assets_scanned": len(files),
        "details": collected,
    }

# ================================================================
# Range Weekly Signals — Futures + Options
# ================================================================

@router.get("/discord-stream")
def discord_stream(bars: int = 500):
    """Données DiscordStream: Notional Delta SPX/QQQ/SPY + GEX levels ES."""
    from services.sierra_reader import sierra_read_history, sierra_get_csv_path
    import time as _time
    import os
    result = {}

    # DiscordStream main: SPX + QQQ + SPY Notional Delta (cols 13-21)
    csv_path = sierra_get_csv_path("DiscordStream")
    if csv_path:
        try:
            mtime = os.path.getmtime(csv_path)
            with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            header = [h.strip() for h in lines[0].split(",")]
            data = []
            for line in lines[-bars:]:
                cols = [c.strip() for c in line.split(",")]
                if len(cols) < 22 or cols[0] == "Date":
                    continue
                try:
                    row = {
                        "date": cols[0], "time": cols[1].strip()[:8],
                        "price": float(cols[5]),
                        "spx_notional_delta": float(cols[13]) if cols[13] else 0,
                        "spx_call_buysell": float(cols[14]) if cols[14] else 0,
                        "spx_put_buysell": float(cols[15]) if cols[15] else 0,
                        "qqq_notional_delta": float(cols[16]) if cols[16] else 0,
                        "qqq_call_buysell": float(cols[17]) if cols[17] else 0,
                        "qqq_put_buysell": float(cols[18]) if cols[18] else 0,
                        "spy_notional_delta": float(cols[19]) if cols[19] else 0,
                        "spy_call_buysell": float(cols[20]) if cols[20] else 0,
                        "spy_put_buysell": float(cols[21]) if cols[21] else 0,
                    }
                    data.append(row)
                except Exception:
                    continue
            result["notional_delta"] = {
                "data": data,
                "count": len(data),
                "data_age_seconds": round(_time.time() - mtime),
                "is_stale": (_time.time() - mtime) > 300,
            }
        except Exception as e:
            result["notional_delta"] = {"error": str(e)}

    # DiscordStream-ES5s: GEX + Delta + GTS (already used by gex_analysis)
    # DiscordStream-ES30s-Zones: GEX levels/zones
    csv_path_zones = sierra_get_csv_path("DiscordStream-ES30s-Zones")
    if csv_path_zones:
        try:
            mtime = os.path.getmtime(csv_path_zones)
            with open(csv_path_zones, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            header = [h.strip() for h in lines[0].split(",")]
            # Last bar only for current levels
            last = [c.strip() for c in lines[-1].split(",")]
            levels = {}
            for i, h in enumerate(header):
                if i < len(last) and h and h not in ("Date", "Time", "Open", "High", "Low", "Last", "Volume", "# of Trades"):
                    try:
                        v = float(last[i])
                        if v != 0:
                            levels[h] = v
                    except Exception:
                        pass
            result["gex_zones"] = {
                "levels": levels,
                "price": float(last[5]) if len(last) > 5 else None,
                "date": last[0], "time": last[1][:8] if len(last) > 1 else "",
                "data_age_seconds": round(_time.time() - mtime),
            }
        except Exception as e:
            result["gex_zones"] = {"error": str(e)}

    return result

@router.get("/range-signals")
def range_signals(bars: int = 500):
    """Détecte les touches de niveaux % hebdomadaires.
    Retourne signaux Futures (entry/target/stop) + stratégies Options optimales."""
    result = detect_range_signals(bars)
    # Persist automatically
    if result.get("signals"):
        new = persist_range_signals(result["signals"])
        result["_persisted"] = new
    return result

@router.get("/range-position")
def range_position():
    """Position actuelle dans le range hebdo pour chaque actif.
    Niveaux les plus proches au-dessus et en-dessous."""
    return get_current_position()

# ================================================================
# Sigma + 100% level signals (live feeds refreshed every 10s)
# ================================================================

@router.get("/sigma-signals")
def sigma_signals():
    """Signaux sigma: depassement de la volatilite realisee 22j.
    Equivalent du sigma vert visuel Sierra.
    Declenche quand |log_ret_jour| >= RV22/sqrt(252) * 1.0"""
    return detect_sigma_signals()

@router.get("/hundred-pct-signals")
def hundred_pct_signals():
    """Signaux de touche du niveau 100%+/- hebdomadaire par actif."""
    return detect_hundred_pct_signals()

@router.get("/range-matrix")
def range_matrix(days: int = 30, baseline_window: int = 20, live: bool = True):
    """Matrice assets x dates du range journalier (H-L)/Close en % et en
    ratio vs baseline (moyenne mobile N jours). Couvre FX, Treasuries, Indices,
    Metaux, Energie, Grains et Crypto. Equivaut au 'Range Week' de Sierra Chart.

    Par defaut (live=True) renvoie le dernier snapshot calcule par le scheduler
    (jours passes figes, jour courant rafraichi toutes les 5 minutes).
    Passer live=false pour forcer un recalcul complet a la demande."""
    if live:
        from services.range_scheduler import get_latest_matrix
        cached = get_latest_matrix()
        if cached is not None:
            return cached
    return compute_range_matrix(days=days, baseline_window=baseline_window)


@router.get("/range-dashboard")
def range_dashboard():
    """Lit le fichier Sierra 'RangeDash-BarStudyData.txt' produit par
    le chart Range Dashboard. Si le fichier n'existe pas encore, retourne
    un fallback construit depuis les fichiers RangeWeek."""
    return read_range_dashboard()


@router.get("/range-scheduler/status")
def range_scheduler_status():
    """Etat du scheduler qui refresh la range matrix toutes les 5 minutes."""
    from services.range_scheduler import get_status
    return get_status()


@router.post("/range-scheduler/refresh")
def range_scheduler_refresh():
    """Force un refresh immediat (bypass du cache 60s)."""
    from services.range_scheduler import force_refresh
    return force_refresh()


@router.get("/range-intraday")
def range_intraday(trading_date: str | None = None, symbol: str | None = None, limit: int = 200):
    """Historique intraday des snapshots de range (toutes les 5 minutes).
    - trading_date : 'YYYY-MM-DD' pour filtrer un jour precis
    - symbol : sym pour recuperer la serie temporelle d'un seul actif
    - limit : nombre max de snapshots retournes (most recent first)."""
    from services.range_scheduler import get_intraday_history
    return get_intraday_history(trading_date=trading_date, symbol=symbol, limit=limit)

@router.get("/ibs")
def ibs():
    """IBS (Internal Bar Strength) statistics for SPY daily bars.
    Returns monthly IBS heatmap, monthly returns heatmap, quintile stats,
    IBS distribution histogram, and current-day IBS KPI."""
    from services.ibs_engine import compute_ibs
    return compute_ibs()


@router.get("/live-alerts")
def live_alerts():
    """Feed unifie: sigma breakthroughs + 100% touches pour la sidebar/banner."""
    sigma = detect_sigma_signals()
    hundred = detect_hundred_pct_signals()
    # Normalise pour un feed unique
    alerts = []
    for s in sigma.get("signals", []):
        alerts.append({
            "type": "SIGMA",
            "symbol": s["symbol"],
            "name": s.get("name", s["symbol"]),
            "direction": s.get("direction", ""),
            "intensity": s.get("intensity", ""),
            "strength": s.get("strength", 0),
            "detail": f"Move {s.get('log_ret_pct', 0):+.2f}% ({s.get('sigma_mult', 0):.1f}sigma, RV22={s.get('rv22_annual_pct', 0):.1f}%)",
            "date": s.get("date", ""),
            "price": s.get("price", 0),
        })
    for h in hundred.get("signals", []):
        alerts.append({
            "type": "LEVEL_100",
            "symbol": h.get("asset", h.get("symbol", "")),
            "name": h.get("asset", ""),
            "direction": "DOWN" if "+" in h.get("level", "") else "UP",
            "intensity": h.get("bias", ""),
            "strength": 4 if "150" in h.get("level", "") else 3,
            "detail": f"Touche {h.get('level', '')} a {h.get('level_price', 0)} — {h.get('cross_type', '')}",
            "date": h.get("date", ""),
            "time": h.get("time", ""),
            "price": h.get("price", 0),
        })
    # Tri par force decroissante
    alerts.sort(key=lambda a: a.get("strength", 0), reverse=True)
    return {
        "alerts": alerts,
        "sigma_count": sigma.get("signal_count", 0),
        "hundred_pct_count": hundred.get("count", 0),
        "total": len(alerts),
        "timestamp": sigma.get("timestamp"),
    }
