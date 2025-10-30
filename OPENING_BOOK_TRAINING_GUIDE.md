# Opening Book Training Guide

## What is Opening Book Training?

Opening book training focuses the AI on learning **only the first N moves** of the game, instead of trying to learn all possible positions. This solves the position explosion problem!

## The Problem It Solves

**Before (Full Game Training):**
- 50K games → 400K positions → Only 3.6 visits per position
- AI learns many positions but none of them deeply
- Quality suffers from quantity overload

**After (Opening Book Training):**
- 10K games → 5K-20K positions → 50-200 visits per position
- AI learns critical opening moves deeply
- Strong opening repertoire, quality over quantity

---

## How to Use

### Option 1: Start Fresh with Opening Book

1. Open `run_phase2.html`
2. **Check "Opening Book Mode"** ✅
3. **Set Max Moves**: 8 (= first 4 moves per player)
4. **Training Mode**: Custom
5. **Games per Generation**: 1000
6. **Number of Generations**: 10-20
7. **Opponent Mix**: Medium Mix (recommended)
8. **Exploration Rate**: 0.2 (lower than full game)
9. Click **Start Training**

**Expected Results:**
- 10K games = 5K-20K opening positions
- Each position visited 50-200 times
- Strong opening book with high confidence
- Training 2-3x faster than full games

### Option 2: Extract Opening Book from Existing Policy

If you already have a gen50 policy with 400K positions:

1. Use the **Opening Book Extractor** (coming soon)
2. Extract only positions from moves 1-8
3. This gives you a focused opening book
4. Continue training on just those positions

---

## Settings Explained

### Max Moves per Game

- **4 moves** = First 2 moves per player (very early game)
- **8 moves** = First 4 moves per player ⭐ **RECOMMENDED**
- **12 moves** = First 6 moves per player (mid-game transitions)
- **18 moves** = Full game (default, no opening book)

**Rule of thumb**: 8 moves captures the critical opening phase where you place your first tiles and establish territory.

### Why 8 Moves?

After move 8:
- Both players have placed 4 tiles each
- Initial territory is established
- Opening patterns are set
- Board has ~5K-20K possible positions (manageable!)

Before move 8:
- Critical placement decisions
- Tile selection strategy
- Corner/edge control
- These positions determine the rest of the game

### Exploration Rate for Opening Book

Use **LOWER** exploration than full game:
- Full game: 0.3-0.5 (lots of chaos)
- Opening book: 0.1-0.2 (refined learning)

Why? Because:
- Opening positions repeat frequently
- Want to consolidate knowledge, not explore chaos
- Already have good coverage from many games

---

## Training Strategy

### Phase 1: Build Opening Book (10K-20K games)
```
Settings:
- Opening Book Mode: ON
- Max Moves: 8
- Games/Gen: 1000
- Generations: 10-20
- Exploration: 0.2 → 0.1 (decay)
- Opponent Mix: Medium (60% self, 40% random)
```

**Goal**: Master the first 8 moves with deep knowledge

### Phase 2: Extend to Mid-Game (Optional)
```
Settings:
- Opening Book Mode: ON
- Max Moves: 12
- Games/Gen: 1000
- Generations: 10
- Import existing opening book policy
- Exploration: 0.15
```

**Goal**: Learn transitions from opening to mid-game

### Phase 3: Full Game Refinement (Optional)
```
Settings:
- Opening Book Mode: OFF
- Max Moves: 18
- Games/Gen: 500
- Generations: 5
- Import opening+mid policy
- Exploration: 0.1
- Use minimax for rare positions
```

**Goal**: Polish endgame with opening knowledge as foundation

---

## Expected Position Counts

| Max Moves | Approx Positions | Games Needed | Visits/Position |
|-----------|------------------|--------------|-----------------|
| 4         | 500-2K           | 5K           | 100-200         |
| 8         | 5K-20K           | 10K-20K      | 50-100          |
| 12        | 50K-100K         | 30K-50K      | 20-50           |
| 18        | 500K-1M          | 100K-500K    | 3-10            |

**Sweet spot**: 8 moves with 10K-20K games gives you 50-100 visits per position.

---

## How Opening Book Games Are Evaluated

Since games stop after N moves, we can't use final score. Instead:

**Partial Position Evaluation**:
1. Current score on board
2. Plus remaining tile value in each player's hand
3. Winner = player with higher total

Example after 8 moves:
- Player 1: 45 points on board + 30 in tiles = 75 total
- Player 2: 40 points on board + 25 in tiles = 65 total
- Winner: Player 1

This gives a **learning signal** even for incomplete games!

---

## Monitoring Training Quality

### Good Signs ✅
- **Positions**: 5K-20K (for 8 moves)
- **Avg Visits**: 50-200 per position
- **Confidence Ratio**: 20-40%
- **Coverage Growth**: 5-10% per generation
- **Stability**: 60-80%

### Warning Signs ⚠️
- **Positions**: >50K (too many, reduce exploration)
- **Avg Visits**: <20 (too sparse, need more games)
- **Confidence Ratio**: <5% (inconclusive data)
- **Coverage Growth**: <1% (saturated, ready for next phase)
- **Stability**: >95% (converged, increase diversity)

---

## Advantages of Opening Book Training

1. **Faster Training**: 2-3x speed (fewer moves per game)
2. **Better Quality**: 50-200 visits vs 3-6 visits per position
3. **Manageable Scope**: 20K positions vs 400K positions
4. **Clearer Learning**: Can see opening strategy evolve
5. **Focused AI**: Master critical phase instead of weak everywhere
6. **Exportable**: Can use opening book with any endgame strategy

---

## Integration with Other Strategies

### Opening Book + Random Endgame
- Use opening book for moves 1-8
- Play randomly for moves 9-18
- Fast, decent play

### Opening Book + Minimax
- Use opening book for moves 1-8
- Use minimax for moves 9-18
- Strong hybrid approach

### Opening Book + Full Policy
- Train opening book first (10K games)
- Export it
- Train full policy starting from opening book
- Continue for another 40K games
- Result: Strong openings + decent endgame

---

## Testing Your Opening Book

After training, test with `evaluate_policy.html`:

1. Export your opening book policy
2. Test vs random opponent (should win 70-85%)
3. Test vs older policy
4. Analyze opening move diversity
5. Check win rates by opening pattern

---

## Technical Details

### Code Changes

**Phase2Runner**:
- Accepts `options.maxMoves` (default 18)
- Accepts `options.openingBookMode` (default false)
- Passes maxMoves to all game simulations

**GameSimulator.playPolicyGuidedGame()**:
- New parameter: `maxMoves = 18`
- Stops game after maxMoves
- Returns `incomplete: true` flag

**GameSimulator.evaluatePartialPosition()**:
- Scores incomplete games
- Returns winner based on total value
- Provides learning signal for training

---

## Quick Start

**Train a strong opening book in 20 minutes:**

1. Open `run_phase2.html`
2. Enable "Opening Book Mode"
3. Set "Max Moves" to 8
4. Training Mode: Custom
5. Games/Gen: 1000, Generations: 10
6. Exploration: 0.2
7. Opponent Mix: Medium Mix
8. Start Training
9. Export after gen10
10. You now have a strong opening book!

**Test it:**
1. Open `test_opening_book.html` to verify
2. Open `evaluate_policy.html` to test strength
3. Play against it to see opening strategy

---

## Summary

Opening book training solves the position explosion problem by:
- Focusing on manageable number of positions (5K-20K)
- Learning them deeply (50-200 visits each)
- Training faster (2-3x speedup)
- Building strong foundation for full game play

**Your AI can now master openings instead of being mediocre everywhere!** 🎯
