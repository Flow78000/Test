"""
FLO.W - Smart Money Scanner router
===================================
Endpoint : GET /api/smart-money/
Retourne l'aggregation flow+news par ticker.
"""
from fastapi import APIRouter

from services.smart_money import scan_smart_money

router = APIRouter()


@router.get("/")
def get_smart_money():
    return scan_smart_money()
