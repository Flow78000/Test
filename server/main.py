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

from routers import sierra, regime, market, proxy_uw, menthorq, messages, pricing, news, spread_gap, strange_days, news_trading, smart_money
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
app.include_router(spread_gap.router, prefix="/api/spread-gap", tags=["Spread Gap Tracker"])
app.include_router(strange_days.router, prefix="/api/strange-days", tags=["Strange Days"])
app.include_router(news_trading.router, prefix="/api/news-trading", tags=["News Trading"])
app.include_router(smart_money.router, prefix="/api/smart-money", tags=["Smart Money"])

@app.get("/api/health")
def health():
    # IMPORTANT: importer le MODULE, pas les variables directement.
    # ib_connected est un bool (immutable) — "from x import y" capture
    # la valeur au moment de l'import, pas une reference live.
    from services import tws as tws_mod
    import os
    import time
    import urllib.request

    # Unusual Whales — reachability via curl subprocess (same code path as proxy_uw).
    # UW returns HTTP 200 with an error envelope when the daily limit is hit,
    # so we must inspect the body, not just the status code.
    uw_ok = False
    uw_detail = "not checked"
    try:
        import subprocess
        import json as _json
        token = os.environ.get("UW_API_TOKEN", "da6adf76-f312-4572-acff-e7f99d63c650")
        proc = subprocess.run(
            [
                "curl", "-s", "-w", "\n%{http_code}",
                "https://api.unusualwhales.com/api/stock/SPY/iv-rank",
                "-H", f"Authorization: Bearer {token}",
                "-H", "Accept: application/json",
                "--max-time", "3",
            ],
            capture_output=True, text=True, timeout=5,
        )
        out = proc.stdout or ""
        nl = out.rfind("\n")
        body = out[:nl] if nl >= 0 else ""
        code = (out[nl + 1:] if nl >= 0 else out).strip()

        if code == "200":
            # inspect body: error envelope means daily limit / rate limit
            try:
                parsed = _json.loads(body)
            except Exception:
                parsed = None
            if isinstance(parsed, dict) and "code" in parsed and "data" not in parsed:
                err_code = str(parsed.get("code", ""))
                if "limit" in err_code.lower():
                    uw_ok = False
                    uw_detail = f"daily limit hit ({err_code})"
                else:
                    uw_ok = False
                    uw_detail = f"error {err_code}"
            else:
                uw_ok = True
                uw_detail = "HTTP 200"
        elif code == "429":
            uw_ok = True  # reachable but rate limited — still "up"
            uw_detail = "HTTP 429 rate limited"
        else:
            uw_detail = f"HTTP {code}" if code else "no response"
    except Exception as e:
        uw_detail = type(e).__name__

    # Sierra Chart — look for fresh BarStudyData files in the data dir
    sierra_ok = False
    sierra_detail = "data dir not found"
    sierra_latest_age = None
    try:
        sdir = r"C:\SierraChart\Data"
        if os.path.isdir(sdir):
            now = time.time()
            latest_mtime = 0
            for fname in os.listdir(sdir):
                if "BarStudyData" in fname and fname.endswith(".csv"):
                    full = os.path.join(sdir, fname)
                    try:
                        m = os.path.getmtime(full)
                        if m > latest_mtime:
                            latest_mtime = m
                    except OSError:
                        pass
            if latest_mtime > 0:
                sierra_latest_age = int(now - latest_mtime)
                sierra_ok = sierra_latest_age < 24 * 3600  # fresh if under 24h
                sierra_detail = f"latest file {sierra_latest_age}s old"
            else:
                sierra_detail = "no BarStudyData files"
    except Exception as e:
        sierra_detail = type(e).__name__

    # Range scheduler status
    range_ok = False
    range_detail = "not started"
    try:
        from services.range_scheduler import get_status as get_scheduler_status
        st = get_scheduler_status()
        range_ok = bool(st.get("running")) and st.get("last_error") is None
        range_detail = f"refresh_count={st.get('refresh_count', 0)}"
    except Exception as e:
        range_detail = type(e).__name__

    # News archive
    news_ok = False
    news_detail = "not started"
    try:
        from services.news_archive import get_archive
        arc = get_archive(limit=1)
        news_ok = bool(arc.get("refresh_count", 0) > 0)
        news_detail = f"items={arc.get('total', 0)}"
    except Exception as e:
        news_detail = type(e).__name__

    sources = {
        "uw": {"ok": uw_ok, "detail": uw_detail, "label": "Unusual Whales API"},
        "tws": {
            "ok": bool(tws_mod.ib_connected and tws_mod.ib and tws_mod.ib.isConnected()),
            "detail": f"{len(tws_mod.qualified)} instruments" if tws_mod.ib_connected else "disconnected",
            "label": "TWS / Interactive Brokers",
        },
        "sierra": {"ok": sierra_ok, "detail": sierra_detail, "label": "Sierra Chart"},
        "range_scheduler": {"ok": range_ok, "detail": range_detail, "label": "Range Scheduler"},
        "news_archive": {"ok": news_ok, "detail": news_detail, "label": "News Archive"},
    }
    critical_down = [k for k, v in sources.items() if not v["ok"] and k in ("uw", "sierra")]
    optional_down = [k for k, v in sources.items() if not v["ok"] and k not in ("uw", "sierra")]

    return {
        "status": "ok" if not critical_down else "degraded",
        "server": "FLO.W v2.0",
        "tws_connected": bool(tws_mod.ib_connected and tws_mod.ib and tws_mod.ib.isConnected()),
        "instruments": len(tws_mod.qualified),
        "mode": "MARKET DATA ONLY",
        "sources": sources,
        "critical_down": critical_down,
        "optional_down": optional_down,
        "sierra_latest_age_s": sierra_latest_age,
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
