"""
FLO.W — Weekly Range Signal Engine
Détecte les touches de niveaux % sur les charts RangeWeek.
Génère des signaux Futures + Stratégies Options optimales.
"""
import os
import json
import time
from datetime import datetime, timezone
from services.sierra_reader import sierra_get_csv_path, SIERRA_ASSETS

STORE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "range_signals.json")

# Assets RangeWeek avec leur ticker option
RANGE_ASSETS = {
    "SPY-NQTV-RangeWeek": {"name": "SPY", "option_ticker": "SPY", "futures": "ES", "tick": 0.01, "multiplier": 100},
    "NQ-RangeWeek": {"name": "NQ", "option_ticker": "QQQ", "futures": "NQ", "tick": 0.25, "multiplier": 20},
    "YM-RangeWeek": {"name": "YM", "option_ticker": "DIA", "futures": "YM", "tick": 1.0, "multiplier": 5},
    "RTY-RangeWeek": {"name": "RTY", "option_ticker": "IWM", "futures": "RTY", "tick": 0.1, "multiplier": 50},
}

# Column indices for range levels (SPY/NQ/YM structure)
# RTY has offset -8 on these columns
RANGE_COLS_STANDARD = {
    "PWAP": 55, "U1": 56, "L1": 57, "U2": 58, "L2": 59, "U3": 60, "L3": 61,
    "RF": 54,
    "25%+": 64, "25%-": 65, "50%+": 66, "50%-": 67,
    "75%+": 68, "75%-": 69, "100%+": 70, "100%-": 71,
    "125%+": 72, "125%-": 73, "150%+": 74, "150%-": 75,
    "175%+": 76, "175%-": 77, "200%+": 78, "200%-": 79,
    "225%+": 80, "225%-": 81, "250%+": 82, "250%-": 83,
    "275%+": 84, "275%-": 85, "300%+": 86, "300%-": 87,
}

RANGE_COLS_RTY = {
    "PWAP": 47, "RF": 46,
    "25%+": 56, "25%-": 57, "50%+": 58, "50%-": 59,
    "75%+": 60, "75%-": 61, "100%+": 62, "100%-": 63,
    "125%+": 64, "125%-": 65, "150%+": 66, "150%-": 67,
    "175%+": 68, "175%-": 69, "200%+": 70, "200%-": 71,
    "225%+": 72, "225%-": 73, "250%+": 74, "250%-": 75,
    "275%+": 76, "275%-": 77, "300%+": 78, "300%-": 79,
}

# Stratégie par zone de range
ZONE_STRATEGIES = {
    # Zone proche du centre (0-25%) : range normal, vendre premium
    "inside_25": {
        "bias": "NEUTRE",
        "futures": {"action": "AUCUN", "description": "Pas de signal directionnel dans le range normal"},
        "options": [
            {"strategy": "Iron Condor", "reason": "Range étroit, vendre premium des 2 côtés", "params": "Sell 25%+/- strikes, Buy 50%+/- strikes, DTE 7-14j"},
            {"strategy": "Short Strangle", "reason": "Collecter du theta dans la zone neutre", "params": "Sell 50%+ Call / 50%- Put, DTE 7-14j"},
        ],
    },
    # Zone 25-50% : début d'extension
    "25_50": {
        "bias": "DIRECTIONNEL FAIBLE",
        "options": [
            {"strategy": "Credit Spread", "reason": "Extension modérée, vendre premium côté extension", "params": "Sell strike au niveau touché, Buy 25% plus loin, DTE 7-14j"},
            {"strategy": "Jade Lizard", "reason": "Biais directionnel faible avec protection", "params": "Sell Put spread + Sell naked Call côté opposé, DTE 14-21j"},
        ],
    },
    # Zone 50-75% : extension significative
    "50_75": {
        "bias": "MEAN REVERSION PROBABLE",
        "options": [
            {"strategy": "Credit Spread agressif", "reason": "Extension suffisante pour MR, vendre premium côté extension", "params": "Sell strike à 25%+/-, Buy à 50%+/-, DTE 5-10j"},
            {"strategy": "Butterfly", "reason": "Cibler le retour au PWAP", "params": "Center au PWAP, wings à 25%+/-, DTE 7-14j"},
        ],
    },
    # Zone 75-100% : forte extension
    "75_100": {
        "bias": "MEAN REVERSION FORT",
        "options": [
            {"strategy": "Short vertical agressif", "reason": "Forte probabilité de retour, vendre premium cher", "params": "Sell strike à 75%, Buy à 100%, DTE 3-7j"},
            {"strategy": "Put/Call Spread directionnel", "reason": "Jouer le retour vers PWAP", "params": "Buy ATM, Sell 50% level, DTE 5-10j, objectif PWAP"},
            {"strategy": "1x2 Ratio Spread", "reason": "Profiter du retour + collect premium", "params": "Buy 1x ATM, Sell 2x au PWAP, DTE 7-14j"},
        ],
    },
    # Zone 100-150% : extension extrême
    "100_150": {
        "bias": "MEAN REVERSION TRES FORT",
        "options": [
            {"strategy": "Short Straddle au niveau", "reason": "Extension extrême, IV élevée, max premium", "params": "Sell Straddle ATM au niveau touché, DTE 3-7j"},
            {"strategy": "Debit Spread directionnel", "reason": "Jouer le snap-back agressif vers PWAP", "params": "Buy ATM, Sell 50%, DTE 3-7j, gestion rapide"},
            {"strategy": "Broken Wing Butterfly", "reason": "Credit + directionnel vers PWAP", "params": "Center à 75%, skip-strike côté extension, DTE 5-10j"},
        ],
    },
    # Zone 150%+ : extension historique
    "150_plus": {
        "bias": "MEAN REVERSION EXTREME — CONTRARIAN",
        "options": [
            {"strategy": "Sell premium max", "reason": "IV en pic, extension historique, vendre tout", "params": "Sell Straddle ou Strangle ATM, DTE 3-5j, sizing réduit (risque élevé)"},
            {"strategy": "Debit Spread agressif", "reason": "Jouer le retour violent", "params": "Buy ATM, Sell 100%, DTE 3-5j"},
            {"strategy": "Calendar Spread", "reason": "Si IV très haute : vendre court terme, acheter long terme", "params": "Sell weekly ATM, Buy monthly ATM"},
        ],
    },
}


def _get_range_cols(symbol):
    """Get correct column indices based on asset"""
    if "RTY" in symbol:
        return RANGE_COLS_RTY
    return RANGE_COLS_STANDARD


def _parse_bar(cols, range_cols):
    """Parse a CSV line into structured bar data"""
    try:
        bar = {
            "date": cols[0].strip(),
            "time": cols[1].strip()[:8],
            "open": float(cols[2]),
            "high": float(cols[3]),
            "low": float(cols[4]),
            "last": float(cols[5]),
            "volume": float(cols[6]) if len(cols) > 6 else 0,
        }
        # Range levels
        bar["levels"] = {}
        for name, idx in range_cols.items():
            if idx < len(cols):
                try:
                    val = float(cols[idx].strip())
                    bar["levels"][name] = val
                except:
                    bar["levels"][name] = 0
            else:
                bar["levels"][name] = 0
        return bar
    except:
        return None


def _determine_zone(pct_level):
    """Determine which zone a % level falls into"""
    pct = abs(int(pct_level.replace("%+", "").replace("%-", "")))
    if pct <= 25:
        return "inside_25"
    elif pct <= 50:
        return "25_50"
    elif pct <= 75:
        return "50_75"
    elif pct <= 100:
        return "75_100"
    elif pct <= 150:
        return "100_150"
    else:
        return "150_plus"


def _futures_signal(pct_level, price, pwap, is_upper):
    """Generate futures signal based on level and direction"""
    zone = _determine_zone(pct_level)
    pct_val = abs(int(pct_level.replace("%+", "").replace("%-", "")))

    if pct_val < 50:
        return {"action": "AUCUN", "description": "Pas de signal futures dans cette zone"}

    if is_upper:
        # Price extended upward → SHORT signal
        direction = "SHORT"
        entry = price
        target = pwap if pwap > 0 else price * 0.99
        # Stop au-dessus du prochain niveau
        stop_distance = abs(price - pwap) * 0.5
        stop = price + stop_distance
        rr = abs(entry - target) / abs(stop - entry) if abs(stop - entry) > 0 else 0
    else:
        # Price extended downward → LONG signal
        direction = "LONG"
        entry = price
        target = pwap if pwap > 0 else price * 1.01
        stop_distance = abs(price - pwap) * 0.5
        stop = price - stop_distance
        rr = abs(target - entry) / abs(entry - stop) if abs(entry - stop) > 0 else 0

    # Conviction based on zone
    conviction_map = {
        "inside_25": 0, "25_50": 1, "50_75": 2,
        "75_100": 3, "100_150": 4, "150_plus": 5,
    }
    conviction = conviction_map.get(zone, 0)
    conviction_label = ["AUCUNE", "FAIBLE", "MOYENNE", "FORTE", "TRES FORTE", "EXTREME"][min(conviction, 5)]

    return {
        "action": direction,
        "entry": round(entry, 2),
        "target": round(target, 2),
        "stop": round(stop, 2),
        "risk_reward": round(rr, 2),
        "conviction": conviction,
        "conviction_label": conviction_label,
        "description": f"MR {direction} — Prix en extension {pct_level}, retour attendu vers PWAP ({pwap:.2f})",
    }


def _option_strategies(pct_level, price, levels, is_upper, asset_info):
    """Generate option strategy recommendations"""
    zone = _determine_zone(pct_level)
    zone_config = ZONE_STRATEGIES.get(zone, ZONE_STRATEGIES["inside_25"])

    pwap = levels.get("PWAP", 0)
    ticker = asset_info.get("option_ticker", "SPY")

    strategies = []
    for opt in zone_config.get("options", []):
        strat = {
            "strategy": opt["strategy"],
            "reason": opt["reason"],
            "params": opt["params"],
            "ticker": ticker,
            "bias": zone_config["bias"],
            "zone": zone,
            "direction": "BEARISH" if is_upper else "BULLISH",
            "key_levels": {
                "entry_price": round(price, 2),
                "pwap": round(pwap, 2) if pwap > 0 else None,
            },
        }

        # Add specific strike suggestions based on levels
        strike_suggestions = {}
        for lvl_name in ["25%+", "25%-", "50%+", "50%-", "75%+", "75%-", "100%+", "100%-"]:
            val = levels.get(lvl_name, 0)
            if val > 0:
                strike_suggestions[lvl_name] = round(val, 2)
        strat["strike_suggestions"] = strike_suggestions

        strategies.append(strat)

    return strategies


def detect_range_signals(bars=500):
    """Scan all RangeWeek assets for range level touches.
    Returns signals with futures + options recommendations."""

    all_signals = []

    for symbol, asset_info in RANGE_ASSETS.items():
        csv_path = sierra_get_csv_path(symbol)
        if not csv_path:
            continue

        range_cols = _get_range_cols(symbol)

        try:
            with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            if len(lines) < 2:
                continue

            header = [h.strip() for h in lines[0].split(",")]

            # Parse last N bars
            recent_bars = []
            for line in lines[-bars:]:
                cols = [c.strip() for c in line.split(",")]
                bar = _parse_bar(cols, range_cols)
                if bar and bar["last"] > 0:
                    recent_bars.append(bar)

            if not recent_bars:
                continue

            # Detect touches/crossings
            pct_levels = [
                "25%+", "25%-", "50%+", "50%-", "75%+", "75%-",
                "100%+", "100%-", "125%+", "125%-", "150%+", "150%-",
                "175%+", "175%-", "200%+", "200%-", "250%+", "250%-", "300%+", "300%-",
            ]

            for i, bar in enumerate(recent_bars):
                price = bar["last"]
                high = bar["high"]
                low = bar["low"]
                levels = bar["levels"]
                pwap = levels.get("PWAP", 0)
                rf = levels.get("RF", 0)

                for pct in pct_levels:
                    level_val = levels.get(pct, 0)
                    if level_val <= 0:
                        continue

                    is_upper = "+" in pct
                    distance_pct = abs(price - level_val) / price * 100

                    # Touch detection: price within 0.15% of level
                    # OR bar high/low crossed the level
                    touched = False
                    cross_type = None

                    if distance_pct < 0.15:
                        touched = True
                        cross_type = "TOUCH"
                    elif is_upper and high >= level_val and price < level_val:
                        touched = True
                        cross_type = "WICK_ABOVE"
                    elif not is_upper and low <= level_val and price > level_val:
                        touched = True
                        cross_type = "WICK_BELOW"
                    elif is_upper and price >= level_val:
                        touched = True
                        cross_type = "BREAK_ABOVE"
                    elif not is_upper and price <= level_val:
                        touched = True
                        cross_type = "BREAK_BELOW"

                    if not touched:
                        continue

                    # Generate signal
                    zone = _determine_zone(pct)
                    futures_sig = _futures_signal(pct, price, pwap, is_upper)
                    options_sig = _option_strategies(pct, price, levels, is_upper, asset_info)

                    signal = {
                        "symbol": symbol,
                        "asset": asset_info["name"],
                        "futures_ticker": asset_info["futures"],
                        "option_ticker": asset_info["option_ticker"],
                        "date": bar["date"],
                        "time": bar["time"],
                        "price": round(price, 2),
                        "level": pct,
                        "level_price": round(level_val, 2),
                        "cross_type": cross_type,
                        "zone": zone,
                        "distance_pct": round(distance_pct, 3),
                        "rf": rf,
                        "pwap": round(pwap, 2) if pwap > 0 else None,
                        "bias": ZONE_STRATEGIES.get(zone, {}).get("bias", "?"),
                        "futures_signal": futures_sig,
                        "option_strategies": options_sig,
                    }

                    all_signals.append(signal)

        except Exception as e:
            continue

    # Deduplicate: keep only the latest signal per asset+level combo
    seen = {}
    for sig in all_signals:
        key = f"{sig['symbol']}|{sig['level']}"
        seen[key] = sig  # last one wins (most recent)

    unique_signals = sorted(seen.values(), key=lambda s: (s["date"], s["time"]), reverse=True)

    return {
        "signals": unique_signals,
        "count": len(unique_signals),
        "assets_scanned": len(RANGE_ASSETS),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def get_current_position():
    """Get current position in range for all assets — snapshot view"""
    positions = {}

    for symbol, asset_info in RANGE_ASSETS.items():
        csv_path = sierra_get_csv_path(symbol)
        if not csv_path:
            continue

        range_cols = _get_range_cols(symbol)

        try:
            with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            if len(lines) < 2:
                continue

            cols = [c.strip() for c in lines[-1].split(",")]
            bar = _parse_bar(cols, range_cols)
            if not bar or bar["last"] <= 0:
                continue

            price = bar["last"]
            levels = bar["levels"]
            pwap = levels.get("PWAP", 0)
            rf = levels.get("RF", 0)

            # Find nearest levels above and below
            above = []
            below = []
            for pct in ["25%+", "50%+", "75%+", "100%+", "125%+", "150%+", "200%+", "250%+", "300%+"]:
                val = levels.get(pct, 0)
                if val > 0:
                    if val > price:
                        above.append({"level": pct, "price": round(val, 2), "distance_pct": round((val - price) / price * 100, 3)})
                    else:
                        below.append({"level": pct, "price": round(val, 2), "distance_pct": round((price - val) / price * 100, 3)})

            for pct in ["25%-", "50%-", "75%-", "100%-", "125%-", "150%-", "200%-", "250%-", "300%-"]:
                val = levels.get(pct, 0)
                if val > 0:
                    if val < price:
                        below.append({"level": pct, "price": round(val, 2), "distance_pct": round((price - val) / price * 100, 3)})
                    else:
                        above.append({"level": pct, "price": round(val, 2), "distance_pct": round((val - price) / price * 100, 3)})

            above.sort(key=lambda x: x["distance_pct"])
            below.sort(key=lambda x: x["distance_pct"])

            # Current zone
            nearest = (above[0] if above else None) or (below[0] if below else None)
            current_zone = "unknown"
            if nearest:
                current_zone = _determine_zone(nearest["level"])

            mtime = os.path.getmtime(csv_path)

            positions[asset_info["name"]] = {
                "price": round(price, 2),
                "pwap": round(pwap, 2) if pwap > 0 else None,
                "rf": rf,
                "distance_pwap_pct": round((price - pwap) / pwap * 100, 3) if pwap > 0 else None,
                "nearest_above": above[:3],
                "nearest_below": below[:3],
                "current_zone": current_zone,
                "date": bar["date"],
                "time": bar["time"],
                "data_age_seconds": round(time.time() - mtime),
            }

        except Exception:
            continue

    return {
        "positions": positions,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def persist_signals(signals):
    """Save signals to JSON store"""
    store = {"signals": [], "stats": {"total": 0, "last_update": None}}
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, "r") as f:
                store = json.load(f)
        except:
            pass

    existing_keys = set()
    for s in store["signals"]:
        existing_keys.add(f"{s.get('symbol')}|{s.get('date')}|{s.get('time')}|{s.get('level')}")

    new_count = 0
    for sig in signals:
        key = f"{sig['symbol']}|{sig['date']}|{sig['time']}|{sig['level']}"
        if key not in existing_keys:
            sig["_collected_at"] = datetime.now(timezone.utc).isoformat()
            store["signals"].append(sig)
            existing_keys.add(key)
            new_count += 1

    # Keep last 5000
    if len(store["signals"]) > 5000:
        store["signals"] = store["signals"][-5000:]

    store["stats"]["total"] = len(store["signals"])
    store["stats"]["last_update"] = datetime.now(timezone.utc).isoformat()

    if new_count > 0:
        with open(STORE_FILE, "w") as f:
            json.dump(store, f, indent=1)

    return new_count
