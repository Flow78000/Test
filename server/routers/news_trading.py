"""Nanex #1 — Trading Ahead of News Router"""
from fastapi import APIRouter
from services.news_trading import scan_news_trading

router = APIRouter()


@router.get("/")
def get_news_trading_signals():
    """
    Returns all suspicious pre-news trading signals + stats.
    Cached for 5 minutes.
    """
    return scan_news_trading()
