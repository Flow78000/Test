"""
FLO.W - Alpha Hunter router
============================
Endpoint : GET /api/alpha-hunter/
Retourne l'aggregation flow+news par ticker pour detecter les opportunites a edge.
"""
from fastapi import APIRouter

from services.alpha_hunter import scan_alpha_hunter

router = APIRouter()


@router.get("/")
def get_alpha_hunter():
    return scan_alpha_hunter()
