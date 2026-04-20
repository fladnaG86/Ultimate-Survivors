@echo off
:: ── Ultimate Survivor — launcher Windows ───────────────
:: Doppio click su questo file per avviare il gioco.
:: Richiede Python 3 installato e nel PATH.

cd /d "%~dp0"

echo ╔════════════════════════════════════╗
echo ║     ULTIMATE SURVIVOR — v4         ║
echo ╚════════════════════════════════════╝
echo.

:: Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERRORE: Python 3 non trovato nel PATH.
    echo  Scaricalo da https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

set PORT=8000

:: Trova porta libera
:find_port
netstat -an | find ":%PORT% " >nul 2>&1
if not errorlevel 1 (
    set /a PORT=%PORT%+1
    goto find_port
)

echo   Server avviato su http://localhost:%PORT%
echo   Chiudi questa finestra per fermare il gioco.
echo.

:: Apre il browser dopo 1 secondo
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:%PORT%"

:: Avvia il server
python -m http.server %PORT%

pause
