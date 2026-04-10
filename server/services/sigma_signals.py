"""
FLO.W — Sigma Signals (22-day realized volatility breakthrough)

Detecte quand la volatilite realisee courante depasse la RV22 (annualisee).
Equivalent du signal "sigma vert" visuel sur Sierra Chart.

Formule:
  - log_ret_t = ln(Close_t / Close_{t-1})
  - RV22 = sqrt(sum(r_i^2) / 22) * sqrt(252)   (annualisee, non centree)
  - Signal declenche quand:
      * Le |log_ret_today| > RV22 / sqrt(252) * k  (k = multiplicateur intraday)
      * OU le range (H-L)/C exprime en daily vol > RV22 / sqrt(252) * k
  - Intensite = ratio / threshold
"""
import os
import math
import time
from datetime import datetime, timezone
from services.sierra_reader import sierra_scan_files, sierra_get_csv_path

# Assets a scanner pour les signaux sigma (on filtre les "utiles")
SIGMA_ASSETS = {
    "ESM6.CME", "NQM6.CME", "YMM6.CBOT", "RTYM6.CME", "USEquities",
    "SPY-NQTV-RangeWeek", "NQ-RangeWeek", "YM-RangeWeek", "RTY-RangeWeek",
    "Bund", "GER30", "EUSTX50",
    "VXX-NQTV", "VOLX", "SPXS-NQTV",
    "UST-ZN", "UST-ZB", "UST-ZF", "UST-UB",
}

# Threshold multiplicateur sur daily RV pour declencher "breakthrough"
# 1.0 = move egal a 1 jour moyen ; 1.5 = move = 1.5 ecarts-type jour
SIGMA_THRESHOLD = 1.0
RV_WINDOW = 22
ANNUALIZATION = 252


def _read_daily_closes(csv_path, lookback_days=40):
    """Lit le CSV Sierra et agrege en daily OHLC. Retourne les derniers N jours."""
    try:
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception:
        return []

    if len(lines) < 2:
        return []

    daily = {}
    # Scanner les 10000 dernieres barres au max pour agreger
    for line in lines[-10000:]:
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
            continue
        if date not in daily:
            daily[date] = {"open": o, "high": h, "low": l, "close": c, "date": date}
        else:
            d = daily[date]
            if h > d["high"]:
                d["high"] = h
            if l < d["low"]:
                d["low"] = l
            d["close"] = c

    sorted_dates = sorted(daily.keys())[-lookback_days:]
    return [daily[d] for d in sorted_dates]


def _compute_rv22(daily_bars):
    """Calcule la volatilite realisee annualisee sur 22 jours.
    Retourne None si pas assez de donnees."""
    if len(daily_bars) < RV_WINDOW + 1:
        return None

    # Derniers RV_WINDOW log returns (exclut le jour courant)
    log_rets = []
    for i in range(len(daily_bars) - RV_WINDOW - 1, len(daily_bars) - 1):
        if i < 0:
            continue
        prev = daily_bars[i]["close"]
        curr = daily_bars[i + 1]["close"]
        if prev > 0 and curr > 0:
            log_rets.append(math.log(curr / prev))

    if len(log_rets) < RV_WINDOW // 2:
        return None

    # RV non-centree (sum squared returns / n)
    sum_sq = sum(r * r for r in log_rets)
    rv = math.sqrt(sum_sq / len(log_rets)) * math.sqrt(ANNUALIZATION)
    return rv  # annualisee (ex. 0.18 = 18%)


def _today_move(daily_bars):
    """Calcule le mouvement du jour courant en log-return et en range."""
    if len(daily_bars) < 2:
        return None

    prev = daily_bars[-2]
    curr = daily_bars[-1]
    prev_close = prev["close"]
    curr_close = curr["close"]

    if prev_close <= 0 or curr_close <= 0:
        return None

    log_ret = math.log(curr_close / prev_close)
    range_ret = (curr["high"] - curr["low"]) / prev_close if prev_close else 0

    return {
        "log_ret": log_ret,
        "log_ret_pct": log_ret * 100,
        "range_ret": range_ret,
        "range_ret_pct": range_ret * 100,
        "price": curr_close,
        "prev_close": prev_close,
        "high": curr["high"],
        "low": curr["low"],
        "date": curr["date"],
    }


def detect_sigma_signals():
    """Scan tous les assets eligibles et detecte les breakthroughs RV22.

    Retourne: {signals: [...], all_assets: [...], timestamp}
    """
    files = sierra_scan_files()
    results = []
    signals = []

    for symbol in files:
        if symbol not in SIGMA_ASSETS:
            continue

        csv_path = sierra_get_csv_path(symbol)
        if not csv_path:
            continue

        daily = _read_daily_closes(csv_path, lookback_days=RV_WINDOW + 10)
        if len(daily) < RV_WINDOW + 1:
            continue

        rv22 = _compute_rv22(daily)
        if rv22 is None or rv22 <= 0:
            continue

        move = _today_move(daily)
        if move is None:
            continue

        # Daily RV implicite = RV22 / sqrt(252)
        daily_rv = rv22 / math.sqrt(ANNUALIZATION)
        abs_log_ret = abs(move["log_ret"])

        # Ratio = combien de sigmas le move represente
        sigma_mult = abs_log_ret / daily_rv if daily_rv > 0 else 0
        range_mult = move["range_ret"] / daily_rv if daily_rv > 0 else 0

        # Direction du move
        direction = "UP" if move["log_ret"] > 0 else "DOWN"

        # Signal breakthrough: |log_ret| ou range >= threshold * daily_rv
        is_signal = sigma_mult >= SIGMA_THRESHOLD or range_mult >= (SIGMA_THRESHOLD * 1.5)

        # Niveau d'intensite
        max_mult = max(sigma_mult, range_mult / 1.5)
        if max_mult >= 2.5:
            intensity = "EXTREME"
            strength = 4
        elif max_mult >= 2.0:
            intensity = "TRES_FORT"
            strength = 3
        elif max_mult >= 1.5:
            intensity = "FORT"
            strength = 2
        elif max_mult >= 1.0:
            intensity = "STANDARD"
            strength = 1
        else:
            intensity = "CALME"
            strength = 0

        asset_info = {
            "symbol": symbol,
            "name": files[symbol].get("name", symbol),
            "asset_class": files[symbol].get("asset_class", "?"),
            "price": round(move["price"], 4),
            "prev_close": round(move["prev_close"], 4),
            "date": move["date"],
            "log_ret_pct": round(move["log_ret_pct"], 3),
            "range_ret_pct": round(move["range_ret_pct"], 3),
            "rv22_annual_pct": round(rv22 * 100, 2),
            "rv22_daily_pct": round(daily_rv * 100, 3),
            "sigma_mult": round(sigma_mult, 2),
            "range_mult": round(range_mult, 2),
            "direction": direction,
            "intensity": intensity,
            "strength": strength,
            "is_signal": is_signal,
        }

        results.append(asset_info)
        if is_signal:
            signals.append(asset_info)

    # Trier signaux par force decroissante
    signals.sort(key=lambda s: s["sigma_mult"], reverse=True)
    results.sort(key=lambda s: s["sigma_mult"], reverse=True)

    return {
        "signals": signals,
        "all_assets": results,
        "signal_count": len(signals),
        "asset_count": len(results),
        "threshold": SIGMA_THRESHOLD,
        "window": RV_WINDOW,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def detect_hundred_pct_signals():
    """Filtre les signaux range hebdomadaires pour ne garder que les niveaux 100%+/-.
    Retourne les touches actuelles les plus recentes par actif."""
    from services.range_signals import detect_range_signals

    result = detect_range_signals(bars=200)
    signals = result.get("signals", [])

    # Garder seulement 100%+/-
    hundred = [s for s in signals if s.get("level") in ("100%+", "100%-")]

    # Deduplique: un seul signal par asset + level (le plus recent)
    seen = {}
    for sig in hundred:
        key = f"{sig['symbol']}|{sig['level']}"
        if key not in seen:
            seen[key] = sig

    unique = sorted(seen.values(), key=lambda s: (s.get("date", ""), s.get("time", "")), reverse=True)

    return {
        "signals": unique,
        "count": len(unique),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
