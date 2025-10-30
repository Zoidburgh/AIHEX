# Hexuki Board Map - Hex Positions

## 🗺️ The 19-Hex Board Layout

```
CORRECT Hexuki Board:

         0
       1     2
     3     4     5
   6     7
 8     9    10
  11    12
    13    14    15
      16    17
        18
```

---

## 📍 Hex 7 Location

**Hex 7 = Upper-right neighbor of center (Hex 9)**

```
Visual with Hex 7 highlighted:

         0
       1     2
     3     4     5
   6    [7]
 8     9    10
  11    12
    13    14    15
      16    17
        18

    ↑ THIS IS HEX 7
    (Adjacent to center!)
```

---

## 🎮 In Game Context

**Starting Position**: Tile 1 is placed at Hex 9 (center) by Player 2

```
Game Start:

         0
       1     2
     3     4     5
   6    [7]
 8    {9}   10
  11    12   ↑ Center (Tile 1)
    13    14    15
      16    17
        18

    ↑ Hex 7 = ADJACENT to center (playable on first move!)
```

---

## 💀 Why SOME Hex 7 Moves Are Terrible

### Position Analysis

**Distance from Center (Hex 9)**:
- Hex 7 is **directly adjacent** to the center (UPRIGHT neighbor)
- Playable on Player 1's first move

**Adjacency**:

Hex 7 is adjacent to:
- Hex 4 (up-left)
- Hex 9 (down-left) ← CENTER!
- Hex 12 (down-right)

```
         0
       1     2
     3     4     5
          ↓
   6    [7]
        ↓     ↓
 8     9    10
  11    12
    13    14    15
      16    17
        18
```

**The Nuanced Truth**:
- Hex 7 IS adjacent to center (playable on first move)
- But certain tiles at Hex 7 are terrible opening moves
- Context matters: some Hex 7 moves later in game are excellent!

---

## 📊 Hex 7 Statistics (From Your Gen20 Data)

### High Tiles (5-9) at Hex 7 = TERRIBLE First Move

```
ZERO WIN RATE with high tiles on first move:
- Tile 5 → Hex 7: 0% WR (105 tries) 💀
- Tile 6 → Hex 7: 0% WR (105 tries) 💀
- Tile 7 → Hex 7: 0% WR (105 tries) 💀
- Tile 8 → Hex 7: 0% WR (105 tries) 💀
- Tile 9 → Hex 7: 0% WR (105 tries) 💀
```

### Low Tiles (1-4) at Hex 7 = MEDIOCRE First Move

```
Low win rates with low tiles on first move:
- Tile 1 → Hex 7: 36.2% WR (1,742 tries) ⚠️
- Tile 2 → Hex 7: 33.5% WR (1,127 tries) ⚠️
- Tile 3 → Hex 7: 31.1% WR (827 tries) ⚠️
- Tile 4 → Hex 7: 30.8% WR (804 tries) ⚠️
```

### High Tiles at Hex 7 Later = EXCELLENT!

```
Strong moves in later game positions:
- Tile 8 → Hex 7: 89.7% WR (146 tries) ✅
- Tile 9 → Hex 7: 89.7% WR (146 tries) ✅
```

**Conclusion**: Don't waste high tiles (5-9) on Hex 7 as opening move! Save them for later!

---

## ✅ Good Opening Positions (For Comparison)

### Hex 12 (AI's Most Explored!)

```
         0
       1     2
     3     4     5
   6     7
 8     9    10
  11   [12] ← HEX 12
    13    14    15
      16    17
        18
```

**Hex 12 Stats**:
- Tile 1 → Hex 12: **42.4% WR** (9,001 visits!)
- Position: Adjacent to center (down-right from Hex 9)
- Most explored opening move
- Good chain-building potential

### Hex 11 (Also Strong)

```
         0
       1     2
     3     4     5
   6     7
 8     9    10
 [11]   12
    13    14    15
      16    17
        18
```

**Hex 11 Stats**:
- Tile 9 → Hex 11: **40.1% WR** (4,148 visits)
- Position: Adjacent to center (down-left from Hex 9)
- Good connectivity

---

## 🗺️ Full Position Quality Map

### Heat Map (Based on AI's Learning)

```
Quality Ratings:

         ?
       ?     ?
     ?     ?     ?
   ?    36%
 ?    {S}    ?
  40%   42%
    ?     ?     ?
      ?    95%
        ?

Legend:
  {S} = Start (Hex 9, Tile 1 by P2)
  42% = Hex 12 (most explored first move)
  40% = Hex 11 (strong first move)
  95% = Hex 17 (killer mid-game move!)
  36% = Hex 7 with Tile 1 (mediocre)
       Hex 7 with Tiles 5-9 = 0% (terrible!)
  ? = Not enough data yet
```

---

## 📐 Board Geometry

### Adjacency Structure

**Hex 9 (center) has 6 neighbors**:
- Hex 4 (up)
- Hex 7 (up-right) ← Hex 7 IS adjacent!
- Hex 12 (down-right)
- Hex 14 (down)
- Hex 11 (down-left)
- Hex 6 (up-left)

**Hex 7 has 3 neighbors**:
- Hex 4 (up-left)
- Hex 9 (down-left) ← CENTER
- Hex 12 (down-right)

```
Adjacency Diagram:

         0
       1     2
     3     4     5
   6    [7]
 8     9    10
  11    12
    13    14    15
      16    17
        18

Hex 7's neighbors: 4, 9, 12
Hex 9's neighbors: 4, 6, 7, 11, 12, 14
```

---

## 🎯 Visual Guide for Players

### Where is Hex 7?

**If you're looking at the physical board**:
- Start at the center (Hex 9 with Tile 1)
- Look **up and to the right**
- That's Hex 7!

```
         0
       1     2
     3     4     5
   6    [7] ← HERE!
 8    {9}   10
  11    12
    13    14    15
      16    17
        18

Hex 7 = UPRIGHT from center
```

### Strategic Advice

**Hex 7 on first move**:
- ❌ DON'T play high tiles (5-9) here → 0% win rate!
- ⚠️ Low tiles (1-4) are mediocre → 30-36% win rate
- ✅ Better options: Hex 12 (42% WR) or Hex 11 (40% WR)

**Hex 7 in later game**:
- ✅ High tiles (8-9) can be EXCELLENT → 90% win rate!
- Context matters!

---

## 🔢 All Hex Positions with Coordinates

### Complete Board Reference

```
Coordinate System (row, col):

         0 (0,2)
      1 (1,1)  2 (1,3)
   3 (2,0)  4 (2,2)  5 (2,4)
 6 (3,1)  7 (3,3)
8 (4,0)  9 (4,2)  10 (4,4)
 11 (5,1)  12 (5,3)
   13 (6,0)  14 (6,2)  15 (6,4)
     16 (7,1)  17 (7,3)
        18 (8,2)
```

**Hex 7 = row 3, col 3**
**Hex 9 = row 4, col 2 (center)**

---

## 📊 Complete Adjacency Table

### All Hex Neighbors (calculated from coordinates)

| Hex | Neighbors |
|-----|-----------|
| 0 | 1, 4 |
| 1 | 0, 2, 3, 4, 6 |
| 2 | 1, 4, 5, 7 |
| 3 | 1, 6, 8 |
| 4 | 0, 1, 2, 6, 7, 9 |
| 5 | 2, 7, 10 |
| 6 | 1, 3, 4, 9, 11 |
| **7** | **4, 9, 12** ← Only 3 neighbors |
| 8 | 3, 11, 13 |
| **9** | **4, 6, 7, 11, 12, 14** ← Center: 6 neighbors |
| 10 | 5, 12, 15 |
| 11 | 6, 8, 9, 13, 14, 16 |
| 12 | 7, 9, 10, 14, 15, 17 |
| 13 | 8, 11, 16 |
| 14 | 9, 11, 12, 16, 17, 18 |
| 15 | 10, 12, 17 |
| 16 | 11, 13, 14, 18 |
| 17 | 12, 14, 15, 18 |
| 18 | 14, 16, 17 |

**Key Observation**: Hex 7 has only 3 neighbors (fewer options), while Hex 9 (center) has 6!

---

## 🎮 Gameplay Example

### Why Playing HIGH TILES at Hex 7 on First Move Loses

**Move 1**: Player 1 plays Tile 5, 6, 7, 8, or 9 at Hex 7

```
Board state:
         0
       1     2
     3     4     5
   6    [5] ← Bad opening!
 8     1    10
  11    12
    13    14    15
      16    17
        18
```

**Problems**:
1. **Wasted high tile** (should save for later scoring opportunities)
2. **Only 3 neighbors** (limited future options)
3. **Mediocre position** for chain building
4. **Opponent gets better positions** (Hex 11, 12, 14)

**Result**: 0% win rate with tiles 5-9 at Hex 7 on first move (105 attempts each)!

---

## 📝 Summary

**Hex 7 Location**:
- Row 3, col 3
- Upper-right from center
- **ADJACENT to center** (playable on first move!)

**Corrected Understanding**:
- ❌ Playing tiles 5-9 at Hex 7 on first move = 0% WR (terrible!)
- ⚠️ Playing tiles 1-4 at Hex 7 on first move = 30-36% WR (mediocre)
- ✅ Playing tiles 8-9 at Hex 7 in later game = 90% WR (excellent in context!)

**What to play instead (first move)**:
- **Hex 12** (Tile 1): 42% WR, 9,001 visits ✅
- **Hex 11** (Tile 9): 40% WR, 4,148 visits ✅

**Visual Reminder**:
```
         0
       1     2
     3     4     5
   6   [7]
 8     9    10
 [12]  [11]
    13    14    15
      16    17
        18

7 with tiles 5-9 = 💀 (0% WR)
12 with tile 1 = ✅ (42% WR)
11 with tile 9 = ✅ (40% WR)
17 with tile 1 = ⭐ (95% WR later!)
```

---

## 🎯 Quick Reference

**Key Lesson**: Don't waste high-value tiles (5-9) on Hex 7 as your opening move! Save them for later when they can score big points. Use low tiles (1-4) for opening positions, or choose better hexes like 11 and 12.
