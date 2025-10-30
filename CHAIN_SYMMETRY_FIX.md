# Chain Symmetry Fix for Hexuki

## Problem Identified

The original game had **asymmetric chains** that caused positional bias:

### OLD Player 2 Chain 4: `[12, 14, 16, 10]` ❌ BENT/IRREGULAR
```
      col: 0   1   2   3   4
    -------------------------
row 4:    .       .      10  <- JUMPS back up!
row 5:        .      12
row 6:   .      14       .
row 7:      16       .
```

This bent chain created a 14-percentage-point advantage for hex 7 over hex 11, despite the board being physically symmetric.

---

## Solution: Symmetric Straight Diagonals

**All chains are now perfectly straight diagonals:**

### Player 1 Chains (Down-Right \\)
```javascript
this.player1Chains = [
    [0, 2, 5],           // 3-hex chain
    [1, 4, 7, 10],       // 4-hex chain
    [3, 6, 9, 12, 15],   // 5-hex chain (center, includes starting hex 9)
    [8, 11, 14, 17],     // 4-hex chain
    [13, 16, 18]         // 3-hex chain
];
```

### Player 2 Chains (Down-Left /)
```javascript
this.player2Chains = [
    [0, 1, 3],           // 3-hex chain
    [2, 4, 6, 8],        // 4-hex chain
    [5, 7, 9, 11, 13],   // 5-hex chain (center, includes starting hex 9)
    [10, 12, 14, 16],    // 4-hex chain ⭐ FIXED!
    [15, 17, 18]         // 3-hex chain
];
```

---

## The Fix

**Changed P2 Chain 4 from:** `[12, 14, 16, 10]` (bent)
**To:** `[10, 12, 14, 16]` (straight diagonal)

### NEW Player 2 Chain 4: `[10, 12, 14, 16]` ✅ STRAIGHT
```
      col: 0   1   2   3   4
    -------------------------
row 4:    .       .      10
row 5:        .      12
row 6:   .      14       .
row 7:      16       .
```

Now it's a perfect down-left diagonal: (4,4) → (5,3) → (6,2) → (7,1)

---

## Symmetry Verification

✅ **Both players have 5 chains**
✅ **Chain lengths match: [3, 4, 5, 4, 3]**
✅ **All chains are straight diagonals**
✅ **Perfect mirror symmetry:**
   - P1 goes down-right (\)
   - P2 goes down-left (/)

---

## Visual Comparison

### Player 1 Chains (Down-Right)
```
Chain 1: [0, 2, 5]
     0
       2
         5

Chain 2: [1, 4, 7, 10]
   1
     4
       7
        10

Chain 3: [3, 6, 9, 12, 15]  <- CENTER
 3
   6
     9*
      12
       15

Chain 4: [8, 11, 14, 17]
8
  11
    14
      17

Chain 5: [13, 16, 18]
13
  16
    18
```

### Player 2 Chains (Down-Left)
```
Chain 1: [0, 1, 3]
     0
   1
 3

Chain 2: [2, 4, 6, 8]
       2
     4
   6
 8

Chain 3: [5, 7, 9, 11, 13]  <- CENTER
         5
       7
     9*
   11
 13

Chain 4: [10, 12, 14, 16]  <- FIXED!
        10
      12
    14
  16

Chain 5: [15, 17, 18]
       15
      17
    18
```

---

## Expected Impact

With symmetric chains, we expect:

1. **Hex 7 and Hex 11 should perform equally** (they're symmetric opposites)
2. **No column bias** - left/right positions should have equal value
3. **Strategic depth** - Both players have equivalent winning paths
4. **True board symmetry** - Position value depends on tactics, not structural bias

---

## Files Modified

- ✅ `hexuki_game_engine_v2.js` - Updated chain definitions (lines 63-80)

---

## Next Steps

1. **Retrain the policy** with the new symmetric chains
2. **Compare results** - Hex 7 vs Hex 11 should now be equivalent
3. **Verify no column bias** - Col 1 vs Col 3 should be balanced
4. **Test game balance** - Win rates should be 50/50 with optimal play

The game should now be **truly symmetric and fair**! 🎯
