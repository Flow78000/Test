@echo off
REM Lance le bridge FLOW Signals sur le port 5050.
REM Utilise Python 3.11 si disponible (py -3.11), sinon python par defaut.

cd /d "%~dp0"

echo ============================================================
echo   FLOW Signals Bridge
echo ============================================================

REM Installer les dependances si besoin (premiere fois)
if not exist ".deps_ok" (
    echo   Installation des dependances...
    py -3.11 -m pip install -r requirements.txt >nul 2>&1
    if errorlevel 1 (
        python -m pip install -r requirements.txt
    )
    echo ok > .deps_ok
)

REM Lancement
py -3.11 bridge.py
if errorlevel 1 (
    python bridge.py
)

pause
