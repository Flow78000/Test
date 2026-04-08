#!/usr/bin/env python3
"""
FLO.W — Extract Sierra Chart signal history
Run this script to refresh the 5-day signal history from all Sierra CSVs.
Can be run manually or via cron/scheduler.

Usage: python extract_sierra_history.py
"""
import os, json, sys
from datetime import datetime, timezone

SIERRA_DIR = r"C:\SierraChart\Data"
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sierra_signal_history.json")

def extract():
    files = [f for f in os.listdir(SIERRA_DIR) if f.endswith("-BarStudyData.csv")]
    all_history = {}

    for fname in sorted(files):
        sym = fname.replace("-BarStudyData.csv", "")
        path = os.path.join(SIERRA_DIR, fname)

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        if len(lines) < 2:
            continue

        header = [h.strip() for h in lines[0].split(",")]

        last_idx = high_idx = low_idx = None
        sigma_indices = []
        dev_cols = {}

        for i, h in enumerate(header):
            hs = h.strip()
            if hs == "Last" and last_idx is None: last_idx = i
            if hs == "High" and high_idx is None: high_idx = i
            if hs == "Low" and low_idx is None: low_idx = i
            if hs == "\u03c3":
                sigma_indices.append(i)
            if hs in ["100%","-100%","75%","-75%","125%","-125%","U2","L2","U3","L3","VWAP"]:
                if hs not in dev_cols:
                    dev_cols[hs] = i

        bars_per_day = {}
        for line in lines[1:]:
            cols = [c.strip() for c in line.split(",")]
            if len(cols) < 6:
                continue
            date = cols[0].strip()
            time_str = cols[1].strip() if len(cols) > 1 else ""
            try:
                price = float(cols[last_idx])
                high = float(cols[high_idx])
                low = float(cols[low_idx])
            except:
                continue

            if date not in bars_per_day:
                bars_per_day[date] = {"bars": 0, "high": 0, "low": 999999, "close": 0, "open": price, "signals": [], "sigma_spikes": []}

            day = bars_per_day[date]
            day["bars"] += 1
            day["close"] = price
            if high > day["high"]: day["high"] = high
            if low < day["low"]: day["low"] = low

            # MR signals
            for lvl, idx in dev_cols.items():
                if idx >= len(cols): continue
                try:
                    level_val = float(cols[idx])
                except: continue
                if level_val == 0: continue

                is_upper = not lvl.startswith("-") and lvl not in ("L2","L3")
                strength = 4 if lvl in ("U3","L3") else 3 if lvl in ("U2","L2") or "200" in lvl or "150" in lvl else 2 if "100" in lvl or "125" in lvl else 1 if "75" in lvl else 0

                if is_upper and high >= level_val and price < level_val:
                    day["signals"].append({"dir": "SHORT", "level": lvl, "price": round(price,2), "level_val": round(level_val,2), "time": time_str, "strength": strength})
                elif not is_upper and low <= level_val and price > level_val:
                    day["signals"].append({"dir": "LONG", "level": lvl, "price": round(price,2), "level_val": round(level_val,2), "time": time_str, "strength": strength})

            # Sigma spikes
            for si in sigma_indices[:1]:
                if si < len(cols):
                    try:
                        sig_val = float(cols[si])
                        if sig_val > 0.3:
                            day["sigma_spikes"].append({"val": round(sig_val,4), "time": time_str, "price": round(price,2)})
                    except: pass

        # Build summary
        daily = []
        for date in sorted(bars_per_day.keys()):
            d = bars_per_day[date]
            # Count strong signals (strength >= 2)
            strong_mr = [s for s in d["signals"] if s["strength"] >= 2]
            daily.append({
                "date": date,
                "bars": d["bars"],
                "open": round(d["open"],2),
                "high": round(d["high"],2),
                "low": round(d["low"],2),
                "close": round(d["close"],2),
                "range_pct": round((d["high"] - d["low"]) / d["close"] * 100, 2) if d["close"] else 0,
                "total_mr_signals": len(d["signals"]),
                "strong_mr_signals": len(strong_mr),
                "sigma_spikes": len(d["sigma_spikes"]),
                "last_signals": d["signals"][-10:],
                "last_sigma": d["sigma_spikes"][-5:],
            })

        all_history[sym] = {
            "name": sym,
            "total_bars": len(lines) - 1,
            "columns": len(header),
            "daily": daily,
        }

    # Save
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "assets": all_history,
        "asset_count": len(all_history),
        "total_signals": sum(sum(d["total_mr_signals"] for d in v["daily"]) for v in all_history.values()),
        "total_sigma_spikes": sum(sum(d["sigma_spikes"] for d in v["daily"]) for v in all_history.values()),
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"[FLO.W] Sierra history extracted: {len(all_history)} assets, {output['total_signals']} MR signals, {output['total_sigma_spikes']} sigma spikes")
    return output

if __name__ == "__main__":
    extract()
