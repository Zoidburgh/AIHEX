# Policy Analysis - Gen 15 (15,000 Games)

## 📊 Overview

**File**: `hexuki_policy_phase2_gen15_1760879135392.json`

| Metric | Value |
|--------|-------|
| **Total Games Played** | 15,000 |
| **Training Duration** | ~76 seconds (13:04:19 → 13:05:35) |
| **Games per Second** | ~197 games/sec |
| **Total Positions** | 18,895 |
| **Total Unique Moves** | 22,329 |
| **Policy Version** | 2.0 |

---

## 🎯 Training Type Detection

**Positions per Game**: 1.26

✅ **This IS Opening Book Training!**

**Evidence**:
- 15K games → 18,895 positions (1.26 positions/game)
- Full game training would be: 15K games → 100K-150K positions (10-15 positions/game)
- This matches opening book expectations ✅

---

## ⚠️ Quality Assessment

### Average Visits per Position: **0.79 visits**

**Status**: ⚠️ **LOW QUALITY - Significant Issues Detected**

### The Problem

Your opening book has **too many positions** with **too few visits**:

| Visit Range | Move Count | Percentage |
|-------------|------------|------------|
| 1-5 visits | 21,416 | 95.9% |
| 6-10 visits | 591 | 2.6% |
| 11-20 visits | 202 | 0.9% |
| 21-50 visits | 45 | 0.2% |
| 51-100 visits | 38 | 0.2% |
| 100+ visits | 37 | 0.2% |

**Analysis**:
- **95.9% of moves** have been tried ≤5 times (insufficient data!)
- Only **0.6% of moves** have been tried 50+ times (deep knowledge)
- **High Confidence Moves**: Only 343 moves (1.5% of total)

---

## 🔍 What Went Wrong?

### Expected vs Actual

| Metric | Expected (Opening Book) | Your Results | Status |
|--------|------------------------|--------------|--------|
| Positions | 5K-10K | 18,895 | ❌ Too many |
| Avg Visits/Position | 2-3 | 0.79 | ❌ Too few |
| High Confidence % | 20-40% | 1.5% | ❌ Very low |
| Moves with 50+ visits | 20-40% | 0.6% | ❌ Very low |

### Root Causes

**Problem**: Too much exploration, not enough exploitation

1. **High Exploration Rate**: Likely used 0.3-0.5 exploration
   - This causes AI to try random moves instead of revisiting known positions
   - Result: Spread learning too thin across 18,895 positions

2. **Self-Play Only**: Win rate analysis shows ~50% everywhere
   - Top moves all have 40-50% win rates (random play)
   - No clear "good" vs "bad" moves learned
   - Suggests pure self-play with high randomness

3. **No Opponent Diversity**: Mode distribution likely 100% self-play
   - Self-play with high exploration = random vs random
   - No learning signal

---

## 📈 Top Visited Moves (Most Learned)

| Rank | Move | Visits | Win Rate | Assessment |
|------|------|--------|----------|------------|
| 1 | t1h12 | 1,354 | 50.7% | Neutral (random) |
| 2 | t9h11 | 1,146 | 49.7% | Neutral (random) |
| 3 | t8h11 | 1,071 | 49.2% | Neutral (random) |
| 4 | t2h12 | 846 | 47.5% | Neutral (random) |
| 5 | t7h11 | 784 | 46.9% | Neutral (random) |
| 6 | t3h12 | 742 | 46.5% | Neutral (random) |
| 7 | t1h7 | 639 | 45.2% | Weak negative |
| 8 | t2h7 | 520 | 43.3% | Weak negative |
| 9 | t4h12 | 518 | 43.2% | Weak negative |
| 10 | t3h7 | 394 | 40.4% | Negative signal |

**Observation**: All win rates are 40-50% (close to random). No strong patterns learned.

---

## 💡 Recommendations

### Immediate Actions

#### 1. **Reduce Exploration Rate** ⭐ CRITICAL

**Problem**: High exploration (0.3+) means AI plays randomly instead of learning

**Solution**:
```
Current: 0.3-0.5 exploration
Recommended: 0.1-0.15 exploration

Or use ADAPTIVE exploration (already implemented!)
```

#### 2. **Add Opponent Diversity** ⭐ CRITICAL

**Problem**: Self-play only = AI plays against itself with same randomness

**Solution**:
```
Current: 100% self-play
Recommended: Medium Mix (60% self, 40% random)

This breaks self-play convergence!
```

#### 3. **Continue Training with Better Settings**

Don't start over! Continue from gen15 with improved settings:

**Recommended Settings for Gen16-30**:
- **Import**: Your gen15 policy (continue learning)
- **Exploration**: 0.1 (LOW - focus on refining knowledge)
- **Opponent Mix**: Medium Mix (60% self, 40% random)
- **Games per Gen**: 1000
- **Generations**: 15 more (gen16-30)
- **Opening Book Mode**: Keep enabled ✅
- **Max Moves to Learn**: Keep at 8 ✅

---

## 🎯 Expected Results After Fix

### After 15K More Games (Gen 30 Total)

| Metric | Current (Gen15) | Expected (Gen30) |
|--------|-----------------|------------------|
| Positions | 18,895 | 20K-25K (slow growth) |
| Avg Visits/Position | 0.79 | 1.5-2.0 |
| High Confidence % | 1.5% | 10-20% |
| Top Move Visits | 1,354 | 2,500-3,000 |
| Win Rate Spread | 40-50% (random) | 30-70% (patterns!) |

---

## 🔬 Technical Analysis

### Moves per Position: 1.18

**This is GOOD!** ✅

- Means: Average 1.18 different moves tried per position
- Indicates: AI is exploring variations but not going wild
- Expected: 1-2 moves per position for opening book

### Games Played per Move: 5.37

**This is LOW** ⚠️

- Means: Each move has been tried ~5 times on average
- Need: 20-50 times per move for confidence
- Solution: Lower exploration, more games, opponent diversity

---

## 📝 Summary

### What You Built

✅ **Opening Book Structure**: Correct (18,895 positions, focused on openings)
✅ **Training Speed**: Excellent (197 games/sec)
✅ **AlphaGo Approach**: Working (full games, learn partial)

### What Needs Fixing

❌ **Learning Quality**: Low (0.79 avg visits, 1.5% confidence)
❌ **Exploration**: Too high (spreading learning too thin)
❌ **Opponent Diversity**: Missing (all win rates ~50%)

### Next Steps

1. **Continue Training** from gen15 with:
   - ⭐ Exploration: 0.1 (down from 0.3+)
   - ⭐ Opponent Mix: Medium Mix
   - ✅ Opening Book: Keep enabled
   - 🎯 Goal: Consolidate knowledge instead of exploring

2. **Run 15K More Games** (gen16-30)
   - Expected: Win rates spread to 30-70%
   - Expected: 10-20% high confidence moves
   - Expected: Clear opening patterns emerge

3. **After Gen30**: Test against random opponent
   - Should win 60-70% (if learning worked)
   - Compare to gen15 (likely ~50% now)

---

## 🎓 Key Insight

**Your opening book has the right STRUCTURE but wrong SETTINGS**:

- ✅ Structure: 18K positions (focused), AlphaGo approach (working)
- ❌ Settings: Too much exploration, no opponent diversity

**It's like having a perfect notebook but scribbling random notes everywhere instead of studying deeply!**

**Fix**: Lower exploration + add opponent diversity = deep learning! 🎯
