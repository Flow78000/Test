"""FLO.W - MenthorQ scraper router v2."""
import os
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from services.menthorq_scraper import (
    get_command as get_command_raw,
    get_dashboard as get_dashboard_raw,
    get_cache_status,
    clear_cache,
    normalize_command_response,
    ensure_image,
    COMMAND_CATEGORIES,
)

router = APIRouter()


@router.get("/slugs")
def list_slugs():
    """Liste tous les slugs de commands disponibles par categorie."""
    return {
        "categories": COMMAND_CATEGORIES,
        "total_slugs": sum(len(v) for v in COMMAND_CATEGORIES.values()),
    }


@router.get("/command")
def command(
    slug: str = Query(..., description="Slug MenthorQ (ex: cta_table, levels_tv, netgex)"),
    date: str = Query(None, description="YYYY-MM-DD"),
    ticker: str = Query(None, description="SPX, NDX, SPY, etc."),
    is_intraday: bool = Query(False),
    force: bool = Query(False, description="Force refresh meme si cache frais"),
    raw: bool = Query(False, description="Retourne le payload brut non normalise"),
):
    """Fetch une command MenthorQ unique. Par defaut retourne la forme
    normalisee (image_url, levels, stats...) ; raw=true pour le JSON brut."""
    res = get_command_raw(
        command_slug=slug,
        date=date,
        ticker=ticker,
        is_intraday=is_intraday,
        force=force,
    )
    if raw:
        return res
    return normalize_command_response(res)


@router.get("/dashboard")
def dashboard(
    category: str = Query("cta", description="cta | eod | intraday"),
    date: str = Query(None),
    ticker: str = Query(None),
    force: bool = Query(False),
    normalize: bool = Query(True),
):
    """Fetch toutes les commands d'une categorie. Retourne un dict slug -> result normalise."""
    res = get_dashboard_raw(
        category=category,
        date=date,
        ticker=ticker,
        force=force,
    )
    if not normalize:
        return res

    normalized_commands = {}
    for slug, raw in res.get("commands", {}).items():
        normalized_commands[slug] = normalize_command_response(raw)

    return {
        **{k: v for k, v in res.items() if k != "commands"},
        "commands": normalized_commands,
    }


@router.get("/image")
def image(
    slug: str = Query(...),
    date: str = Query(...),
    ticker: str = Query(None),
):
    """Proxy d'image MenthorQ. Download et cache l'image S3 localement,
    puis sert le fichier avec content-type image/png. Les URLs S3 signees
    expirent en 1h donc le frontend ne peut pas les utiliser directement."""
    path = ensure_image(slug=slug, date=date, ticker=ticker)
    if not path or not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail=f"Image indisponible pour slug={slug} date={date} ticker={ticker}",
        )
    return FileResponse(path, media_type="image/png")


@router.get("/status")
def status():
    """Inspecte l'etat du cache et la presence des credentials."""
    return get_cache_status()


@router.post("/clear-cache")
def clear():
    """Vide le cache local MenthorQ (JSON + images)."""
    return clear_cache()
