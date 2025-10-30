# Hexuki AI Self-Play Learning System Design V2

## Overview
Build a robust, debuggable self-play learning system with competitive heuristic testing that discovers optimal Hexuki strategy through game simulation. The AI learns from wins/losses with comprehensive validation and error detection.

---

## Key Improvements from V1

1. **Weighted Credit Assignment**: Moves closer to game end get more credit
2. **Competitive Heuristic Testing**: Multiple strategies compete in tournaments
3. **Comprehensive Debugging**: Multi-level logging, validation, and inspection tools
4. **Improved Position Hashing**: Include available tiles, not just used positions
5. **Auto-Pause on Errors**: Training stops if anomalies detected
6. **Real-Time Dashboard**: Live metrics and convergence tracking
7. **Manual Testing Tools**: Inspect AI decisions, watch games with commentary

---

## Core Design Principles

1. **Win-Based Learning**: Only final game outcome matters (win/loss/tie)
2. **Temporal Credit Assignment**: Later moves get more weight
3. **Exploration vs Exploitation**: UCB balancing + competitive testing
4. **Validation First**: Every game validated, errors pause training
5. **Debuggability**: Extensive logging at multiple verbosity levels
6. **Incremental Learning**: Resume from saved state
7. **Persistent Storage**: Save learned knowledge to JSON

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Hexuki AI Training System V2                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │     Enhanced Position Hash Generator              │     │
│  │  (includes available tiles + board state)         │     │
│  └───────────────────────────────────────────────────┘     │
│                         ↓                                   │
│  ┌───────────────────────────────────────────────────┐     │
│  │      Weighted Move Policy Database                │     │
│  │  position_hash → {                                │     │
│  │    move_id → {wins, losses, ties, weight}         │     │
│  │  }                                                │     │
│  └───────────────────────────────────────────────────┘     │
│                         ↓                                   │
│  ┌───────────────────────────────────────────────────┐     │
│  │      Competitive Self-Play Engine                 │     │
│  │  - Multiple heuristic strategies                  │     │
│  │  - Tournament system (Elo ratings)                │     │
│  │  - UCB + heuristic bonuses                        │     │
│  │  - Game validation after each game                │     │
│  └───────────────────────────────────────────────────┘     │
│                         ↓                                   │
│  ┌───────────────────────────────────────────────────┐     │
│  │      Temporal Difference Learning Engine          │     │
│  │  - Weighted credit assignment                     │     │
│  │  - Discount factor (γ = 0.95)                     │     │
│  │  - Backpropagate with weights                     │     │
│  └───────────────────────────────────────────────────┘     │
│                         ↓                                   │
│  ┌───────────────────────────────────────────────────┐     │
│  │      Validation & Error Detection                 │     │
│  │  - Game completion checks                         │     │
│  │  - Score verification                             │     │
│  │  - Auto-pause on anomalies                        │     │
│  │  - Multi-level logging                            │     │
│  └───────────────────────────────────────────────────┘     │
│                         ↓                                   │
│  ┌───────────────────────────────────────────────────┐     │
│  │    Persistent Storage + Analytics                 │     │
│  │  - Versioned JSON saves                           │     │
│  │  - Training logs export                           │     │
│  │  - Heuristic tournament results                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Enhanced Position Hash Generator

**Purpose**: Create unique identifier capturing ALL relevant game state

**Input**: Complete game state
```javascript
{
    board: [...],              // 19 hex values/owners
    currentPlayer: 1 or 2,
    player1Tiles: [...],       // AVAILABLE tiles (not used)
    player2Tiles: [...],
    player1UsedPositions: Set,
    player2UsedPositions: Set
}
```

**Output**: Enhanced hash string
```javascript
"1|null,null,5p1,null,...|p1_avail:234567|p2_avail:123456|p1_used:0,1,2|p2_used:3,4"
// Format: player|board|p1_available|p2_available|p1_used|p2_used
```

**Critical Improvement**: Including available tiles makes positions truly unique
- Position with tiles [1,2,3] available ≠ position with [7,8,9] available
- This captures strategic context properly

**Implementation**:
```javascript
function hashPosition(gameState) {
    const boardStr = gameState.board.map(hex => {
        if (hex.value === null) return 'null';
        return `${hex.value}p${hex.owner === 'player1' ? 1 : 2}`;
    }).join(',');

    const p1Available = gameState.player1Tiles.sort().join('');
    const p2Available = gameState.player2Tiles.sort().join('');
    const p1Used = Array.from(gameState.player1UsedPositions).sort().join(',');
    const p2Used = Array.from(gameState.player2UsedPositions).sort().join(',');

    return `${gameState.currentPlayer}|${boardStr}|p1a:${p1Available}|p2a:${p2Available}|p1u:${p1Used}|p2u:${p2Used}`;
}
```

---

### 2. Weighted Move Policy Database

**Purpose**: Store learned knowledge with temporal weighting

**Data Structure**:
```javascript
{
    "positionHash1": {
        "move_t4h9": {
            wins: 127,
            losses: 83,
            ties: 2,
            totalWeight: 185.3,    // Sum of discounted credits
            gamesPlayed: 212,
            winRate: 0.599,
            avgWeight: 0.874,      // Average discount applied
            lastUpdated: timestamp
        },
        "move_t2h5": { ... }
    }
}
```

**Operations**:
```javascript
class PolicyDatabase {
    recordOutcome(position, move, outcome, weight = 1.0) {
        if (!this.db[position]) {
            this.db[position] = {};
        }

        if (!this.db[position][move]) {
            this.db[position][move] = {
                wins: 0, losses: 0, ties: 0,
                totalWeight: 0, gamesPlayed: 0
            };
        }

        const stats = this.db[position][move];

        if (outcome === 'win') stats.wins += weight;
        else if (outcome === 'loss') stats.losses += weight;
        else stats.ties += weight;

        stats.totalWeight += weight;
        stats.gamesPlayed += 1;
        stats.winRate = stats.wins / stats.totalWeight;
        stats.avgWeight = stats.totalWeight / stats.gamesPlayed;
        stats.lastUpdated = Date.now();
    }

    getUCBScore(position, move, c = 1.41) {
        const stats = this.getStats(position)[move];
        if (!stats || stats.gamesPlayed === 0) {
            return Infinity;  // Unvisited move has highest priority
        }

        const totalGames = this.getTotalGames(position);
        const winRate = stats.wins / stats.totalWeight;
        const exploration = c * Math.sqrt(Math.log(totalGames) / stats.gamesPlayed);

        return winRate + exploration;
    }

    getBestMove(position) {
        const stats = this.getStats(position);
        let bestMove = null;
        let bestWinRate = -1;

        for (let [move, data] of Object.entries(stats)) {
            const winRate = data.wins / data.totalWeight;
            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestMove = move;
            }
        }

        return bestMove;
    }
}
```

---

### 3. Competitive Self-Play Engine

**Purpose**: Multiple strategies compete to find best approach

#### Heuristic Strategy Framework

```javascript
const heuristics = {
    'pure_ucb': {
        name: 'Pure UCB (Baseline)',
        evaluateMove: null,  // No bonus
        explorationConstant: 1.41
    },

    'center_preference': {
        name: 'Center Hex Preference',
        evaluateMove: (move, gameState) => {
            const centerHexes = [4, 9, 14];
            const movesPlayed = gameState.moveHistory.length;

            // Early game bonus for center hexes
            if (movesPlayed < 6 && centerHexes.includes(move.hexId)) {
                return 0.1;  // 10% bonus
            }
            return 0;
        },
        explorationConstant: 1.41
    },

    'high_value_early': {
        name: 'High Values Early',
        evaluateMove: (move, gameState) => {
            const movesPlayed = gameState.moveHistory.length;

            // Play tiles 7,8,9 in first 6 moves
            if (movesPlayed < 6 && move.tileValue >= 7) {
                return 0.15;
            }
            return 0;
        },
        explorationConstant: 1.41
    },

    'low_value_early': {
        name: 'Low Values Early',
        evaluateMove: (move, gameState) => {
            const movesPlayed = gameState.moveHistory.length;

            // Play tiles 1,2,3 in first 6 moves
            if (movesPlayed < 6 && move.tileValue <= 3) {
                return 0.15;
            }
            return 0;
        },
        explorationConstant: 1.41
    },

    'balanced_tiles': {
        name: 'Balanced Tile Usage',
        evaluateMove: (move, gameState) => {
            const movesPlayed = gameState.moveHistory.length;

            // Mid-values (4,5,6) early
            if (movesPlayed < 6 && move.tileValue >= 4 && move.tileValue <= 6) {
                return 0.12;
            }
            return 0;
        },
        explorationConstant: 1.41
    },

    'aggressive_exploration': {
        name: 'Aggressive Exploration',
        evaluateMove: null,
        explorationConstant: 2.0  // Higher exploration
    },

    'conservative_exploitation': {
        name: 'Conservative Exploitation',
        evaluateMove: null,
        explorationConstant: 0.7  // Lower exploration
    }
};
```

#### Tournament System

```javascript
class HeuristicTournament {
    constructor() {
        this.competitors = [];
        this.matchHistory = [];
        this.logger = new AILogger(LogLevel.INFO);
    }

    addCompetitor(name, heuristic, policy = null) {
        this.competitors.push({
            name: name,
            heuristic: heuristic,
            policy: policy || new PolicyDatabase(),
            elo: 1500,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            ties: 0
        });
    }

    async runTournament(gamesPerMatchup = 100) {
        this.logger.info(`Starting tournament: ${this.competitors.length} competitors`);
        const results = [];

        // Round-robin: everyone plays everyone
        for (let i = 0; i < this.competitors.length; i++) {
            for (let j = i + 1; j < this.competitors.length; j++) {
                const matchResult = await this.playMatchup(
                    this.competitors[i],
                    this.competitors[j],
                    gamesPerMatchup
                );

                results.push(matchResult);
                this.updateEloRatings(this.competitors[i], this.competitors[j], matchResult);

                this.logger.info(`${this.competitors[i].name} vs ${this.competitors[j].name}: ${matchResult.p1Wins}-${matchResult.p2Wins}-${matchResult.ties}`);
            }
        }

        return this.rankCompetitors();
    }

    async playMatchup(p1Competitor, p2Competitor, numGames) {
        let p1Wins = 0, p2Wins = 0, ties = 0;

        for (let i = 0; i < numGames; i++) {
            // Alternate starting player
            const startingPlayer = (i % 2) + 1;

            const gameResult = this.playGame(
                p1Competitor,
                p2Competitor,
                startingPlayer
            );

            // Validate game
            const validation = GameValidator.validateGameCompletion(gameResult);
            if (!validation.valid) {
                this.logger.error('Game validation failed', validation.errors);
                throw new Error('Game validation failed - stopping tournament');
            }

            // Record result
            if (gameResult.winner === 0) {
                ties++;
                p1Competitor.ties++;
                p2Competitor.ties++;
            } else if (gameResult.winner === 1) {
                p1Wins++;
                p1Competitor.wins++;
                p2Competitor.losses++;
            } else {
                p2Wins++;
                p2Competitor.wins++;
                p1Competitor.losses++;
            }

            p1Competitor.gamesPlayed++;
            p2Competitor.gamesPlayed++;
        }

        return {
            player1: p1Competitor.name,
            player2: p2Competitor.name,
            p1Wins, p2Wins, ties,
            winRateP1: p1Wins / numGames
        };
    }

    playGame(p1Competitor, p2Competitor, startingPlayer = 1) {
        const game = new Game();
        const history = [];
        let moveCount = 0;
        const MAX_MOVES = 18;

        while (!game.gameEnded && moveCount < MAX_MOVES) {
            const currentCompetitor = (game.currentPlayer === 1)
                ? p1Competitor
                : p2Competitor;

            const positionHash = hashPosition(game);
            const validMoves = getAllValidMoves(game);

            if (validMoves.length === 0) {
                this.logger.error('No valid moves but game not ended', { moveCount, gameEnded: game.gameEnded });
                break;
            }

            // Select move using UCB + heuristic
            const move = this.selectMoveWithHeuristic(
                validMoves,
                currentCompetitor.policy,
                currentCompetitor.heuristic,
                positionHash,
                game
            );

            history.push({
                position: positionHash,
                move: moveToString(move),
                player: game.currentPlayer
            });

            game.placeTile(move.hexId, move.tileValue);
            moveCount++;
        }

        const winner = determineWinner(game);
        const scores = game.calculateScores();

        // Both players learn from this game
        this.learnFromGame(p1Competitor.policy, history, winner, 1);
        this.learnFromGame(p2Competitor.policy, history, winner, 2);

        return {
            history,
            winner,
            scores,
            moveCount,
            finalBoard: game.board.board
        };
    }

    selectMoveWithHeuristic(validMoves, policy, heuristic, positionHash, gameState) {
        let bestScore = -Infinity;
        let bestMove = null;

        for (let move of validMoves) {
            const moveStr = moveToString(move);

            // Get UCB score from policy
            const ucbScore = policy.getUCBScore(positionHash, moveStr, heuristic.explorationConstant);

            // Add heuristic bonus if available
            const heuristicBonus = heuristic.evaluateMove
                ? heuristic.evaluateMove(move, gameState)
                : 0;

            const totalScore = ucbScore + heuristicBonus;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMove = move;
            }
        }

        return bestMove;
    }

    learnFromGame(policy, history, winner, playerNum) {
        const gamma = 0.95;  // Discount factor
        const n = history.length;

        for (let i = 0; i < n; i++) {
            const step = history[i];

            // Only update this player's moves
            if (step.player !== playerNum) continue;

            // Calculate temporal discount weight
            const stepsFromEnd = n - i;
            const weight = Math.pow(gamma, stepsFromEnd - 1);

            // Determine outcome for this player
            let outcome;
            if (winner === 0) {
                outcome = 'tie';
            } else if (winner === playerNum) {
                outcome = 'win';
            } else {
                outcome = 'loss';
            }

            policy.recordOutcome(step.position, step.move, outcome, weight);
        }
    }

    updateEloRatings(p1, p2, matchResult) {
        const K = 32;  // Elo K-factor

        const expectedP1 = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400));
        const expectedP2 = 1 - expectedP1;

        const totalGames = matchResult.p1Wins + matchResult.p2Wins + matchResult.ties;
        const actualP1 = (matchResult.p1Wins + 0.5 * matchResult.ties) / totalGames;
        const actualP2 = (matchResult.p2Wins + 0.5 * matchResult.ties) / totalGames;

        p1.elo += K * (actualP1 - expectedP1);
        p2.elo += K * (actualP2 - expectedP2);
    }

    rankCompetitors() {
        return this.competitors
            .sort((a, b) => b.elo - a.elo)
            .map((c, idx) => ({
                rank: idx + 1,
                name: c.name,
                elo: Math.round(c.elo),
                record: `${c.wins}-${c.losses}-${c.ties}`,
                winRate: (c.wins / (c.wins + c.losses + c.ties) * 100).toFixed(1) + '%'
            }));
    }
}
```

---

### 4. Validation & Error Detection

**Purpose**: Catch bugs early, pause on anomalies

#### Game Validation

```javascript
class GameValidator {
    static validateGameCompletion(gameResult) {
        const errors = [];

        // Check 1: Exactly 18 moves
        if (gameResult.moveCount !== 18) {
            errors.push({
                type: 'INCOMPLETE_GAME',
                message: `Game ended with ${gameResult.moveCount} moves (expected 18)`,
                severity: 'CRITICAL'
            });
        }

        // Check 2: Winner determined
        if (gameResult.winner === null || gameResult.winner === undefined) {
            errors.push({
                type: 'NO_WINNER',
                message: 'Game ended without determining winner',
                severity: 'CRITICAL'
            });
        }

        // Check 3: History matches move count
        if (gameResult.history.length !== gameResult.moveCount) {
            errors.push({
                type: 'HISTORY_MISMATCH',
                message: `History length ${gameResult.history.length} ≠ move count ${gameResult.moveCount}`,
                severity: 'ERROR'
            });
        }

        // Check 4: Board is full (18 tiles + center = 19)
        const filledHexes = gameResult.finalBoard.filter(hex => hex.value !== null).length;
        if (filledHexes !== 19) {
            errors.push({
                type: 'BOARD_NOT_FULL',
                message: `Only ${filledHexes} hexes filled (expected 19)`,
                severity: 'ERROR'
            });
        }

        // Check 5: Each player made 9 moves
        const p1Moves = gameResult.history.filter(m => m.player === 1).length;
        const p2Moves = gameResult.history.filter(m => m.player === 2).length;

        if (p1Moves !== 9 || p2Moves !== 9) {
            errors.push({
                type: 'UNEVEN_MOVES',
                message: `P1: ${p1Moves} moves, P2: ${p2Moves} moves (expected 9 each)`,
                severity: 'ERROR'
            });
        }

        // Check 6: Scores calculated correctly
        const recalcScores = calculateScoresForBoard(gameResult.finalBoard);
        if (recalcScores.player1 !== gameResult.scores.player1 ||
            recalcScores.player2 !== gameResult.scores.player2) {
            errors.push({
                type: 'SCORE_MISMATCH',
                message: 'Scores do not match recalculation',
                reported: gameResult.scores,
                actual: recalcScores,
                severity: 'ERROR'
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    static validatePolicyUpdate(beforeSize, afterSize, gameHistory) {
        const errors = [];

        // Policy should not shrink
        if (afterSize < beforeSize) {
            errors.push({
                type: 'POLICY_SHRINKING',
                message: `Policy lost positions: ${beforeSize} → ${afterSize}`,
                severity: 'CRITICAL'
            });
        }

        // Policy should grow by at most the number of unique positions in game
        const uniquePositions = new Set(gameHistory.map(h => h.position)).size;
        const growth = afterSize - beforeSize;

        if (growth > uniquePositions) {
            errors.push({
                type: 'EXCESSIVE_GROWTH',
                message: `Policy grew by ${growth} but only ${uniquePositions} unique positions`,
                severity: 'WARN'
            });
        }

        return {
            valid: errors.filter(e => e.severity === 'CRITICAL').length === 0,
            errors: errors
        };
    }
}
```

#### Multi-Level Logging

```javascript
const LogLevel = {
    SILENT: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5
};

class AILogger {
    constructor(level = LogLevel.INFO) {
        this.level = level;
        this.logs = [];
        this.errorCount = 0;
        this.warnCount = 0;
    }

    error(message, data = null) {
        this.errorCount++;
        this._log('❌ ERROR', message, data, LogLevel.ERROR);
    }

    warn(message, data = null) {
        this.warnCount++;
        this._log('⚠️  WARN', message, data, LogLevel.WARN);
    }

    info(message, data = null) {
        this._log('ℹ️  INFO', message, data, LogLevel.INFO);
    }

    debug(message, data = null) {
        this._log('🔍 DEBUG', message, data, LogLevel.DEBUG);
    }

    trace(message, data = null) {
        this._log('📝 TRACE', message, data, LogLevel.TRACE);
    }

    _log(prefix, message, data, level) {
        if (level <= this.level) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: prefix,
                message: message,
                data: data
            };

            console.log(`[${entry.timestamp}] ${prefix}: ${message}`, data || '');
            this.logs.push(entry);
        }
    }

    exportLogs() {
        const blob = new Blob([JSON.stringify(this.logs, null, 2)],
                              { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hexuki_training_logs_${Date.now()}.json`;
        a.click();
    }
}
```

---

### 5. Training Dashboard

**Purpose**: Real-time monitoring and convergence detection

```javascript
class TrainingDashboard {
    constructor() {
        this.startTime = Date.now();
        this.gamesPlayed = 0;
        this.checkpoints = [];
        this.errors = [];
    }

    update(gameResult, policyStats) {
        this.gamesPlayed++;

        // Update every 100 games
        if (this.gamesPlayed % 100 === 0) {
            this.createCheckpoint(policyStats);
            this.render();
        }
    }

    createCheckpoint(stats) {
        this.checkpoints.push({
            games: this.gamesPlayed,
            timestamp: Date.now(),
            vsRandomWinRate: stats.vsRandomWinRate,
            positionsExplored: stats.positionsExplored,
            explorationRate: stats.explorationRate
        });
    }

    render() {
        const elapsed = Date.now() - this.startTime;
        const gamesPerSec = this.gamesPlayed / (elapsed / 1000);

        const latest = this.checkpoints[this.checkpoints.length - 1];
        const previous = this.checkpoints[this.checkpoints.length - 2];

        // Check convergence
        let convergenceStatus = 'training';
        if (previous && latest) {
            const deltaWinRate = Math.abs(latest.vsRandomWinRate - previous.vsRandomWinRate);
            if (deltaWinRate < 0.01 && latest.vsRandomWinRate > 0.85) {
                convergenceStatus = 'converged';
            }
        }

        const dashboard = `
╔═══════════════════════════════════════════════════════════╗
║            HEXUKI AI TRAINING DASHBOARD V2                ║
╠═══════════════════════════════════════════════════════════╣
║ Games:          ${this.gamesPlayed.toLocaleString().padEnd(20)}                  ║
║ Speed:          ${gamesPerSec.toFixed(1).padEnd(20)} games/sec        ║
║ Elapsed:        ${this.formatTime(elapsed).padEnd(20)}                  ║
║                                                           ║
║ Win vs Random:  ${(latest.vsRandomWinRate * 100).toFixed(1)}%                                    ║
║ Status:         ${convergenceStatus.toUpperCase().padEnd(20)}                  ║
║ Positions:      ${latest.positionsExplored.toLocaleString().padEnd(20)}                  ║
║                                                           ║
║ Errors:         ${this.errors.length} ❌                                     ║
╚═══════════════════════════════════════════════════════════╝
        `;

        console.log(dashboard);
    }

    formatTime(ms) {
        const sec = Math.floor(ms / 1000);
        const min = Math.floor(sec / 60);
        const hours = Math.floor(min / 60);

        if (hours > 0) return `${hours}h ${min % 60}m`;
        if (min > 0) return `${min}m ${sec % 60}s`;
        return `${sec}s`;
    }
}
```

---

## Success Metrics

### Primary Metrics (Must Achieve):

1. **Win Rate vs Random**: 90%+ after 100k games
2. **Convergence**: Win rate changes <1% per 10k games
3. **Self-Play Balance**: 45%-55% when AI plays itself
4. **Game Completion**: 100% of games reach 18 moves

### Secondary Metrics (Quality Indicators):

5. **Opening Convergence**: Top 3 moves account for 60%+ of plays
6. **Policy Confidence**: Average best-move advantage >15%
7. **Strategy Diversity**: 3+ viable opening strategies
8. **Exploration Rate**: Decreases from 80% → 10-15%

### Red Flags (Auto-Pause Training):

- ❌ Win rate < 70% after 50k games
- ❌ Win rate decreasing by 10%+
- ❌ Average game length ≠ 18
- ❌ Any game validation errors
- ❌ Policy shrinking

---

## Training Pipeline

### Phase 1: Sanity Check (1k games, ~10 seconds)
```javascript
// Verify game logic works correctly
- Run 1000 random games
- Validate all complete with 18 moves
- Confirm scores calculate correctly
- Test save/load functions
```

### Phase 2: Bootstrap Exploration (5k games, ~30 seconds)
```javascript
// Pure random play to explore state space
- Random move selection
- Build initial policy database
- Target: 2000+ positions explored
```

### Phase 3: Guided Learning (20k games, ~2-3 minutes)
```javascript
// Epsilon-greedy: 30% random, 70% best-known
- Start exploiting learned patterns
- Still exploring alternatives
- Target: 70% win rate vs random
```

### Phase 4: Competitive Training (75k games, ~7-10 minutes)
```javascript
// Tournament between heuristic strategies
- 7 different heuristics compete
- UCB-guided with strategy bonuses
- Elo rankings track progress
- Target: 90% win rate vs random
```

### Phase 5: Refinement (100k+ games, ongoing)
```javascript
// Continuous improvement
- User can extend training indefinitely
- Auto-save every 5k games
- Monitor convergence
- Test new heuristics against champion
```

---

## Manual Testing & Debugging Tools

### Console API

```javascript
// Global debugging interface
window.ai = {
    // Watch AI play with commentary
    watch: (numGames) => inspector.watchAIPlay(numGames, true),

    // Inspect specific position
    inspect: (gameState) => inspector.inspectPosition(gameState),

    // Run sanity tests
    test: () => SanityTests.runAllTests(policy),

    // Get current stats
    stats: () => trainer.getStats(),

    // Export policy and logs
    export: () => {
        policy.save();
        logger.exportLogs();
    },

    // Control training
    pause: () => trainer.pause(),
    resume: () => trainer.resume(),

    // Adjust logging
    setLogLevel: (level) => logger.level = level,

    // Find uncertain positions
    findUncertain: () => inspector.findUncertainPositions()
};
```

### AI Inspector

```javascript
class AIInspector {
    // Analyze what AI thinks about a position
    inspectPosition(gameState) {
        // Shows all valid moves with win rates
        // Highlights unexplored moves
        // Shows move rankings
    }

    // Watch AI play with move-by-move commentary
    watchAIPlay(numGames, commentary = true) {
        // Shows each move decision
        // Displays win rate and experience
        // Reports final scores
    }

    // Find positions where AI is uncertain
    findUncertainPositions(threshold = 0.1) {
        // Lists positions where top moves are very close
        // Suggests areas needing more training
    }
}
```

---

## Implementation Checklist

### Core Infrastructure
- [ ] Enhanced position hashing (include available tiles)
- [ ] Weighted policy database
- [ ] Game simulator with validation
- [ ] Save/load with versioning
- [ ] Multi-level logger

### Self-Play Engine
- [ ] UCB move selection
- [ ] Heuristic evaluation framework
- [ ] Tournament system with Elo
- [ ] Temporal difference learning
- [ ] Game validation after each game

### Debugging & Validation
- [ ] GameValidator class
- [ ] AILogger with export
- [ ] TrainingDashboard
- [ ] AIInspector tools
- [ ] SanityTests suite

### Training Pipeline
- [ ] Phase 1: Sanity check
- [ ] Phase 2: Random bootstrap
- [ ] Phase 3: Epsilon-greedy
- [ ] Phase 4: Competitive tournament
- [ ] Phase 5: Continuous refinement

### UI Integration
- [ ] Training dashboard HTML
- [ ] Real-time metrics display
- [ ] Error/warning alerts
- [ ] Manual controls (pause/resume)
- [ ] Export buttons

---

## File Structure

```
hextest/
├── hexuki_game.html              # Main game (with anti-symmetry rule)
├── AI_DESIGN_V2.md               # This file
├── hexuki_ai_trainer.js          # Training system implementation
│   ├── PolicyDatabase class
│   ├── HeuristicTournament class
│   ├── GameValidator class
│   ├── AILogger class
│   └── TrainingDashboard class
├── hexuki_ai_inspector.js        # Debugging tools
│   ├── AIInspector class
│   ├── SanityTests class
│   └── Console API (window.ai)
├── hexuki_ai_trainer.html        # Training UI
└── data/
    ├── policy_v2_gen0.json       # Initial trained policy
    ├── policy_v2_gen1.json       # After 1st evolution
    ├── tournament_results.json   # Heuristic rankings
    └── training_logs.json        # Exported logs
```

---

## Next Steps

1. ✅ Review this V2 design
2. ⬜ Implement core infrastructure
3. ⬜ Build self-play engine with validation
4. ⬜ Create debugging tools
5. ⬜ Run sanity tests (1k games)
6. ⬜ Start training pipeline
7. ⬜ Analyze results and iterate

---

## Key Differences from V1

| Aspect | V1 | V2 |
|--------|----|----|
| Position Hashing | Board + used positions | Board + used + **available tiles** |
| Credit Assignment | Equal credit all moves | **Temporal discount** (later = more) |
| Training Approach | Single UCB agent | **Competitive heuristics** tournament |
| Validation | None | **Every game validated** |
| Debugging | Minimal | **Comprehensive tools** |
| Error Handling | Hope for best | **Auto-pause on errors** |
| Logging | Basic console.log | **Multi-level system** |
| Testing | Manual | **Automated sanity tests** |
| Metrics | Basic win rate | **10+ tracked metrics** |
| Inspectability | None | **AI Inspector + console API** |

---

**Ready to implement when you give the signal!**
