"""Sierra Chart CSV reader — multi-asset signal analysis"""
import os
from fastapi import APIRouter, Query
from services.sierra_reader import (
    sierra_scan_files, sierra_read_last_bars, sierra_read_history,
    sierra_mean_reversion_signals, sierra_columns, sierra_dashboard,
    sierra_performance
)

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
    return sierra_mean_reversion_signals(bars, symbol)

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
