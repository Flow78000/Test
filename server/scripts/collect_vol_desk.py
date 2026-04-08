#!/usr/bin/env python3
"""
FLO.W — Collect Vol Desk Snapshot
Run this script daily (market close) to save a snapshot of all Vol Desk metrics.
Can also be triggered via API: GET /api/market/vol-desk/collect

Usage:
  python collect_vol_desk.py           # One-shot collection
  python collect_vol_desk.py --loop    # Collect every 30 min while TWS is open
"""
import sys
import os
import time

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ib_insync import IB
from services.vol_desk_collector import collect_vol_desk_snapshot, save_snapshot

TWS_HOST = "127.0.0.1"
TWS_PORT = 7496
CLIENT_ID = 51  # Different from main server (50)


def run_collection():
    print("[FLO.W Vol Desk] Connexion TWS...")
    ib = IB()
    try:
        ib.connect(TWS_HOST, TWS_PORT, clientId=CLIENT_ID, timeout=10, readonly=True)
        print("[FLO.W Vol Desk] Connecte — collecte en cours...")

        snapshot = collect_vol_desk_snapshot(ib)
        if "error" in snapshot:
            print(f"[FLO.W Vol Desk] ERREUR: {snapshot['error']}")
            return False

        days = save_snapshot(snapshot)
        print(f"[FLO.W Vol Desk] Snapshot sauvegarde: {snapshot['count']} tickers, {days} jours en historique")
        print(f"[FLO.W Vol Desk] Date: {snapshot['date']} {snapshot['time']}")
        return True

    except Exception as e:
        print(f"[FLO.W Vol Desk] ERREUR: {e}")
        return False
    finally:
        try:
            ib.disconnect()
        except:
            pass


if __name__ == "__main__":
    if "--loop" in sys.argv:
        print("[FLO.W Vol Desk] Mode boucle — collecte toutes les 30 min")
        while True:
            run_collection()
            print("[FLO.W Vol Desk] Prochaine collecte dans 30 min...")
            time.sleep(1800)
    else:
        success = run_collection()
        sys.exit(0 if success else 1)
