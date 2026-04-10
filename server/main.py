"""
FLO.W Server v2.0 — FastAPI Backend
Market Intelligence Only — AUCUNE donnee personnelle
"""
import asyncio
asyncio.set_event_loop(asyncio.new_event_loop())

import os
import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import sierra, regime, market, proxy_uw, menthorq, messages, pricing, news
from services.tws import connect_tws, disconnect_tws, qualify_all, ensure_connected
from services.news_archive import start_news_archiver, stop_news_archiver
from services.range_scheduler import start_range_scheduler, stop_range_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n  FLO.W Server v2.0 — FastAPI")
    print("  ===========================")
    connect_tws()
    qualify_all()
    # Background: news archive with 2-week rolling retention
    try:
        start_news_archiver()
    except Exception as e:
        print(f"  [FLO.W] News archiver start error: {e}")
    # Background: range matrix refresh every 5 minutes (intraday snapshots)
    try:
        start_range_scheduler()
    except Exception as e:
        print(f"  [FLO.W] Range scheduler start error: {e}")
    # Auto-collect vol desk snapshot if TWS is connected
    from services.tws import ib_connected, ib
    if ib_connected:
        try:
            from services.vol_desk_collector import collect_vol_desk_snapshot, save_snapshot
            print("  [FLO.W] Auto-collecte Vol Desk...")
            snapshot = collect_vol_desk_snapshot(ib)
            if "error" not in snapshot:
                days = save_snapshot(snapshot)
                print(f"  [FLO.W] Vol Desk: {snapshot['count']} tickers, {days} jours en historique")
            else:
                print(f"  [FLO.W] Vol Desk skip: {snapshot.get('error')}")
        except Exception as e:
            print(f"  [FLO.W] Vol Desk auto-collect error: {e}")
    yield
    # Shutdown
    try:
        stop_news_archiver()
    except Exception:
        pass
    try:
        stop_range_scheduler()
    except Exception:
        pass
    disconnect_tws()
    print("  [FLO.W] Shutdown complete")

app = FastAPI(
    title="FLO.W API",
    description="Options Flow Intelligence — Market Data Only",
    version="2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: block personal data endpoints
BLOCKED_PATHS = ["/api/positions", "/api/portfolio", "/api/pnl", "/api/accounts",
                 "/api/orders", "/api/equity", "/api/balance", "/api/trades"]

@app.middleware("http")
async def block_personal_data(request, call_next):
    for blocked in BLOCKED_PATHS:
        if request.url.path.startswith(blocked):
            return JSONResponse(
                status_code=403,
                content={"error": "BLOQUE", "message": "FLO.W est un outil d'information tactique. Aucune donnee personnelle exposee."}
            )
    return await call_next(request)

app.include_router(sierra.router, prefix="/api/sierra", tags=["Sierra Chart"])
app.include_router(regime.router, prefix="/api/regime", tags=["Regime Engine"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(proxy_uw.router, prefix="/api/uw", tags=["Unusual Whales Proxy"])
app.include_router(menthorq.router, prefix="/api/menthorq", tags=["FLO.Q (legacy path)"])
app.include_router(menthorq.router, prefix="/api/floq", tags=["FLO.Q"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing Lab"])
app.include_router(news.router, prefix="/api/news", tags=["News Archive"])

@app.get("/api/health")
def health():
    from services.tws import ib_connected, qualified
    return {
        "status": "ok",
        "server": "FLO.W v2.0",
        "tws_connected": ib_connected,
        "instruments": len(qualified),
        "mode": "MARKET DATA ONLY",
    }

if __name__ == "__main__":
    import sys
    dev_mode = "--dev" in sys.argv
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=3850,
        reload=dev_mode,
        reload_dirs=["routers", "services"] if dev_mode else None,
        reload_excludes=["*.json", "*.csv", "*.txt", "scripts/*"] if dev_mode else None,
        timeout_keep_alive=30,
        log_level="info",
    )
