# Configuration Guide - Testing Different Tile Values

## ✅ You're Right - Always 9 Tiles!

The game **ALWAYS requires exactly 9 tiles per player** - that's a core game rule and cannot be changed.

What IS configurable is the **VALUES** of those 9 tiles.

## How to Change Tile Values

### Edit the TILE_VALUES array in `include/utils/constants.h`:

```cpp
// The actual tile values each player has (9 values)
// DEFAULT: Standard 1-9 tiles
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 2, 3, 4, 5, 6, 7, 8, 9};
```

### Example Variants:

**Even numbers only:**
```cpp
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {2, 4, 6, 8, 10, 12, 14, 16, 18};
```
- Scores will be MUCH higher (smallest product = 2×4×6 = 48)
- Maximum chain value: 2×4×6×8×10 = 3,840

**Odd numbers only:**
```cpp
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 3, 5, 7, 9, 11, 13, 15, 17};
```
- Scores slightly higher than standard
- Maximum chain value: 1×3×5×7×9 = 945

**Fibonacci sequence:**
```cpp
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 2, 3, 5, 8, 13, 21, 34, 55};
```
- Exponential scaling - HUGE scores late game
- Maximum chain value: 1×2×3×5×8 = 240 or 8×13×21×34×55 = 6,401,040!

**Powers of 2:**
```cpp
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 2, 4, 8, 16, 32, 64, 128, 256};
```
- Exponential growth
- Maximum chain value: 256×128×64×32×16 = 17,179,869,184 😱

**Prime numbers:**
```cpp
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {2, 3, 5, 7, 11, 13, 17, 19, 23};
```
- Interesting mathematical properties
- No common factors

### Then Recompile:

```bash
cmake --build build --config Release
```

---

## How It Works Internally

### Bitset Storage (Efficient!)

The engine still uses bitsets for tile tracking:
```cpp
uint16_t p1AvailableTiles;  // 16-bit mask
uint16_t p2AvailableTiles;
```

**Standard tiles [1-9]:**
```
Bits: 0 0 0 0 0 0 0 1 1 1 1 1 1 1 1 1 0
      ↑ (unused)     ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑
                     9 8 7 6 5 4 3 2 1 0
```

**Even numbers [2,4,6,8,10,12,14,16,18]:**
```
Bits: 0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 0
        ↑   ↑   ↑   ↑   ↑   ↑   ↑   ↑   ↑
       18  16  14  12  10   8   6   4   2
```

Each tile value maps directly to a bit position. When you use a tile, that bit gets cleared.

### Zobrist Hashing

Hash table is sized for the maximum tile value:
```cpp
uint64_t tileHashes[NUM_HEXES][MAX_TILE_VALUE + 1];
```

**Standard [1-9]:** Array size = 19 × 10 = 190 entries
**Even [2,4,6,8,10,12,14,16,18]:** Array size = 19 × 19 = 361 entries
**Fibonacci [1,2,3,5,8,13,21,34,55]:** Array size = 19 × 56 = 1,064 entries

Only the actual tile values get initialized - unused slots stay zero.

---

## Limits

### Maximum Tile Value: **15** (with `uint16_t`)

The bitset approach uses `uint16_t` (16 bits), so the largest tile value you can use is **15**.

**This works:**
```cpp
constexpr int TILE_VALUES[9] = {1, 2, 3, 4, 5, 6, 7, 8, 15};  // ✓
```

**This won't work:**
```cpp
constexpr int TILE_VALUES[9] = {10, 20, 30, 40, 50, 60, 70, 80, 90};  // ✗ Values > 15
```

### To support larger values (up to 31):

Change bitset to `uint32_t`:
```cpp
// bitboard.h
uint32_t p1AvailableTiles;
uint32_t p2AvailableTiles;

// constants.h
constexpr uint32_t ALL_TILES_MASK = calculateTilesMask();
```

### To support arbitrary large values:

Would need to replace bitsets with `std::array<int, 9>` or `std::set<int>`, which is slower but unlimited.

---

## Why This Matters for Research

### 1. **Score Scaling**
Test how different tile values affect game balance:
- Small values [1-5]: Tight scores, more draws?
- Large values [10-90]: Explosive endgame?
- Fibonacci: Exponential growth rewards late-game control

### 2. **AI Strategy**
Do optimal strategies change with different values?
- High-value tiles might be hoarded more
- Multiplicative vs additive thinking shifts

### 3. **Game Length**
Does optimal play change when scores scale differently?
- Fibonacci might favor aggressive early placement
- Even numbers might favor conservative play

### 4. **Complexity**
Does branching factor matter more with certain values?
- Larger values = bigger score deltas per move
- Could make some positions more/less critical

---

## Example: Testing Even vs Odd Tiles

### Hypothesis:
Even-only tiles should produce **exactly 2× higher scores** than standard tiles (since every value is doubled).

**Test this:**
1. Play same game sequence with standard tiles [1-9]
2. Play same game sequence with even tiles [2,4,6,8,10,12,14,16,18]
3. Compare final scores

**Expected:** Score_even = 2^N × Score_standard (where N = # tiles in longest chain)

This validates the implementation is working correctly!

---

## Summary

✅ **Always 9 tiles per player** (game rule, cannot change)
✅ **Tile VALUES are configurable** (change TILE_VALUES array)
✅ **Bitset approach stays efficient** (values map to bit positions)
✅ **Max tile value = 15** (can extend to 31 with uint32_t)
✅ **One recompile** → Test new variant

**Ready to experiment with tile values!** 🎲
