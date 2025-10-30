# Testing Inconsistency - Root Cause Analysis

## Problem

You're seeing **different win rates** when testing the **same policy file** multiple times against random. This is NOT just variance - it's **systematic inconsistency**.

---

## Root Causes Found

### 🔴 **CRITICAL ISSUE #1: Random Fallback in Unknown Positions**

**Location:** `hexuki_ai_trainer.js:960-961`

```javascript
// If position has NO data, play randomly
if (!hasAnyData) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
}
```

**Problem:**
- Opening book policies (maxMoveToLearn=6) only have data for first 6 moves
- After move 6, ALL positions are unknown
- PolicyPlayer plays **randomly** for moves 7-18 (12 moves!)
- This introduces **massive randomness** in test results

**Impact:**
- 12 out of 18 moves are random (67% of the game!)
- Win rate varies wildly between test runs
- You're NOT testing the policy, you're testing random play!

---

### 🟠 **ISSUE #2: UCB Exploration Bonus**

**Location:** `hexuki_ai_trainer.js:205-236` (PolicyDatabase.getUCBScore)

```javascript
// Exploration bonus (UCB1 formula)
const exploration = explorationConstant * Math.sqrt(
    Math.log(totalGames + 1) / (moveStats.gamesPlayed + 1)
);

return winRate + exploration;
```

**Problem:**
- Even with `explorationRate=0` in testing, UCB adds exploration bonus!
- Moves with fewer visits get higher UCB scores
- This creates **non-deterministic tie-breaking** when multiple moves have similar scores

**Impact:**
- If two moves have close win rates (e.g., 42.3% vs 42.5%), the UCB bonus can flip which one is chosen
- This creates **small but systematic** variance in testing

---

### 🟡 **ISSUE #3: Random Tie-Breaking**

**Location:** `hexuki_ai_trainer.js:982-993` (PolicyPlayer.selectMove)

```javascript
for (let move of validMoves) {
    const moveStr = PositionHasher.moveToString(move.tileValue, move.hexId);
    const ucbScore = policy.getUCBScore(positionHash, moveStr);

    if (ucbScore > bestScore) {  // ← NOT >= !
        bestScore = ucbScore;
        bestMove = move;
    }
}
```

**Problem:**
- If multiple moves have **identical UCB scores**, only the FIRST one is chosen
- The order of `validMoves` may vary (depends on tile order iteration)
- This creates **deterministic but position-dependent** behavior

**Impact:**
- Small variance in move selection when scores are tied

---

### 🟢 **ISSUE #4: Bayesian Prior Smoothing**

**Location:** `hexuki_ai_trainer.js:214-222`

```javascript
// Bayesian prior: assume neutral 50% win rate with small weight
const priorWins = 1;
const priorWeight = 2;

// Combine actual stats with prior
const adjustedWins = moveStats.wins + priorWins;
const adjustedWeight = moveStats.totalWeight + priorWeight;
```

**Not a Problem:** This is intentional smoothing, but worth noting for understanding.

---

## The Real Problem: Opening Book Testing

Your Gen30 policy was trained with **maxMoveToLearn=6** (opening book mode).

This means:
- Policy has data for moves 1-6 ✅
- Policy has **NO data** for moves 7-18 ❌

When you test this policy:
1. **Moves 1-6**: PolicyPlayer uses learned policy
2. **Moves 7-18**: PolicyPlayer plays **RANDOMLY** (line 960-961)

**Result:** 67% of the game is random play!

---

## Why You See Different Win Rates

### Scenario A: Testing Gen30 Opening Book Policy

**Test Run 1:**
- Moves 1-6: Policy plays (deterministic-ish)
- Moves 7-18: Random (gets lucky, wins 55% of games)

**Test Run 2:**
- Moves 1-6: Policy plays (same as before)
- Moves 7-18: Random (gets unlucky, wins 45% of games)

**Conclusion:** The difference is due to randomness in moves 7-18!

---

### Scenario B: Testing Full-Game Policy

If you're testing a policy that was trained on ALL 18 moves:

**Test Run 1:**
- UCB scores: t2h7 = 0.523, t1h7 = 0.522 → chooses t2h7
- Later position: t5h12 = 0.601, t3h11 = 0.600 → chooses t5h12
- Wins 52% of games

**Test Run 2:**
- Same UCB scores (deterministic)
- Same move choices
- Wins 52% of games ✅ (should be same!)

**But wait...** if you're seeing DIFFERENT results with a full-game policy, then:
- UCB exploration bonus is causing ties
- Random exploration (line 977) is triggering even at 0.0?
- There's a bug somewhere else

---

## How to Diagnose

Run this test to see what's happening:

```javascript
// In evaluate_policy.html console:

// Test 1: Load policy
const policy = /* your loaded policy */;

// Test 2: Check starting position data
const game = new HexukiGameEngineV2();
const hash = HexukiAI.PositionHasher.hash(game);
const stats = policy.getStats(hash);

console.log("Starting position has data:", Object.keys(stats).length, "moves");

// Test 3: Check move 7 position (should have no data for opening book)
// (You'd need to play 6 moves first, then check)
```

---

## Solutions

### ✅ **Solution #1: Test with maxMoves=6 (Opening Book Only)**

If you're testing an opening book policy, only test the opening!

**In evaluate_policy.html, modify:**

```javascript
// Line 330-350: Limit game to 6 moves for opening book testing
const MAX_MOVES = 6;  // ← Add this for opening book policies
let moveCount = 0;

while (!game.gameEnded && moveCount < MAX_MOVES) {  // ← Use MAX_MOVES
    // ... existing code
}

// After 6 moves, evaluate position heuristically
const scores = game.calculateScores();
const p1TileValue = game.player1Tiles.reduce((sum, t) => sum + t, 0);
const p2TileValue = game.player2Tiles.reduce((sum, t) => sum + t, 0);
const p1Total = scores.player1 + p1TileValue;
const p2Total = scores.player2 + p2TileValue;

const winner = p1Total > p2Total ? 1 : p1Total < p2Total ? 2 : 0;
```

**This makes testing deterministic!**

---

### ✅ **Solution #2: Use Pure Exploitation (No UCB Bonus)**

Modify PolicyPlayer to have a "pure exploitation" mode:

```javascript
// In hexuki_ai_trainer.js, add new method:
selectBestMove(game, validMoves, policy) {
    const positionHash = PositionHasher.hash(game);
    const positionStats = policy.getStats(positionHash);

    // If no data, return random (unavoidable for unknown positions)
    if (Object.keys(positionStats).length === 0) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Find move with highest WIN RATE (no UCB bonus!)
    let bestMove = null;
    let bestWinRate = -1;

    for (let move of validMoves) {
        const moveStr = PositionHasher.moveToString(move.tileValue, move.hexId);
        const stats = positionStats[moveStr];

        if (!stats || stats.totalWeight === 0) continue;

        const winRate = stats.wins / stats.totalWeight;

        if (winRate > bestWinRate) {
            bestWinRate = winRate;
            bestMove = move;
        }
    }

    return bestMove || validMoves[0];  // Deterministic fallback
}
```

---

### ✅ **Solution #3: Disable Random Fallback for Testing**

Add a "strict mode" that throws an error instead of playing randomly:

```javascript
selectMove(game, validMoves, policy, explorationRate, strictMode = false) {
    const positionHash = PositionHasher.hash(game);
    const positionStats = policy.getStats(positionHash);

    if (Object.keys(positionStats).length === 0) {
        if (strictMode) {
            throw new Error(`No policy data for position: ${positionHash.substring(0, 50)}`);
        }
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // ... rest of selectMove logic
}
```

Then in testing, catch the error to detect when policy has no data.

---

## Recommended Immediate Action

**For Opening Book Testing:**

1. **Modify evaluate_policy.html to play only 6 moves**
2. **Use heuristic evaluation** for incomplete games
3. **This makes testing deterministic** (no random moves)

**For Full-Game Policy Testing:**

1. **Check if policy actually has data** for all positions
2. **Use pure win-rate selection** (no UCB bonus)
3. **Verify determinism** by running same test twice

---

## Quick Test Script

Add this to evaluate_policy.html:

```javascript
// Test for determinism
async function testDeterminism() {
    const results1 = await runTest(100);  // 100 games
    const results2 = await runTest(100);  // Same 100 games

    if (results1.winRate !== results2.winRate) {
        console.error("NON-DETERMINISTIC! Different win rates:", results1.winRate, results2.winRate);
        console.log("Difference:", Math.abs(results1.winRate - results2.winRate));
    } else {
        console.log("DETERMINISTIC! Win rates match:", results1.winRate);
    }
}
```

---

## Summary

**Root Cause:** Opening book policies play randomly for moves 7-18 (67% of game!)

**Fix:** Test only the opening (first 6 moves) with heuristic evaluation

**Do you want me to implement this fix in evaluate_policy.html?**
