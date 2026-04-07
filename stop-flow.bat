@echo off
title FLO.W — Arret
echo.
echo   Arret de FLO.W...
echo.

:: Kill Node.js (Next.js)
taskkill /f /im node.exe >nul 2>&1
echo   [OK] Frontend arrete

:: Kill Python (FastAPI backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3849" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo   [OK] Backend arrete

echo.
echo   FLO.W arrete.
timeout /t 2 /nobreak >nul
