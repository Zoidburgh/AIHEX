@echo off
REM ========================================
REM HEXUKI C++ WASM Server Startup
REM ========================================
REM
REM This script starts the web server needed for C++ WASM to work
REM WASM files cannot load from file:// - they need HTTP
REM

echo ========================================
echo Starting Hexuki Web Server
echo ========================================
echo.
echo Server will run on: http://localhost:8000
echo.
echo Opening browser in 3 seconds...
echo Press Ctrl+C to stop the server when done.
echo.

REM Start Python HTTP server in this directory
cd /d "%~dp0"

REM Wait 3 seconds then open browser
start /min cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000/opening_sequence_visualizer.html"

REM Start the server (this will block - press Ctrl+C to stop)
python -m http.server 8000

echo.
echo Server stopped.
pause
