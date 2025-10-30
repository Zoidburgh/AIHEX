# How to Start HEXUKI with C++ WASM Engine

## Quick Start (After Restart)

### Simple Method:
1. Double-click `START_SERVER.bat` in this folder
2. Browser will open automatically to http://localhost:8000/opening_sequence_visualizer.html
3. That's it! C++ engine is ready to use.

**To stop**: Press `Ctrl+C` in the command window, then close it.

---

## Manual Method (if batch file doesn't work)

### Step 1: Start the web server
Open PowerShell or Command Prompt in this folder:
```powershell
cd C:\Users\Michael\Desktop\hextest
python -m http.server 8000
```

### Step 2: Open browser
Go to: **http://localhost:8000/opening_sequence_visualizer.html**

**IMPORTANT**: Do NOT open the HTML file directly (file://) - WASM won't work!

---

## Verify C++ Engine is Working

Open browser console (F12) and you should see:
```
✓ C++ WASM engine loaded and initialized
```

If you see errors:
- Make sure you're using `http://localhost:8000/...` (NOT `file://`)
- Make sure the server is running (command window should show log messages)
- Try refreshing the page (Ctrl+F5)

---

## Files You Need

These files must be in this folder for C++ to work:
- `hexuki.js` (JavaScript glue code)
- `hexuki.wasm` (C++ WebAssembly binary)

Both are already here and committed to git.

---

## Engine Settings

In the web interface you can choose:
- **MCTS Engine**: JavaScript or C++ (36-80× faster)
- **Minimax Engine**: JavaScript or C++ (555× faster)
- **Simulation counts**: Up to 2M simulations (C++ only)
- **Minimax threshold**: Up to 18 empty hexes (even from move 1!)

---

## Troubleshooting

### "Failed to load C++ engine"
- You're probably using `file://` instead of `http://localhost:8000`
- Solution: Always use the web server

### Server won't start / Port 8000 in use
- Another server is running on port 8000
- Solution: Use a different port:
  ```
  python -m http.server 8001
  ```
  Then open: http://localhost:8001/opening_sequence_visualizer.html

### "python: command not found"
- Python is not in your PATH
- Solution: Use full path:
  ```
  C:\Users\Michael\AppData\Local\Programs\Python\Python313\python.exe -m http.server 8000
  ```

---

## Rebuilding C++ (if you change C++ code)

If you modify the C++ source code in `c++engine/`:

1. Activate Emscripten:
   ```
   cd emsdk
   .\emsdk_env.bat
   ```

2. Build WASM:
   ```
   cd ..\c++engine
   .\build_wasm.bat
   ```
   OR directly:
   ```
   C:\Users\Michael\Desktop\hextest\emsdk\upstream\emscripten\emcc.bat -O3 -std=c++17 -I include src/core/bitboard.cpp src/core/move.cpp src/core/zobrist.cpp src/ai/mcts.cpp src/ai/mcts_node.cpp src/ai/minimax.cpp src/wasm_interface.cpp -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s "EXPORT_NAME='HexukiWasm'" -s ENVIRONMENT=web -lembind -o wasm/hexuki.js
   ```

3. Copy to main directory:
   ```
   copy c++engine\wasm\hexuki.js hexuki.js
   copy c++engine\wasm\hexuki.wasm hexuki.wasm
   ```

4. Refresh browser (Ctrl+F5)

---

## That's It!

Just run `START_SERVER.bat` and you're ready to analyze openings with blazing fast C++ engines! 🚀
