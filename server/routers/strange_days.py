"""Nanex #3 Strange Days — Anomaly Detection Router"""
from fastapi import APIRouter
from services.strange_days import compute_strange_days

router = APIRouter()


@router.get("/")
def strange_days_scores():
    """
    Returns all 7 anomaly indicator scores + overall strangeness score.
    Cached for 2 minutes.
    """
    return compute_strange_days()
