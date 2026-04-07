@echo off
title FLO.W — Flow Liquidity ^& Options Warehouse
color 0A
echo.
echo   ███████╗██╗      ██████╗    ██╗    ██╗
echo   ██╔════╝██║     ██╔═══██╗   ██║    ██║
echo   █████╗  ██║     ██║   ██║   ██║ █╗ ██║
echo   ██╔══╝  ██║     ██║   ██║   ██║███╗██║
echo   ██║     ███████╗╚██████╔╝██╗╚███╔███╔╝
echo   ╚═╝     ╚══════╝ ╚═════╝ ╚═╝ ╚══╝╚══╝
echo.
echo   Flow Liquidity ^& Options Warehouse
echo   =====================================
echo.

:: Check if already running
netstat -ano | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [!] FLO.W est deja en cours d'execution
    echo   Ouvre http://localhost:3000
    echo.
    start http://localhost:3000
    pause
    exit /b
)

echo   [1/2] Demarrage du serveur backend...
cd /d D:\flo-w\server
start /min "FLO.W Backend" cmd /c "python main.py"
timeout /t 3 /nobreak >nul

echo   [2/2] Demarrage du frontend Next.js...
cd /d D:\flo-w
start /min "FLO.W Frontend" cmd /c "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo   FLO.W demarre avec succes!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3849
echo.

:: Open browser
start http://localhost:3000

echo   Appuie sur une touche pour fermer cette fenetre.
echo   (Les serveurs continuent en arriere-plan)
pause >nul
