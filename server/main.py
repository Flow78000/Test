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

from routers import sierra, regime, market, proxy_uw
from services.tws import connect_tws, disconnect_tws, qualify_all

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n  FLO.W Server v2.0 — FastAPI")
    print("  ===========================")
    connect_tws()
    qualify_all()
    yield
    # Shutdown
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
    uvicorn.run("main:app", host="127.0.0.1", port=3849, reload=True)
