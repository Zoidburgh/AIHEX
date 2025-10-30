# HexAI - HEXUKI Game AI Engine

Advanced AI system for the HEXUKI board game featuring Monte Carlo Tree Search (MCTS), optimized minimax endgame solver, and opening theory analysis.

## Features

### 🎮 Game Engine
- **hexuki_game_engine_v2.js** - Headless game engine with full rule implementation
  - Adjacency constraints
  - Chain length balancing rules
  - **Antisymmetry rule** - prevents perfectly mirrored board positions
  - Optimized for AI training with early-exit symmetry detection

### 🤖 AI Components

**MCTS (Monte Carlo Tree Search)**
- `mcts_ai_player.js` - Production MCTS implementation
- Configurable simulation counts (100 - 20,000)
- UCB1 exploration formula
- Works with any tile set distribution

**Minimax Endgame Solver**
- `minimax_endgame_optimized.js` - 10-40x faster than original
- Zobrist hashing for transposition tables
- Incremental undo for state management
- Killer move heuristics
- Perfect play in endgame positions

### 📊 Analysis Tools

**Opening Sequence Visualizer** (`opening_sequence_visualizer.html`)
- Interactive step-by-step game replay
- Load Layer 1 & Layer 2 opening theory data
- Manual move input with click-to-play interface
- Undo functionality
- Hybrid AI: MCTS early/mid-game + minimax endgame
- Start from empty board without opening theory

**Performance Benchmark** (`minimax_benchmark.html`)
- Compare original vs optimized minimax
- Test positions with 4-8 empty hexes
- Performance metrics and speedup analysis

**Antisymmetry Test** (`test_antisymmetry.html`)
- Unit tests for symmetry detection
- Validates rule implementation
- Performance verification

### 🎯 Opening Theory

The project includes tools for building opening books through self-play:

- **Layer 1**: P1's best opening moves (typically 1000+ games analyzed)
- **Layer 2**: P2's optimal counter-responses to top P1 openings
- **Layer 3+**: Continued refinement of opening lines

Key findings:
- Tiles 3-5 dominate opening play (6 of top 10 in Layer 1)
- P1's best openings collapse against optimal P2 counter-play
- Game appears P2-favored with perfect play
- AI avoids tile 1 on first move but uses it defensively early

## Quick Start

### Play a Game
1. Open `opening_sequence_visualizer.html` in a browser
2. Click "Start from Empty Board" for AI vs AI
3. Or load opening theory JSON files to explore specific sequences

### Test Performance
1. Open `minimax_benchmark.html`
2. Click benchmark buttons to compare solver performance
3. High simulation counts (10k+) may trigger browser warnings - click "Wait"

## Technical Details

### Antisymmetry Rule Implementation
The engine prevents perfectly mirrored board positions:
- Center column hexes (0, 4, 9, 14, 18) are on the symmetry line
- Optimization: permanently disables checks once mirror pairs have different values
- Typical performance: check runs 1-2 times per game, then disabled

### MCTS Configuration
- Exploration constant: 1.0
- Win rate inversion for opponent nodes: `1.0 - winRate`
- Supports asymmetric tile sets

### Minimax Optimizations
- **Zobrist hashing**: O(1) incremental state hashing
- **Incremental undo**: Saves only changed state (10-50x speedup vs JSON clone)
- **Move ordering**: Killer moves, high-value tiles, center hexes
- **Alpha-beta pruning**: With transposition table

## Browser Compatibility

Works in all modern browsers. For high MCTS simulation counts (10k+):
- Chrome/Edge: Fastest performance
- Firefox: Slightly slower but reliable
- May show "unresponsive script" warnings - click "Wait" to continue

## Web Hosting

Fully client-side - no server required! Deploy to:
- GitHub Pages
- Netlify
- Vercel
- Any static web host

## Files

### Core Engine
- `hexuki_game_engine_v2.js` - Main game logic
- `hexuki_ANTISYMMETRY_TEST.html` - Original game with UI

### AI
- `mcts_ai_player.js` - MCTS implementation
- `minimax_endgame.js` - Original minimax solver
- `minimax_endgame_optimized.js` - Optimized version (recommended)

### Tools
- `opening_sequence_visualizer.html` - Main analysis tool
- `minimax_benchmark.html` - Performance testing
- `test_antisymmetry.html` - Rule validation

## Future Development
- Web Worker support for non-blocking MCTS
- Puzzle mode with single winning paths
- Layer 3+ opening theory expansion
- Position evaluation heuristics

## License
MIT

## Acknowledgments
Built with Claude Code for advanced AI game analysis.
