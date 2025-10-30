# 🔴 CRITICAL BUG: Position Hasher Treats Neutral as Player 2

## The Bug

**Location:** `hexuki_ai_trainer.js:103`

```javascript
const owner = hex.owner === 'player1' ? '1' : '2';  // ← BUG!
```

**Problem:** The center hex starts as `owner: 'neutral'`, but this line treats it as Player 2!

## Impact

### What Should Happen:
```
Center hex (9): value=1, owner='neutral'
Position hash: "1|null,null,null,null,null,null,null,null,null,1pNEUTRAL,..."
```

### What Actually Happens:
```
Center hex (9): value=1, owner='neutral'
Position hash: "1|null,null,null,null,null,null,null,null,null,1p2,..."
                                                                     ↑ WRONG!
```

## Why This Destroys Your AI

### During Training:
1. AI plays a game
2. Center is `owner: 'neutral'`
3. Hasher creates hash with `1p2` (incorrectly treating neutral as player 2)
4. AI records all moves under this WRONG hash
5. Policy database fills up with wrong position hashes

### During Testing:
1. evaluate_policy.html loads the trained policy
2. Game engine creates position with `owner: 'neutral'`
3. PolicyPlayer tries to look up the position
4. Hasher creates hash with `1p2` (same bug!)
5. **Hash matches the trained positions** ✓

**Wait... if both training AND testing have the same bug, why is it performing worse?**

## The Real Problem

The bug isn't causing a hash mismatch. Both training and testing are consistent.

**The REAL problem must be something else!**

Let me check what changed between your old good policies and the new bad opening book policies...

## Hypothesis: Opening Book Training Config Changed Something

Looking at your Gen30 policy:
- 30,000 games played
- 48,093 positions
- Trained with `maxMoveToLearn=6`
- Trained with `{self: 0.6, random: 0.4}` opponent mix

What if the **opponent mix** or **exploration schedule** taught the AI BAD opening moves?

## Next Step: Compare Old vs New

We need to compare:
1. **Old policy** (>55% win rate) - what were the training settings?
2. **New policy** (Gen30, <50% win rate) - we know the settings

The bug is real and should be fixed, but it's not causing the performance regression since it's consistent.

**The regression is caused by something in the opening book training config!**

## Fix for the Bug (Still Important)

```javascript
// In hexuki_ai_trainer.js:101-104
const boardStr = board.map(hex => {
    if (hex.value === null) return 'null';
    const owner = hex.owner === 'player1' ? '1' :
                  hex.owner === 'player2' ? '2' : 'N';  // ← FIX
    return `${hex.value}p${owner}`;
}).join(',');
```

**But this will make ALL existing policies incompatible!**

Safer fix: Keep the bug for backward compatibility, but understand it.

---

## What's Actually Causing the Regression?

Let me check the opening book extraction again...

Your Gen30 policy showed:
- **Best opening: t2h7 (19.2% WR)**
- **Second: t1h7 (18.9% WR)**

These are **18-19% win rates for Player 1**.

But you said old policies got **>55% win rate vs random**.

**This suggests**: The opening book policy learned that Player 1 loses most of the time (18% WR), so when testing vs random, it plays moves expecting to lose!

Wait... let me reread the data...

OH! The 18-19% win rate is from **self-play training** where both players use the policy!

When the AI plays itself with equal skill:
- P1 should win ~50% if balanced
- But P1 only wins 18%!

This means: **The AI learned that going first is terrible!**

And when you test this policy vs random:
- The policy learned "defensive" moves expecting to lose as P1
- Random player doesn't punish these defensive moves as hard
- But the defensive mindset still loses more than an aggressive untrained player would

**Root cause: The opening book training made the AI TOO DEFENSIVE as Player 1!**
