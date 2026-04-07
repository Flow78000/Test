"""
VIX Regime Switching Engine — Citadel-Grade
3 layers: Dark Pool (DPSS) + GEX (Z-Score) + Flow Score
Output: 4 regimes (RISK_ON / PRUDENT / DEFENSIF / HEDGE)
AUCUNE POSITION — outil d'information tactique uniquement
"""
import os
import json
import subprocess
from datetime import datetime

# Regime history stored in JSON file
REGIME_HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "regime_history.json")
REGIME_SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "regime_settings.json")

UW_TOKEN = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")

# Default settings
DEFAULT_SETTINGS = {
    "dpss_bullish_threshold": 0.60,
    "dpss_bearish_threshold": 0.50,
    "dpss_rolling_window": 5,
    "dpss_min_print_premium": 1000000,
    "gex_zscore_window": 20,
    "flow_bullish_threshold": 0.30,
    "flow_bearish_threshold": -0.30,
    "whale_min_premium": 500000,
    "regime_confirmation_days": 2,
}


def load_settings():
    if os.path.exists(REGIME_SETTINGS_FILE):
        try:
            with open(REGIME_SETTINGS_FILE, "r") as f:
                saved = json.load(f)
                settings = DEFAULT_SETTINGS.copy()
                settings.update(saved)
                return settings
        except Exception:
            pass
    return DEFAULT_SETTINGS.copy()


def save_settings(settings):
    with open(REGIME_SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)


def load_regime_history():
    if os.path.exists(REGIME_HISTORY_FILE):
        try:
            with open(REGIME_HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"daily": [], "transitions": []}


def save_regime_history(history):
    with open(REGIME_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


# --- UW API helper ---

def curl_uw(endpoint):
    """Fetch from UW API via curl (avoids Python urllib 403 issue)"""
    try:
        result = subprocess.run(
            ["curl", "-s", f"https://api.unusualwhales.com/api{endpoint}",
             "-H", f"Authorization: Bearer {UW_TOKEN}",
             "-H", "Accept: application/json"],
            capture_output=True, text=True, timeout=15
        )
        return json.loads(result.stdout) if result.stdout else None
    except Exception as e:
        return {"error": str(e)}


# --- Layer 1: Dark Pool Proxy DIX (DPSS) ---

def compute_dpss(darkpool_prints, min_premium=1000000):
    """
    Compute Dark Pool Sentiment Score from UW darkpool prints.
    DPSS = bullish_volume / total_volume
    Direction: price >= nbbo_ask = BULLISH, price <= nbbo_bid = BEARISH
    """
    if not darkpool_prints:
        return None

    bullish_vol = 0
    bearish_vol = 0
    neutral_vol = 0
    total_premium = 0
    big_prints = 0

    for p in darkpool_prints:
        try:
            price = float(p.get("price", 0))
            size = int(p.get("size", 0))
            premium = float(p.get("premium", 0))
            bid = float(p.get("nbbo_bid", 0))
            ask = float(p.get("nbbo_ask", 0))

            if premium < min_premium:
                continue

            big_prints += 1
            total_premium += premium

            if price >= ask:
                bullish_vol += size
            elif price <= bid:
                bearish_vol += size
            else:
                neutral_vol += size
        except (ValueError, TypeError):
            continue

    total = bullish_vol + bearish_vol + neutral_vol
    if total == 0:
        return None

    dpss = bullish_vol / total

    return {
        "dpss": round(dpss, 4),
        "bullish_volume": bullish_vol,
        "bearish_volume": bearish_vol,
        "neutral_volume": neutral_vol,
        "total_volume": total,
        "big_prints_count": big_prints,
        "total_premium": total_premium,
        "signal": "ACCUMULATION" if dpss > 0.60 else "DISTRIBUTION" if dpss < 0.40 else "NEUTRE",
    }


# --- Layer 2: GEX Z-Score ---

def compute_gex_regime(gex_data):
    """
    Compute Net GEX from spot exposures by strike.
    Returns total net GEX, gamma flip point, and z-score info.
    """
    if not gex_data:
        return None

    total_call_gex = 0
    total_put_gex = 0
    gamma_by_strike = []

    for s in gex_data:
        try:
            strike = float(s.get("strike", 0))
            call_g = float(s.get("call_gamma_oi", 0))
            put_g = float(s.get("put_gamma_oi", 0))
            price = float(s.get("price", 0))

            total_call_gex += call_g
            total_put_gex += put_g
            net_g = call_g + put_g
            gamma_by_strike.append({
                "strike": strike,
                "call_gamma": call_g,
                "put_gamma": put_g,
                "net_gamma": net_g,
            })
        except (ValueError, TypeError):
            continue

    net_gex = total_call_gex + total_put_gex

    # Find gamma flip point (where net gamma changes sign)
    gamma_flip = None
    sorted_strikes = sorted(gamma_by_strike, key=lambda x: x["strike"])
    for i in range(1, len(sorted_strikes)):
        prev = sorted_strikes[i - 1]["net_gamma"]
        curr = sorted_strikes[i]["net_gamma"]
        if prev * curr < 0:  # Sign change
            gamma_flip = (sorted_strikes[i - 1]["strike"] + sorted_strikes[i]["strike"]) / 2
            break

    signal = "LONG_GAMMA" if net_gex > 0 else "SHORT_GAMMA"

    return {
        "net_gex": round(net_gex, 2),
        "total_call_gex": round(total_call_gex, 2),
        "total_put_gex": round(total_put_gex, 2),
        "gamma_flip_point": gamma_flip,
        "signal": signal,
        "top_strikes": sorted(gamma_by_strike, key=lambda x: abs(x["net_gamma"]), reverse=True)[:10],
    }


# --- Layer 3: Flow Score ---

def compute_flow_score(market_tide, flow_alerts, whale_min_premium=500000):
    """
    Composite flow score from Market Tide + Whale activity.
    Flow Score = 0.6*NPR + 0.4*whale_sentiment
    """
    # Net Premium Ratio from Market Tide
    npr = 0
    if market_tide:
        # Get latest entry
        latest = market_tide[-1] if isinstance(market_tide, list) else market_tide
        call_prem = float(latest.get("net_call_premium", 0))
        put_prem = float(latest.get("net_put_premium", 0))
        total_abs = abs(call_prem) + abs(put_prem)
        if total_abs > 0:
            npr = call_prem / total_abs  # -1 to +1

    # Whale Sentiment from Flow Alerts
    whale_calls = 0
    whale_puts = 0
    whale_total_premium = 0

    if flow_alerts:
        for alert in flow_alerts:
            prem = float(alert.get("total_premium", alert.get("premium", 0)))
            if prem < whale_min_premium:
                continue
            opt_type = alert.get("type", "").lower()
            if opt_type == "call":
                whale_calls += 1
            elif opt_type == "put":
                whale_puts += 1
            whale_total_premium += prem

    whale_total = whale_calls + whale_puts
    whale_sentiment = (whale_calls - whale_puts) / whale_total if whale_total > 0 else 0

    # Composite score
    flow_score = 0.6 * npr + 0.4 * whale_sentiment

    signal = "GREED" if flow_score > 0.5 else "BULLISH" if flow_score > 0.1 else "FEAR" if flow_score < -0.5 else "BEARISH" if flow_score < -0.1 else "NEUTRE"

    return {
        "flow_score": round(flow_score, 4),
        "npr": round(npr, 4),
        "whale_sentiment": round(whale_sentiment, 4),
        "whale_calls": whale_calls,
        "whale_puts": whale_puts,
        "whale_total_premium": whale_total_premium,
        "signal": signal,
    }


# --- Regime Engine ---

def determine_regime(dpss_result, gex_result, flow_result, settings=None):
    """
    Matrice 2x2 (DPSS x GEX) + Flow confirmation.
    Returns regime and confidence.
    """
    if not settings:
        settings = load_settings()

    dpss = dpss_result.get("dpss", 0.5) if dpss_result else 0.5
    gex_signal = gex_result.get("signal", "LONG_GAMMA") if gex_result else "LONG_GAMMA"
    flow_score = flow_result.get("flow_score", 0) if flow_result else 0

    # Axis 1: Dark Pool
    if dpss > settings["dpss_bullish_threshold"]:
        dp_signal = "ACCUMULATION"
    elif dpss < settings["dpss_bearish_threshold"]:
        dp_signal = "DISTRIBUTION"
    else:
        dp_signal = "NEUTRE"

    # Matrice 2x2
    if dp_signal == "ACCUMULATION" and gex_signal == "LONG_GAMMA":
        regime = "RISK_ON"
    elif dp_signal == "ACCUMULATION" and gex_signal == "SHORT_GAMMA":
        regime = "PRUDENT"
    elif dp_signal == "DISTRIBUTION" and gex_signal == "LONG_GAMMA":
        regime = "DEFENSIF"
    elif dp_signal == "DISTRIBUTION" and gex_signal == "SHORT_GAMMA":
        regime = "HEDGE"
    elif dp_signal == "NEUTRE" and gex_signal == "LONG_GAMMA":
        regime = "PRUDENT"
    else:
        regime = "DEFENSIF"

    # Flow confirmation/invalidation
    flow_adjusted = regime
    flow_flag = None

    order = ["RISK_ON", "PRUDENT", "DEFENSIF", "HEDGE"]
    idx = order.index(regime)

    if flow_score < settings["flow_bearish_threshold"] and regime in ["RISK_ON", "PRUDENT"]:
        flow_adjusted = order[min(idx + 1, 3)]
        flow_flag = "DOWNGRADE_FLOW_BEARISH"

    if flow_score > settings["flow_bullish_threshold"] and regime in ["DEFENSIF", "HEDGE"]:
        flow_flag = "FLOW_DIVERGENCE"

    # Confidence: count how many layers agree
    layers_bullish = sum([
        1 if dp_signal == "ACCUMULATION" else 0,
        1 if gex_signal == "LONG_GAMMA" else 0,
        1 if flow_score > 0.1 else 0,
    ])
    confidence = round(layers_bullish / 3 * 100)

    # Regime colors and instruments
    regime_meta = {
        "RISK_ON": {"color": "#22C55E", "instrument": "TQQQ x3", "label": "RISK ON", "level": 4},
        "PRUDENT": {"color": "#42A5F5", "instrument": "QLD x2", "label": "PRUDENT", "level": 3},
        "DEFENSIF": {"color": "#FFA726", "instrument": "QQQ x1", "label": "DEFENSIF", "level": 2},
        "HEDGE": {"color": "#EF4444", "instrument": "BTAL", "label": "HEDGE", "level": 1},
    }

    meta = regime_meta[flow_adjusted]

    return {
        "regime": flow_adjusted,
        "regime_base": regime,
        "label": meta["label"],
        "instrument": meta["instrument"],
        "color": meta["color"],
        "level": meta["level"],
        "confidence": confidence,
        "flow_flag": flow_flag,
        "layers": {
            "dp": dp_signal,
            "gex": gex_signal,
            "flow": flow_result.get("signal", "NEUTRE") if flow_result else "NEUTRE",
        },
        "values": {
            "dpss": dpss,
            "gex_net": gex_result.get("net_gex") if gex_result else None,
            "flow_score": flow_score,
        },
    }


# --- Full Regime Computation ---

def compute_full_regime():
    """
    Full regime computation — fetches all 3 layers from UW API.
    Returns regime, layers, history, and settings.
    """
    settings = load_settings()

    # Layer 1: Dark Pool
    dp_spy = curl_uw("/darkpool/SPY")
    dp_data = dp_spy.get("data", []) if dp_spy else []
    dpss_result = compute_dpss(dp_data, settings["dpss_min_print_premium"])

    # Layer 2: GEX
    gex_raw = curl_uw("/stock/SPY/spot-exposures/strike")
    gex_data = gex_raw.get("data", []) if gex_raw else []
    gex_result = compute_gex_regime(gex_data)

    # Layer 3: Flow
    tide_raw = curl_uw("/market/market-tide")
    tide_data = tide_raw.get("data", []) if tide_raw else []
    flow_raw = curl_uw("/option-trades/flow-alerts")
    flow_data = flow_raw.get("data", []) if flow_raw else []
    flow_result = compute_flow_score(tide_data, flow_data, settings["whale_min_premium"])

    # Compute regime
    regime = determine_regime(dpss_result, gex_result, flow_result, settings)

    # Check transition
    history = load_regime_history()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Add to history
    daily_entry = {
        "date": today,
        "regime": regime["regime"],
        "dpss": dpss_result.get("dpss") if dpss_result else None,
        "gex_net": gex_result.get("net_gex") if gex_result else None,
        "flow_score": flow_result.get("flow_score") if flow_result else None,
        "confidence": regime["confidence"],
    }

    # Replace or append today's entry
    existing = [d for d in history["daily"] if d["date"] != today]
    existing.append(daily_entry)
    history["daily"] = existing[-90:]  # Keep 90 days
    save_regime_history(history)

    # Check confirmation
    confirmed = regime["regime"]
    in_transition = False
    if len(history["daily"]) >= 2:
        prev = history["daily"][-2] if len(history["daily"]) >= 2 else None
        if prev and prev["regime"] != regime["regime"]:
            in_transition = True
            confirmed = prev["regime"]

    result = {
        "regime": regime,
        "confirmed_regime": confirmed,
        "in_transition": in_transition,
        "layers": {
            "dark_pool": dpss_result,
            "gex": gex_result,
            "flow": flow_result,
        },
        "history": history["daily"][-30:],
        "settings": settings,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    return result
