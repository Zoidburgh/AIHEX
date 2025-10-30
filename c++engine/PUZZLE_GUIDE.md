# Puzzle Loading Guide

## Overview

For puzzles and endgame positions, you often need to:
- ✅ Start with a **partially filled board** (not just center hex)
- ✅ Give each player **fewer than 9 tiles** (some already used)
- ✅ Set who's turn it is
- ✅ Load/save positions easily

The C++ engine supports all of this!

---

## API Methods

### Manual Setup

```cpp
HexukiBitboard board;

// Clear the board (remove initial center tile)
board.clearBoard();

// Place tiles manually
board.setHexValue(9, 1);   // Center has tile 1
board.setHexValue(6, 5);   // Hex 6 has tile 5
board.setHexValue(7, 3);   // Hex 7 has tile 3

// Set available tiles for each player
board.setAvailableTiles(PLAYER_1, {2, 4, 8});     // P1 has 3 tiles left
board.setAvailableTiles(PLAYER_2, {6, 7, 9});     // P2 has 3 tiles left

// Set who's turn it is
board.setCurrentPlayer(PLAYER_1);
```

### String-Based Loading

```cpp
HexukiBitboard board;

// Format: "h0:1,h4:5|p1:2,3,4|p2:6,7,8|turn:1"
std::string position = "h9:1,h6:5,h7:3|p1:2,4,8|p2:6,7,9|turn:1";
board.loadPosition(position);

// Now solve the puzzle!
auto moves = board.getValidMoves();
```

### Save/Load Positions

```cpp
// Save current position
std::string saved = board.savePosition();
std::cout << "Position: " << saved << "\n";

// Load it later
HexukiBitboard board2;
board2.loadPosition(saved);
```

---

## Position Format

**Format:** `hexes|p1tiles|p2tiles|turn`

**Example:** `h9:1,h6:5,h7:3|p1:2,4,8|p2:6,7,9|turn:1`

### Components:

1. **Hexes:** `h9:1,h6:5,h7:3`
   - `h9:1` = Hex 9 has tile value 1
   - `h6:5` = Hex 6 has tile value 5
   - Multiple hexes separated by commas

2. **Player 1 tiles:** `p1:2,4,8`
   - Player 1 has tiles [2, 4, 8] available
   - Comma-separated list

3. **Player 2 tiles:** `p2:6,7,9`
   - Player 2 has tiles [6, 7, 9] available

4. **Turn:** `turn:1`
   - `turn:1` = Player 1 to move
   - `turn:2` = Player 2 to move

---

## Example Puzzles

### Endgame Puzzle

**Setup:** Most tiles already placed, players have limited options.

```cpp
// P1 has only tile 9 left, P2 has tiles 6 and 7
std::string puzzle = "h9:1,h4:2,h6:3,h7:4,h11:5,h12:8|p1:9|p2:6,7|turn:1";

HexukiBitboard board;
board.loadPosition(puzzle);

// Solve: find best move for P1
auto moves = board.getValidMoves();
// P1 can only place tile 9 on legal hexes
```

### Symmetry Puzzle

**Setup:** Test if P1 can break symmetry creatively.

```cpp
// Board is currently symmetric, P1 must avoid creating symmetry
std::string puzzle = "h9:1,h6:2,h7:2|p1:3,4,5,6,7,8,9|p2:3,4,5,6,7,8,9|turn:1";

HexukiBitboard board;
board.loadPosition(puzzle);

// All moves that don't create symmetry should be valid
auto moves = board.getValidMoves();
```

### Minimal Tiles Puzzle

**Setup:** Each player only has 3 tiles total.

```cpp
// Empty board except center, limited tiles per player
std::string puzzle = "h9:1|p1:3,6,9|p2:2,5,8|turn:1";

HexukiBitboard board;
board.loadPosition(puzzle);

// Different game dynamics with fewer tiles
```

### Custom Starting Position

**Setup:** Start mid-game and find optimal continuation.

```cpp
// After 6 moves have been played
std::string midgame = "h9:1,h6:5,h7:4,h11:3,h12:2,h4:6,h14:7|p1:8,9|p2:8,9|turn:1";

HexukiBitboard board;
board.loadPosition(midgame);

// Run minimax from this position
```

---

## Use Cases

### 1. **Puzzle Design**

Create interesting tactical positions:
```cpp
// "Find the winning move" puzzle
std::string puzzle = "h9:1,h6:8,h7:7,h4:9|p1:6|p2:5,4,3|turn:1";
// P1 can win by placing 6 on the right hex
```

### 2. **Endgame Database**

Pre-generate all 3-tile endgames:
```cpp
// Generate all positions where each player has ≤3 tiles
for (auto& p1Tiles : allCombinations(3)) {
    for (auto& p2Tiles : allCombinations(3)) {
        // Create position
        std::string pos = generatePosition(p1Tiles, p2Tiles);
        // Solve it
        int score = solvePuzzle(pos);
        // Store in database
    }
}
```

### 3. **Testing AI**

Verify minimax works on known positions:
```cpp
// Position where P1 has forced win
std::string forcedWin = "h9:1,h6:9,h7:8|p1:7|p2:2,3|turn:1";

HexukiBitboard board;
board.loadPosition(forcedWin);

// Minimax should find the winning move
Move best = minimax(board, 10);
assert(best.tileValue == 7);
```

### 4. **Position Analysis**

Study specific game states:
```cpp
// Save interesting positions from games
HexukiBitboard game;
// ... play game ...

if (isInterestingPosition(game)) {
    std::string pos = game.savePosition();
    saveToFile("interesting_positions.txt", pos);
}
```

---

## Complete Example: Puzzle Solver

```cpp
#include "core/bitboard.h"
#include <iostream>

void solvePuzzle(const std::string& puzzle) {
    HexukiBitboard board;
    board.loadPosition(puzzle);

    std::cout << "Puzzle:\n";
    board.print();

    auto moves = board.getValidMoves();
    std::cout << "\nValid moves: " << moves.size() << "\n";

    // Evaluate each move
    for (const auto& move : moves) {
        board.makeMove(move);

        int p1Score = board.getScore(PLAYER_1);
        int p2Score = board.getScore(PLAYER_2);
        int delta = p1Score - p2Score;

        std::cout << move.toString() << " → Score delta: " << delta << "\n";

        board.unmakeMove();
    }
}

int main() {
    // Endgame puzzle: P1 to move, find best play
    std::string puzzle = "h9:1,h6:8,h7:7|p1:9,6|p2:5,4|turn:1";

    solvePuzzle(puzzle);
    return 0;
}
```

---

## Testing

Run the puzzle tests:

```bash
cd build/Release
test_puzzle.exe
```

**Expected output:**
```
===========================================
HEXUKI C++ ENGINE - Puzzle Loading Tests
===========================================

Testing puzzle setup...
✓ Manual puzzle setup works

Testing position load/save...
✓ Position loading works
✓ Position save/load roundtrip works

Testing puzzle solving...
✓ Puzzle solving works

Testing completely custom puzzle...
✓ Empty board puzzle works

===========================================
✅ All puzzle tests passed!
===========================================
```

---

## Integration with JavaScript

You can export puzzles from your JavaScript game and solve them in C++:

**JavaScript:**
```javascript
// Export puzzle
function exportPuzzle(gameState) {
    let hexes = gameState.board.map((val, idx) =>
        val > 0 ? `h${idx}:${val}` : null
    ).filter(x => x).join(',');

    let p1Tiles = gameState.p1AvailableTiles.join(',');
    let p2Tiles = gameState.p2AvailableTiles.join(',');
    let turn = gameState.currentPlayer;

    return `${hexes}|p1:${p1Tiles}|p2:${p2Tiles}|turn:${turn}`;
}
```

**C++:**
```cpp
// Import and solve
std::string jsPosition = getFromJavaScript();
HexukiBitboard board;
board.loadPosition(jsPosition);
Move solution = minimaxSolve(board);
```

---

## Summary

✅ **Manual setup:** `setHexValue()`, `setAvailableTiles()`
✅ **String format:** `"h9:1,h6:5|p1:2,4,8|p2:6,7,9|turn:1"`
✅ **Load/save:** `loadPosition()`, `savePosition()`
✅ **Partial positions:** Any number of tiles, any player configuration
✅ **Interoperable:** Easy to share between JavaScript and C++

**Perfect for puzzle design and endgame analysis!** 🧩
