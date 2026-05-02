@echo off
setlocal
rem Project root is two levels up from scripts/launchers/.
cd /d "%~dp0..\.."

title Project Dreamcore - showcase

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo Node.js is not installed or not in PATH.
    echo Download it from https://nodejs.org and re-run this file.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies - first run only...
    call npm install
    if errorlevel 1 (
        echo.
        echo Install failed. Press any key to exit.
        pause >nul
        exit /b 1
    )
)

REM Probe: if Dreamcore is already running, refocus its tab and exit.
REM Skips rebuild and second server. Exit 0 from probe means "found".
node scripts\probe-existing.mjs && exit /b 0

echo Building the app...
call npm run build
if errorlevel 1 (
    echo.
    echo Build failed. Press any key to exit.
    pause >nul
    exit /b 1
)

echo.
node server.mjs

pause
