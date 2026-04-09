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
    to avoid duplicate column name issues."""
    from services.sierra_reader import sierra_scan_files, sierra_get_csv_path
    files = sierra_scan_files()
    result = {}
    for sym in files:
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
                except:
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
                    except:
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
