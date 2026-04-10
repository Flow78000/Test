"""
FLO.W - News archive router

Exposes the rolling 2-week news archive maintained by services.news_archive.
The archive is populated automatically by a background thread started
at application lifespan startup.
"""
from typing import Optional

from fastapi import APIRouter, Query

from services import news_archive

router = APIRouter()


@router.get("/archive")
def get_archive(
    limit: int = Query(200, ge=1, le=2000),
    ticker: Optional[str] = None,
    source: Optional[str] = None,
    since: Optional[str] = None,
    search: Optional[str] = None,
):
    return news_archive.get_archive(
        limit=limit, ticker=ticker, source=source, since=since, search=search,
    )


@router.post("/refresh")
def refresh_now():
    return news_archive.force_refresh()
