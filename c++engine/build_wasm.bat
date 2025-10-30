@echo off
REM Build Hexuki C++ Engine to WebAssembly using Emscripten
REM
REM Prerequisites:
REM 1. Install Emscripten: https://emscripten.org/docs/getting_started/downloads.html
REM 2. Run: emsdk install latest
REM 3. Run: emsdk activate latest
REM 4. Run: emsdk_env.bat (adds emcc to PATH)

echo ============================================
echo Building Hexuki C++ Engine to WebAssembly
echo ============================================
echo.

REM Check if emcc is available
where emcc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: emcc not found!
    echo Please install Emscripten and run emsdk_env.bat
    echo See: https://emscripten.org/docs/getting_started/downloads.html
    exit /b 1
)

echo Emscripten found. Compiling...
echo.

REM Create wasm output directory
if not exist "wasm" mkdir wasm

REM Compile all source files to WebAssembly
emcc ^
  -O3 ^
  -std=c++17 ^
  -I include ^
  src/core/bitboard.cpp ^
  src/core/move.cpp ^
  src/core/zobrist.cpp ^
  src/ai/mcts.cpp ^
  src/ai/mcts_node.cpp ^
  src/ai/minimax.cpp ^
  src/wasm_interface.cpp ^
  -s WASM=1 ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s MODULARIZE=1 ^
  -s EXPORT_NAME="'HexukiWasm'" ^
  -s ENVIRONMENT=web ^
  -s ASSERTIONS=0 ^
  -s DISABLE_EXCEPTION_CATCHING=1 ^
  -s NO_FILESYSTEM=1 ^
  -s AGGRESSIVE_VARIABLE_ELIMINATION=1 ^
  --closure 1 ^
  -flto ^
  -lembind ^
  -o wasm/hexuki.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Build successful!
    echo ============================================
    echo Output files:
    echo   wasm/hexuki.js   - JavaScript glue code
    echo   wasm/hexuki.wasm - WebAssembly binary
    echo.
    echo Next steps:
    echo 1. Copy wasm/* to your web server directory
    echo 2. Load hexuki.js in your HTML
    echo 3. Call HexukiWasm() to initialize
) else (
    echo.
    echo ============================================
    echo Build failed!
    echo ============================================
    exit /b 1
)
