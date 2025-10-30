# Starting Fresh Training with Symmetric Chains

## ✅ What's Been Fixed

1. **hexuki_game_engine_v2.js** - Updated to symmetric chains
2. **hexuki_game_engine.js** - Updated to symmetric chains
3. **hexuki_ANTISYMMETRY_TEST.html** - Updated to symmetric chains

All files now have:
- Player 1: Down-right diagonals (\)
- Player 2: Down-left diagonals (/)
- P2 Chain 4: **[10, 12, 14, 16]** (was broken [12, 14, 16, 10])

---

## 🎯 Before You Start

### Option 1: Backup Old Policies (Recommended)
```bash
mkdir old_asymmetric_policies
move hexuki_policy_phase2_gen15_1760876800571.json old_asymmetric_policies/
move hexuki_policy_phase2_gen20_1760924716749.json old_asymmetric_policies/
```

### Option 2: Delete Old Policies
```bash
del hexuki_policy_phase2_gen*.json
```

---

## 🚀 Start Training

### Which trainer are you using?

**If using `hexuki_ai_trainer.js`:**
```bash
node hexuki_ai_trainer.js
```

**If using an HTML interface:**
- Open your training HTML file in browser
- Click "Start Training" or similar button
- Set generation to 0
- Set games per generation (recommend 20,000 for good data)

---

## 📊 What to Expect with Symmetric Chains

### Opening Move (Move 1) - Should Now Be Balanced:

**OLD asymmetric results:**
- Hex 7: 46.6% avg WR (BEST)
- Hex 11: 32.5% avg WR (WORST)
- **14 point difference!**

**NEW symmetric results (expected):**
- Hex 7: ~44-45% avg WR
- Hex 11: ~44-45% avg WR
- **<2 point difference** (should be nearly equal!)

### Column Performance - Should Now Be Balanced:

**OLD asymmetric results:**
- Column 3 (right): 47.4% avg WR
- Column 1 (left): 35.3% avg WR
- **12 point difference!**

**NEW symmetric results (expected):**
- Column 3 (right): ~43-44% avg WR
- Column 1 (left): ~43-44% avg WR
- **<2 point difference** (should be equal!)

---

## 📝 Testing Milestones

### After 20,000 games (Gen 20):
Run the analysis to check symmetry:
```bash
python analyze_opening_depth.py
```

Look for:
- ✅ Hex 7 and Hex 11 have similar win rates (within 2-3%)
- ✅ Column 1 and Column 3 have similar performance
- ✅ No single move dominates >15% of games (good exploration)

### After 50,000 games (Gen 50):
- Should see more definitive strategic patterns emerging
- Can start analyzing moves 3-4 with confidence
- Win rates should stabilize

### After 100,000 games (Gen 100):
- Full strategic picture should be clear
- Can extract reliable opening book
- Deep positions should have adequate sampling

---

## 🔍 Key Things to Monitor

### 1. Exploration Quality
Check that opening moves are explored evenly:
```python
# In your analysis script
opening_diversity = entropy / max_entropy
# Should be > 0.90 for good exploration
```

### 2. Symmetry Verification
Compare symmetric hex pairs:
- (7, 11) - should be within 3% win rate
- (6, 12) - should be within 3% win rate
- (4, 14) - should be within 3% win rate

### 3. No Structural Bias
- Left side (col 0-1) ≈ Right side (col 3-4)
- Top chains ≈ Bottom chains
- All diagonals explored evenly

---

## ⚠️ If You See Asymmetry Again

If hex 7 still dominates hex 11 after 20K+ games with symmetric chains, it means:

1. **First-move advantage exists** - Player 1 may have inherent advantage
2. **Tactical asymmetry** - Some strategic pattern favors one side
3. **Training artifact** - Need higher exploration rate

This would be **real strategic asymmetry**, not structural!

---

## 📁 Files You'll Generate

Starting fresh, you'll create:
```
hexuki_policy_phase2_gen0_[timestamp].json
hexuki_policy_phase2_gen5_[timestamp].json
hexuki_policy_phase2_gen10_[timestamp].json
hexuki_policy_phase2_gen15_[timestamp].json
hexuki_policy_phase2_gen20_[timestamp].json
...
```

---

## 🎯 Success Criteria

After retraining with symmetric chains, success means:

✅ **Hex 7 ≈ Hex 11** (within 3% win rate)
✅ **Column 1 ≈ Column 3** (within 3% performance)
✅ **No single opening dominates** (no move >60% of games)
✅ **Strategic depth emerges** (Move 2-4 patterns are meaningful)
✅ **Fair game** (both players ~50% win rate with optimal play)

---

## 🚨 Training Parameters to Check

Make sure your trainer has:
- **High exploration rate**: epsilon ≥ 0.3 for first 50K games
- **Self-play**: Both players use same policy
- **Proper scoring**: Using the fixed symmetric chains
- **Game variety**: Not always starting from same state

---

## Ready to Start?

1. ✅ Backup/delete old policies
2. ✅ Verify all engine files have symmetric chains
3. ✅ Set exploration rate (epsilon) high (0.3-0.5)
4. ✅ Start training from generation 0
5. ✅ Monitor first 20K games for symmetry

**When you hit 20,000 games, come back and we'll analyze if the symmetry fix worked!**

Good luck! 🎲
