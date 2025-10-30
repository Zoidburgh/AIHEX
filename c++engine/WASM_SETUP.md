# WebAssembly Build Instructions

This guide shows you how to compile the Hexuki C++ engine to WebAssembly for use in browsers.

## Prerequisites

You need **Emscripten** - a compiler toolchain that converts C++ to WebAssembly.

## Step 1: Install Emscripten

### On Windows (PowerShell):

```powershell
# Download and install emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install latest version
.\emsdk install latest

# Activate it
.\emsdk activate latest

# Add to PATH for current session
.\emsdk_env.bat
```

### Verify Installation:

```powershell
emcc --version
```

You should see something like: `emcc (Emscripten gcc/clang-like replacement) 3.1.x`

## Step 2: Build to WebAssembly

```powershell
cd c++engine
.\build_wasm.bat
```

This will create:
- `wasm/hexuki.js` - JavaScript glue code (loads and wraps the WASM)
- `wasm/hexuki.wasm` - The actual WebAssembly binary

## Step 3: Test the Build

Open `test_wasm.html` in your browser:

```powershell
# Serve via a local web server (required for WASM)
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js http-server
npx http-server -p 8000

# Then open: http://localhost:8000/c++engine/test_wasm.html
```

**Note**: You **cannot** open WASM files directly (`file://`) - you need a web server due to CORS restrictions.

## Step 4: Integrate with Your Web UI

Once the WASM build works, copy the files:

```powershell
# Copy WASM files to main directory
copy c++engine\wasm\hexuki.js .
copy c++engine\wasm\hexuki.wasm .
```

Then modify `opening_sequence_visualizer.html` to use the C++ engine instead of JavaScript!

## API Reference

### Initialize

```javascript
const Module = await HexukiWasm();
Module._wasmInitialize();
```

### Make Moves

```javascript
// Make a move: place tile 9 on hex 7
const success = Module._wasmMakeMove(7, 9);

// Get scores
const p1Score = Module._wasmGetScoreP1();
const p2Score = Module._wasmGetScoreP2();

// Get current player (1 or 2)
const player = Module._wasmGetCurrentPlayer();
```

### Get Valid Moves

```javascript
const movesJson = Module.UTF8ToString(Module._wasmGetValidMoves());
const moves = JSON.parse(movesJson);
// Returns: [{h:6,t:5}, {h:7,t:4}, ...]
```

### Run MCTS AI

```javascript
const resultJson = Module.UTF8ToString(
    Module._wasmMCTSFindBestMove(
        10000,  // simulations
        5000,   // time limit (ms)
        true    // use time limit (vs simulation count)
    )
);
const result = JSON.parse(resultJson);
console.log(`Best move: h${result.hexId}t${result.tileValue}`);
console.log(`Win rate: ${result.winRate}`);
console.log(`Simulations: ${result.simulations} in ${result.timeMs}ms`);
```

### Run Minimax AI

```javascript
const resultJson = Module.UTF8ToString(
    Module._wasmMinimaxFindBestMove(
        8,      // search depth
        5000    // time limit (ms)
    )
);
const result = JSON.parse(resultJson);
console.log(`Best move: h${result.hexId}t${result.tileValue}`);
console.log(`Score: ${result.score}`);
```

## Performance Expectations

With the C++ WebAssembly engine, you should see:

- **MCTS**: 50,000-200,000 simulations/sec (vs 300-2000 in JavaScript)
- **Minimax**: 30,000-50,000 nodes/sec (vs 400-700 in JavaScript)
- **Overall speedup**: 24-81× faster! 🚀

## Troubleshooting

### "emcc: command not found"
Run `emsdk_env.bat` to add Emscripten to PATH

### "CORS error" in browser
You need to serve files via HTTP, not open them directly

### Build errors
Make sure you're in the `c++engine` directory when running `build_wasm.bat`

## Next Steps

1. Test `test_wasm.html` in browser ✓
2. Verify MCTS/Minimax work ✓
3. Integrate with `opening_sequence_visualizer.html`
4. Enjoy 50-200× faster AI! 🎉
