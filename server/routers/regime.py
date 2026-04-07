"""VIX Regime Switching Engine — 3 layers, 4 regimes"""
from fastapi import APIRouter
from services.regime_engine import compute_full_regime, load_settings, load_regime_history

router = APIRouter()

@router.get("/full")
def regime_full():
    return compute_full_regime()

@router.get("/settings")
def regime_settings():
    return load_settings()

@router.get("/history")
def regime_history():
    history = load_regime_history()
    return {"daily": history.get("daily", [])[-90:]}
