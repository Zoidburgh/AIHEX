/**
 * Hexuki AI Self-Play Training System V2
 * Phase 1: Core Infrastructure
 */

// ============================================================================
// LOGGER - Multi-level logging system
// ============================================================================

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
        this.startTime = Date.now();
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
            const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
            const entry = {
                timestamp: new Date().toISOString(),
                elapsed: elapsed + 's',
                level: prefix,
                message: message,
                data: data
            };

            console.log(`[${elapsed}s] ${prefix}: ${message}`, data || '');
            this.logs.push(entry);
        }
    }

    getSummary() {
        return {
            totalLogs: this.logs.length,
            errors: this.errorCount,
            warnings: this.warnCount,
            elapsed: ((Date.now() - this.startTime) / 1000).toFixed(2) + 's'
        };
    }

    exportLogs() {
        const blob = new Blob([JSON.stringify(this.logs, null, 2)],
                              { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hexuki_training_logs_${Date.now()}.json`;
        a.click();
        this.info('Logs exported successfully');
    }
}

// ============================================================================
// POSITION HASHING - Create unique identifier for game states
// ============================================================================

class PositionHasher {
    /**
     * Hash a game state into a unique string
     * Includes: board state + current player + available tiles + used positions
     */
    static hash(game) {
        // Get board (handle both Game and HexukiGameEngine)
        const board = game.board.board || game.board;

        // Board state: "null,null,5p1,3p2,..."
        const boardStr = board.map(hex => {
            if (hex.value === null) return 'null';
            const owner = hex.owner === 'player1' ? '1' : '2';
            return `${hex.value}p${owner}`;
        }).join(',');

        // Available tiles (sorted for consistency)
        const p1Available = [...game.player1Tiles].sort((a, b) => a - b).join('');
        const p2Available = [...game.player2Tiles].sort((a, b) => a - b).join('');

        // Used positions (sorted for consistency) - only if available
        const p1Used = game.player1UsedPositions
            ? Array.from(game.player1UsedPositions).sort((a, b) => a - b).join(',')
            : '';
        const p2Used = game.player2UsedPositions
            ? Array.from(game.player2UsedPositions).sort((a, b) => a - b).join(',')
            : '';

        return `${game.currentPlayer}|${boardStr}|p1a:${p1Available}|p2a:${p2Available}|p1u:${p1Used}|p2u:${p2Used}`;
    }

    /**
     * Create a move identifier string
     */
    static moveToString(tileValue, hexId) {
        return `t${tileValue}h${hexId}`;
    }

    /**
     * Parse a move string back to components
     */
    static parseMove(moveStr) {
        const match = moveStr.match(/t(\d+)h(\d+)/);
        if (!match) return null;
        return {
            tileValue: parseInt(match[1]),
            hexId: parseInt(match[2])
        };
    }
}

// ============================================================================
// POLICY DATABASE - Store learned knowledge with temporal weighting
// ============================================================================

class PolicyDatabase {
    constructor() {
        this.db = {};
        this.version = '2.0';
        this.created = new Date().toISOString();
        this.totalGamesPlayed = 0;
    }

    /**
     * Record the outcome of a move with temporal weighting
     * @param {string} positionHash - The position hash
     * @param {string} moveStr - The move string (e.g., "t5h9")
     * @param {string} outcome - 'win', 'loss', or 'tie'
     * @param {number} weight - Temporal discount weight (0-1)
     */
    recordOutcome(positionHash, moveStr, outcome, weight = 1.0) {
        // Initialize position if new
        if (!this.db[positionHash]) {
            this.db[positionHash] = {};
        }

        // Initialize move stats if new
        if (!this.db[positionHash][moveStr]) {
            this.db[positionHash][moveStr] = {
                wins: 0,
                losses: 0,
                ties: 0,
                totalWeight: 0,
                gamesPlayed: 0
            };
        }

        const stats = this.db[positionHash][moveStr];

        // Update stats with weighted outcome
        if (outcome === 'win') {
            stats.wins += weight;
        } else if (outcome === 'loss') {
            stats.losses += weight;
        } else if (outcome === 'tie') {
            stats.ties += weight;
        }

        stats.totalWeight += weight;
        stats.gamesPlayed += 1;
        stats.lastUpdated = Date.now();
    }

    /**
     * Get statistics for all moves from a position
     */
    getStats(positionHash) {
        return this.db[positionHash] || {};
    }

    /**
     * Get UCB score for a move (exploration vs exploitation)
     * Enhanced with Bayesian priors for better sparse data handling
     */
    getUCBScore(positionHash, moveStr, explorationConstant = 1.41) {
        const stats = this.getStats(positionHash);
        const moveStats = stats[moveStr];

        // Unvisited move has infinite score (will be tried first)
        if (!moveStats || moveStats.gamesPlayed === 0) {
            return Infinity;
        }

        // Bayesian prior: assume neutral 50% win rate with small weight
        // This prevents over-trusting moves seen only 1-2 times
        const priorWins = 1;
        const priorWeight = 2;

        // Combine actual stats with prior
        const adjustedWins = moveStats.wins + priorWins;
        const adjustedWeight = moveStats.totalWeight + priorWeight;

        // Calculate total games at this position
        const totalGames = Object.values(stats).reduce((sum, s) => sum + s.gamesPlayed, 0);

        // Win rate with Bayesian smoothing (exploitation)
        const winRate = adjustedWins / adjustedWeight;

        // Exploration bonus (UCB1 formula)
        // Add +1 to prevent log(0) and division by zero
        const exploration = explorationConstant * Math.sqrt(
            Math.log(totalGames + 1) / (moveStats.gamesPlayed + 1)
        );

        return winRate + exploration;
    }

    /**
     * Get the best move from a position (highest win rate)
     */
    getBestMove(positionHash) {
        const stats = this.getStats(positionHash);
        const moves = Object.entries(stats);

        if (moves.length === 0) return null;

        let bestMove = null;
        let bestWinRate = -1;

        for (let [moveStr, data] of moves) {
            if (data.totalWeight === 0) continue;
            const winRate = data.wins / data.totalWeight;

            if (winRate > bestWinRate) {
                bestWinRate = winRate;
                bestMove = moveStr;
            }
        }

        return bestMove;
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        const positionsExplored = Object.keys(this.db).length;
        let totalMoves = 0;

        for (let position of Object.values(this.db)) {
            totalMoves += Object.keys(position).length;
        }

        return {
            version: this.version,
            positionsExplored: positionsExplored,
            uniqueMovesExplored: totalMoves,
            totalGamesPlayed: this.totalGamesPlayed
        };
    }

    /**
     * Save policy to JSON
     */
    toJSON() {
        return {
            version: this.version,
            created: this.created,
            lastUpdated: new Date().toISOString(),
            totalGamesPlayed: this.totalGamesPlayed,
            database: this.db
        };
    }

    /**
     * Load policy from JSON
     */
    static fromJSON(json) {
        const policy = new PolicyDatabase();
        policy.version = json.version || '2.0';
        policy.created = json.created;
        policy.totalGamesPlayed = json.totalGamesPlayed || 0;
        policy.db = json.database || {};
        return policy;
    }

    /**
     * Save policy to file
     */
    save(filename = null) {
        if (!filename) {
            filename = `hexuki_policy_v2_${Date.now()}.json`;
        }

        const json = JSON.stringify(this.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    }
}

// ============================================================================
// GAME VALIDATOR - Validate game completion and correctness
// ============================================================================

class GameValidator {
    /**
     * Validate that a game completed correctly
     */
    static validateGameCompletion(gameResult, logger) {
        const errors = [];

        // Check 1: Game should have at least 16 moves (early endings due to chain constraints are valid)
        if (gameResult.moveCount < 16) {
            errors.push({
                type: 'TOO_FEW_MOVES',
                message: `Game ended with only ${gameResult.moveCount} moves (minimum 16)`,
                severity: 'CRITICAL'
            });
        } else if (gameResult.moveCount !== 18) {
            // Games ending at 16-17 moves are incomplete but valid (due to chain constraints)
            errors.push({
                type: 'INCOMPLETE_GAME',
                message: `Game ended with ${gameResult.moveCount} moves (expected 18, likely chain constraint)`,
                severity: 'INFO'
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

        // Check 3: History length matches move count
        if (gameResult.history.length !== gameResult.moveCount) {
            errors.push({
                type: 'HISTORY_MISMATCH',
                message: `History length ${gameResult.history.length} ≠ move count ${gameResult.moveCount}`,
                severity: 'ERROR'
            });
        }

        // Check 4: Move distribution is reasonable
        const p1Moves = gameResult.history.filter(m => m.player === 1).length;
        const p2Moves = gameResult.history.filter(m => m.player === 2).length;
        const moveDiff = Math.abs(p1Moves - p2Moves);

        if (moveDiff > 1) {
            errors.push({
                type: 'UNEVEN_MOVES',
                message: `P1: ${p1Moves} moves, P2: ${p2Moves} moves (difference too large)`,
                severity: 'ERROR'
            });
        }

        // Log errors if any (but not INFO level messages)
        for (let error of errors) {
            if (error.severity === 'CRITICAL') {
                logger.error(error.message, error);
            } else if (error.severity === 'ERROR') {
                logger.warn(error.message, error);
            }
            // Don't log INFO severity - those are expected incomplete games
        }

        return {
            valid: errors.filter(e => e.severity !== 'INFO').length === 0,
            errors: errors,
            incomplete: errors.some(e => e.type === 'INCOMPLETE_GAME')
        };
    }

    /**
     * Validate policy update
     */
    static validatePolicyUpdate(beforeSize, afterSize, gameHistory, logger) {
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
                message: `Policy grew by ${growth} but only ${uniquePositions} unique positions in game`,
                severity: 'WARN'
            });
        }

        // Log errors
        for (let error of errors) {
            if (error.severity === 'CRITICAL') {
                logger.error(error.message, error);
            } else {
                logger.warn(error.message, error);
            }
        }

        return {
            valid: errors.filter(e => e.severity === 'CRITICAL').length === 0,
            errors: errors
        };
    }
}

// ============================================================================
// LEARNING VALIDATOR - Ensure real learning happens
// ============================================================================

class LearningValidator {
    // Minimum thresholds for "real learning"
    static MINIMUM_VISITS_PER_MOVE = 5;
    static MINIMUM_STABILITY = 0.5;
    static MINIMUM_CONFIDENCE = 0.2;

    /**
     * Validate that learning is happening between generations
     */
    static validateGeneration(currentPolicy, previousPolicy) {
        const issues = [];
        const metrics = {};

        // Metric 1: Position Coverage Growth
        const prevPositions = Object.keys(previousPolicy.db).length;
        const currPositions = Object.keys(currentPolicy.db).length;
        metrics.prevPositions = prevPositions;
        metrics.currPositions = currPositions;
        metrics.coverageGrowth = prevPositions > 0 ? (currPositions - prevPositions) / prevPositions : 1.0;

        // Metric 2: Policy Stability (do best moves stay consistent?)
        let stablePositions = 0;
        let totalSharedPositions = 0;

        for (let pos in previousPolicy.db) {
            if (currentPolicy.db[pos]) {
                totalSharedPositions++;
                const prevBest = previousPolicy.getBestMove(pos);
                const currBest = currentPolicy.getBestMove(pos);
                if (prevBest === currBest) {
                    stablePositions++;
                }
            }
        }

        metrics.stability = totalSharedPositions > 0 ? stablePositions / totalSharedPositions : 0;
        metrics.stablePositions = stablePositions;
        metrics.totalSharedPositions = totalSharedPositions;

        // Metric 3: Win Rate Confidence (how many moves have clear win/loss signals?)
        let highConfidenceMoves = 0;
        let totalMoves = 0;
        let underExploredMoves = 0;

        for (let pos in currentPolicy.db) {
            for (let move in currentPolicy.db[pos]) {
                const stats = currentPolicy.db[pos][move];
                totalMoves++;

                // Track under-explored moves
                if (stats.gamesPlayed < this.MINIMUM_VISITS_PER_MOVE) {
                    underExploredMoves++;
                }

                // High confidence = played 10+ times with clear win rate
                if (stats.gamesPlayed >= 10) {
                    const winRate = stats.wins / stats.totalWeight;
                    if (winRate > 0.6 || winRate < 0.4) {
                        highConfidenceMoves++;
                    }
                }
            }
        }

        metrics.confidenceRatio = totalMoves > 0 ? highConfidenceMoves / totalMoves : 0;
        metrics.highConfidenceMoves = highConfidenceMoves;
        metrics.totalMoves = totalMoves;
        metrics.underExploredMoves = underExploredMoves;
        metrics.underExploredRatio = totalMoves > 0 ? underExploredMoves / totalMoves : 0;

        // Check for issues
        if (metrics.coverageGrowth < 0) {
            issues.push('Position coverage decreased (policy may be forgetting)');
        }

        if (metrics.stability < this.MINIMUM_STABILITY && totalSharedPositions > 100) {
            issues.push(`Policy unstable (${(metrics.stability * 100).toFixed(1)}% stability, expected >${(this.MINIMUM_STABILITY * 100).toFixed(0)}%)`);
        }

        if (metrics.confidenceRatio < this.MINIMUM_CONFIDENCE && totalMoves > 1000) {
            issues.push(`Low confidence moves (${(metrics.confidenceRatio * 100).toFixed(1)}%, expected >${(this.MINIMUM_CONFIDENCE * 100).toFixed(0)}%)`);
        }

        if (metrics.underExploredRatio > 0.5) {
            issues.push(`Too many under-explored moves (${(metrics.underExploredRatio * 100).toFixed(1)}% < ${this.MINIMUM_VISITS_PER_MOVE} visits)`);
        }

        return {
            isLearning: issues.length === 0,
            issues: issues,
            metrics: metrics
        };
    }

    /**
     * Get adaptive exploration rate based on learning metrics
     */
    static getAdaptiveExplorationRate(generation, metrics) {
        // Base schedule: 0.3 → 0.2 → 0.1 → 0.05 → 0.02
        const baseRate = Math.max(0.02, 0.3 * Math.pow(0.7, generation));

        // If we don't have metrics yet, use base rate
        if (!metrics) return baseRate;

        // Adjust based on learning progress
        if (metrics.coverageGrowth < 0.05) {
            // Stagnating → increase exploration to find new positions
            return Math.min(1.0, baseRate * 1.5);
        }

        if (metrics.stability < 0.4 && metrics.totalSharedPositions > 100) {
            // Unstable → decrease exploration to collect more data
            return baseRate * 0.7;
        }

        if (metrics.underExploredRatio > 0.5) {
            // Too many unexplored moves → keep exploration high
            return Math.max(baseRate, 0.2);
        }

        return baseRate;
    }

    /**
     * Calculate diversity metrics to detect stagnation
     */
    static calculateDiversityMetrics(currentPolicy, generationHistory) {
        const metrics = {};

        // If no history, can't calculate diversity trends
        if (generationHistory.length < 2) {
            return {
                positionDiversityTrend: 1.0,
                moveDiversityScore: 1.0,
                isStagnating: false
            };
        }

        // Position diversity trend (last 3 generations)
        const recent = generationHistory.slice(-3);
        const positionGrowths = recent.map(g => g.learningMetrics.coverageGrowth || 0);
        const avgGrowth = positionGrowths.reduce((a, b) => a + b, 0) / positionGrowths.length;
        metrics.positionDiversityTrend = avgGrowth;

        // Move variety score (entropy-like measure)
        let moveVariety = 0;
        let totalPositions = 0;
        for (let pos in currentPolicy.db) {
            const moves = Object.keys(currentPolicy.db[pos]);
            const movesPerPosition = moves.length;
            moveVariety += movesPerPosition;
            totalPositions++;
        }
        metrics.moveDiversityScore = totalPositions > 0 ? moveVariety / totalPositions : 0;

        // Detect stagnation: low growth + low diversity
        metrics.isStagnating = avgGrowth < 0.02 && metrics.moveDiversityScore < 5;

        return metrics;
    }

    /**
     * Recommend training intervention based on metrics
     */
    static recommendIntervention(diversityMetrics, learningMetrics) {
        const recommendations = [];

        if (diversityMetrics.isStagnating) {
            recommendations.push({
                type: 'STAGNATION',
                action: 'INCREASE_OPPONENT_DIVERSITY',
                reason: 'Position growth stalled, try different opponents'
            });
        }

        if (learningMetrics.coverageGrowth < 0.01) {
            recommendations.push({
                type: 'NO_NEW_POSITIONS',
                action: 'INCREASE_EXPLORATION',
                reason: 'Not discovering new positions, increase exploration rate'
            });
        }

        if (learningMetrics.stability > 0.9 && learningMetrics.coverageGrowth < 0.05) {
            recommendations.push({
                type: 'CONVERGED',
                action: 'CHANGE_OPPONENT',
                reason: 'Policy converged on self-play, needs new challenges'
            });
        }

        return recommendations;
    }
}

// ============================================================================
// GAME SIMULATOR - Play games with the existing Hexuki game logic
// ============================================================================

class GameSimulator {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Get all valid moves for current game state
     * Uses the existing game logic to check validity
     */
    getAllValidMoves(game) {
        const moves = [];
        const currentPlayer = game.currentPlayer;
        const availableTiles = currentPlayer === 1 ? game.player1Tiles : game.player2Tiles;

        this.logger.trace(`Getting valid moves for Player ${currentPlayer}`, {
            availableTiles: availableTiles
        });

        // Try each available tile on each empty hex
        const board = game.board.board || game.board;  // Handle both Game and HexukiGameEngine

        for (let hexId = 0; hexId < 19; hexId++) {
            // Skip occupied hexes
            if (board[hexId].value !== null) {
                continue;
            }

            // Try each available tile
            for (let tileValue of availableTiles) {
                // Check if move is legal using game's isMoveLegal
                if (game.isMoveLegal(hexId)) {
                    moves.push({
                        hexId: hexId,
                        tileValue: tileValue
                    });
                }
            }
        }

        this.logger.trace(`Found ${moves.length} valid moves`);
        return moves;
    }

    /**
     * Play a random game to completion
     * Returns game result with history and winner
     */
    playRandomGame() {
        this.logger.debug('Starting random game');

        // Create new game instance (using V2 headless engine)
        const game = new HexukiGameEngineV2();
        const history = [];
        let moveCount = 0;
        const MAX_MOVES = 18;

        while (!game.gameEnded && moveCount < MAX_MOVES) {
            const validMoves = this.getAllValidMoves(game);

            if (validMoves.length === 0) {
                // No valid moves - debug why
                const currentPlayerChains = game.calculateChainLengths(game.currentPlayer);
                currentPlayerChains.sort((a, b) => b - a);
                const emptyHexes = game.board.map((h, i) => h.value === null ? i : null).filter(x => x !== null);

                // For each empty hex, check why it's not valid
                const debugInfo = emptyHexes.map(hexId => {
                    const adjacent = game.getAdjacentHexes(hexId);
                    const adjacentOccupied = adjacent.filter(adjId => game.board[adjId].value !== null);
                    const hasAdjacent = game.hasAdjacentOccupied(hexId);

                    // Get chain lengths before placement
                    const chainsBefore = game.calculateChainLengths(game.currentPlayer);
                    chainsBefore.sort((a, b) => b - a);

                    // Simulate placement
                    const originalOwner = game.board[hexId].owner;
                    game.board[hexId].owner = `player${game.currentPlayer}`;

                    // Get chain lengths after placement
                    const chainsAfter = game.calculateChainLengths(game.currentPlayer);
                    chainsAfter.sort((a, b) => b - a);

                    // Restore
                    game.board[hexId].owner = originalOwner;

                    const chainOk = hasAdjacent ? (chainsAfter[0] - chainsAfter[1]) <= 1 : false;

                    return {
                        hex: hexId,
                        adjacent: adjacent,
                        adjacentOccupied: adjacentOccupied,
                        hasAdjacent: hasAdjacent,
                        chainsBefore: chainsBefore,
                        chainsAfter: chainsAfter,
                        longestAfter: chainsAfter[0],
                        secondLongestAfter: chainsAfter[1],
                        differenceAfter: chainsAfter[0] - chainsAfter[1],
                        chainOk: chainOk
                    };
                });

                // Get full board state
                const boardState = game.board.map((hex, idx) => ({
                    id: idx,
                    value: hex.value,
                    owner: hex.owner
                }));

                // Get which hexes each player owns
                const p1Hexes = boardState.filter(h => h.owner === 'player1').map(h => h.id);
                const p2Hexes = boardState.filter(h => h.owner === 'player2').map(h => h.id);

                this.logger.error('DEADLOCK DETECTED', {
                    moveCount: moveCount,
                    currentPlayer: game.currentPlayer,
                    chainLengths: currentPlayerChains,
                    longest: currentPlayerChains[0],
                    secondLongest: currentPlayerChains[1],
                    availableTiles: game.currentPlayer === 1 ? game.player1Tiles : game.player2Tiles,
                    emptyHexes: emptyHexes,
                    p1Hexes: p1Hexes,
                    p2Hexes: p2Hexes,
                    boardState: boardState,
                    debugInfo: debugInfo
                });
                break;
            }

            // Select random move
            const move = validMoves[Math.floor(Math.random() * validMoves.length)];

            // Record move in history
            const positionHash = PositionHasher.hash(game);
            const moveStr = PositionHasher.moveToString(move.tileValue, move.hexId);

            history.push({
                position: positionHash,
                move: moveStr,
                player: game.currentPlayer,
                hexId: move.hexId,
                tileValue: move.tileValue
            });

            this.logger.trace(`Move ${moveCount + 1}: Player ${game.currentPlayer} plays ${moveStr}`);

            // Make the move (this will update game state and switch players)
            game.makeMove(move.hexId, move.tileValue);

            moveCount++;
        }

        // Determine winner
        const scores = game.calculateScores();
        let winner;
        if (scores.player1 > scores.player2) {
            winner = 1;
        } else if (scores.player2 > scores.player1) {
            winner = 2;
        } else {
            winner = 0; // Tie
        }

        this.logger.debug(`Game complete: Winner = Player ${winner}`, {
            scores: scores,
            moveCount: moveCount
        });

        const board = game.board.board || game.board;  // Handle both Game and HexukiGameEngine

        return {
            history: history,
            winner: winner,
            scores: scores,
            moveCount: moveCount,
            finalBoard: board
        };
    }

    /**
     * Play a policy-guided game (Phase 2)
     * Supports different policies and exploration rates for each player
     *
     * @param {PolicyDatabase} p1Policy - Policy for Player 1
     * @param {number} p1ExplorationRate - Exploration rate for Player 1
     * @param {PolicyDatabase|number|null} p2PolicyOrRate - Policy for P2, or exploration rate, or null
     * @param {number|null} p2ExplorationRate - Exploration rate for P2 (if p2PolicyOrRate is a policy)
     * @param {number|null} maxMoves - Maximum moves to play (for opening book training)
     */
    playPolicyGuidedGame(p1Policy, p1ExplorationRate, p2PolicyOrRate = null, p2ExplorationRate = null, maxMoves = 18) {
        this.logger.debug('Starting policy-guided game');

        // Parse arguments to support multiple call patterns:
        // 1. (policy, rate) - both players use same policy and rate (self-play)
        // 2. (policy, rate, number) - P1 uses policy, P2 uses rate (vs random/different exploration)
        // 3. (policy, rate, policy, rate) - each player uses different policy

        let p2Policy, p2Rate;

        if (p2PolicyOrRate === null) {
            // Pattern 1: self-play with same policy
            p2Policy = p1Policy;
            p2Rate = p1ExplorationRate;
        } else if (typeof p2PolicyOrRate === 'number') {
            // Pattern 2: P2 exploration rate (could be 1.0 for random)
            p2Policy = p1Policy;
            p2Rate = p2PolicyOrRate;
        } else {
            // Pattern 3: Different policy for P2
            p2Policy = p2PolicyOrRate;
            p2Rate = p2ExplorationRate !== null ? p2ExplorationRate : p1ExplorationRate;
        }

        const policyPlayer = new PolicyPlayer();
        const game = new HexukiGameEngineV2();
        const history = [];
        let moveCount = 0;

        while (!game.gameEnded && moveCount < maxMoves) {
            const validMoves = this.getAllValidMoves(game);

            if (validMoves.length === 0) {
                this.logger.warn('No valid moves in policy-guided game');
                break;
            }

            // Select move based on current player
            let move;
            if (game.currentPlayer === 1) {
                move = policyPlayer.selectMove(game, validMoves, p1Policy, p1ExplorationRate);
            } else {
                move = policyPlayer.selectMove(game, validMoves, p2Policy, p2Rate);
            }

            // Record move in history
            const positionHash = PositionHasher.hash(game);
            const moveStr = PositionHasher.moveToString(move.tileValue, move.hexId);

            history.push({
                position: positionHash,
                move: moveStr,
                player: game.currentPlayer,
                hexId: move.hexId,
                tileValue: move.tileValue
            });

            this.logger.trace(`Move ${moveCount + 1}: Player ${game.currentPlayer} plays ${moveStr}`);

            // Make the move
            game.makeMove(move.hexId, move.tileValue);
            moveCount++;
        }

        // Determine winner
        const scores = game.calculateScores();
        const winner = scores.player1 > scores.player2 ? 1 :
                       scores.player2 > scores.player1 ? 2 : 0;

        this.logger.debug(`Policy-guided game complete: Winner = Player ${winner}`, {
            scores: scores,
            moveCount: moveCount
        });

        return {
            history: history,
            winner: winner,
            scores: scores,
            moveCount: moveCount,
            finalBoard: game.board,
            game: game,  // Return game object for opening book evaluation
            incomplete: moveCount < 18  // Flag for opening book training
        };
    }

    /**
     * Evaluate position after partial game (for opening book training)
     * Uses heuristics to determine who's ahead after N moves
     */
    evaluatePartialPosition(game) {
        const scores = game.calculateScores();

        // Simple heuristic: current score + tile value remaining
        const p1TileValue = game.player1Tiles.reduce((sum, t) => sum + t, 0);
        const p2TileValue = game.player2Tiles.reduce((sum, t) => sum + t, 0);

        const p1Total = scores.player1 + p1TileValue;
        const p2Total = scores.player2 + p2TileValue;

        return {
            player1: p1Total,
            player2: p2Total,
            winner: p1Total > p2Total ? 1 : p1Total < p2Total ? 2 : 0
        };
    }
}

// ============================================================================
// POLICY PLAYER - Intelligent move selection using learned policy
// ============================================================================

class PolicyPlayer {
    /**
     * Select a move using UCB1 with exploration/exploitation balance
     * Enforces minimum visit counts to ensure data quality
     */
    selectMove(game, validMoves, policy, explorationRate) {
        const positionHash = PositionHasher.hash(game);
        const positionStats = policy.getStats(positionHash);

        // Check if this position has ANY data at all
        const hasAnyData = Object.keys(positionStats).length > 0;

        // If position has NO data (e.g., late-game moves in opening book training),
        // play randomly instead of forcing exploration
        if (!hasAnyData) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        // Step 1: Prioritize under-explored moves (force data collection)
        // Only do this if we have SOME data for this position
        for (let move of validMoves) {
            const moveStr = PositionHasher.moveToString(move.tileValue, move.hexId);
            const stats = positionStats[moveStr];

            // If move hasn't been tried minimum times, try it now
            if (!stats || stats.gamesPlayed < LearningValidator.MINIMUM_VISITS_PER_MOVE) {
                return move;
            }
        }

        // Step 2: Random exploration
        if (Math.random() < explorationRate) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        // Step 3: Exploit learned policy using UCB1
        let bestMove = null;
        let bestScore = -Infinity;

        for (let move of validMoves) {
            const moveStr = PositionHasher.moveToString(move.tileValue, move.hexId);
            const ucbScore = policy.getUCBScore(positionHash, moveStr);

            if (ucbScore > bestScore) {
                bestScore = ucbScore;
                bestMove = move;
            }
        }

        // Fallback to random move (safer than always picking first)
        return bestMove || validMoves[Math.floor(Math.random() * validMoves.length)];
    }
}

// ============================================================================
// SANITY TESTS - Verify everything works correctly
// ============================================================================

class SanityTests {
    static runAll(logger) {
        logger.info('═══════════════════════════════════════');
        logger.info('🧪 RUNNING SANITY TESTS');
        logger.info('═══════════════════════════════════════');

        // Use DEBUG level for position hashing test to see details
        const debugLogger = new AILogger(LogLevel.DEBUG);

        const results = [
            this.test_PositionHashing(debugLogger),
            this.test_PolicyDatabase(logger),
            this.test_GameSimulation(logger),
            this.test_GameValidation(logger),
            this.test_SaveLoad(logger)
        ];

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;

        logger.info('═══════════════════════════════════════');
        logger.info(`✅ Passed: ${passed}`);
        logger.info(`❌ Failed: ${failed}`);

        if (failed > 0) {
            logger.error('⚠️  TESTS FAILED - DO NOT PROCEED WITH TRAINING');
            return false;
        }

        logger.info('✅ ALL TESTS PASSED - SAFE TO TRAIN');
        return true;
    }

    static test_PositionHashing(logger) {
        try {
            logger.info('Testing position hashing...');

            const game = new HexukiGameEngineV2();
            const hash1 = PositionHasher.hash(game);
            logger.debug('Initial hash:', { hash: hash1 });
            logger.debug('Initial game state:', {
                currentPlayer: game.currentPlayer,
                moveCount: game.moveCount,
                p1Tiles: game.player1Tiles,
                p2Tiles: game.player2Tiles,
                centerHex: game.board[9]
            });

            // Hash should be deterministic
            const hash2 = PositionHasher.hash(game);
            if (hash1 !== hash2) {
                throw new Error('Hashing not deterministic');
            }

            // Hash should change after a move
            // The center hex (9) already has value 1 from game initialization
            // So we need to place on a hex adjacent to 9
            // Hex 9's neighbors are: [4, 7, 12, 13, 11, 6]
            logger.debug('Making move: tile 5 on hex 7 (adjacent to center)');
            const moveSuccess = game.makeMove(7, 5); // Place tile 5 on hex 7
            logger.debug('Move success:', { success: moveSuccess });
            logger.debug('After move game state:', {
                currentPlayer: game.currentPlayer,
                moveCount: game.moveCount,
                p1Tiles: game.player1Tiles,
                p2Tiles: game.player2Tiles,
                hex7: game.board[7],
                hex9: game.board[9]
            });

            const hash3 = PositionHasher.hash(game);
            logger.debug('After move hash:', { hash: hash3 });

            if (hash1 === hash3) {
                logger.error('Hash comparison failed!', {
                    hash1: hash1,
                    hash3: hash3,
                    equal: hash1 === hash3
                });
                throw new Error('Hash did not change after move');
            }

            // Move string conversion
            const moveStr = PositionHasher.moveToString(5, 9);
            if (moveStr !== 't5h9') {
                throw new Error('Move string format incorrect');
            }

            const parsed = PositionHasher.parseMove('t5h9');
            if (parsed.tileValue !== 5 || parsed.hexId !== 9) {
                throw new Error('Move parsing incorrect');
            }

            logger.info('✅ Position hashing test passed');
            return { passed: true };
        } catch (e) {
            logger.error('❌ Position hashing test FAILED: ' + e.message, { stack: e.stack });
            return { passed: false, error: e.message };
        }
    }

    static test_PolicyDatabase(logger) {
        try {
            logger.info('Testing policy database...');

            const policy = new PolicyDatabase();

            // Record some outcomes
            policy.recordOutcome('pos1', 't5h9', 'win', 1.0);
            policy.recordOutcome('pos1', 't5h9', 'win', 0.95);
            policy.recordOutcome('pos1', 't5h9', 'loss', 0.9);

            // Check stats
            const stats = policy.getStats('pos1');
            if (!stats['t5h9']) {
                throw new Error('Move not recorded');
            }

            if (stats['t5h9'].gamesPlayed !== 3) {
                throw new Error('Games played count incorrect');
            }

            // Check win rate calculation
            const expectedWins = 1.0 + 0.95;
            const expectedWeight = 1.0 + 0.95 + 0.9;
            const expectedWinRate = expectedWins / expectedWeight;

            const actualWinRate = stats['t5h9'].wins / stats['t5h9'].totalWeight;
            if (Math.abs(actualWinRate - expectedWinRate) > 0.001) {
                throw new Error('Win rate calculation incorrect');
            }

            // Check UCB score
            const ucbScore = policy.getUCBScore('pos1', 't5h9');
            if (ucbScore <= 0 || ucbScore > 2) {
                throw new Error('UCB score out of expected range');
            }

            // Check best move
            policy.recordOutcome('pos1', 't6h10', 'win', 1.0);
            policy.recordOutcome('pos1', 't6h10', 'win', 1.0);
            const bestMove = policy.getBestMove('pos1');
            if (bestMove !== 't6h10') {
                throw new Error('Best move selection incorrect');
            }

            logger.info('✅ Policy database test passed');
            return { passed: true };
        } catch (e) {
            logger.error('❌ Policy database test FAILED', e);
            return { passed: false, error: e.message };
        }
    }

    static test_GameSimulation(logger) {
        try {
            logger.info('Testing game simulation...');

            const simulator = new GameSimulator(new AILogger(LogLevel.ERROR));
            const result = simulator.playRandomGame();

            // Check move count
            if (result.moveCount !== 18) {
                throw new Error(`Game ended with ${result.moveCount} moves (expected 18)`);
            }

            // Check history length
            if (result.history.length !== 18) {
                throw new Error(`History has ${result.history.length} entries (expected 18)`);
            }

            // Check winner determined
            if (result.winner === null || result.winner === undefined) {
                throw new Error('Winner not determined');
            }

            // Check scores exist
            if (!result.scores || !result.scores.player1 || !result.scores.player2) {
                throw new Error('Scores not calculated');
            }

            logger.info('✅ Game simulation test passed');
            return { passed: true };
        } catch (e) {
            logger.error('❌ Game simulation test FAILED: ' + e.message, { stack: e.stack });
            return { passed: false, error: e.message };
        }
    }

    static test_GameValidation(logger) {
        try {
            logger.info('Testing game validation...');

            const simulator = new GameSimulator(new AILogger(LogLevel.ERROR));
            const result = simulator.playRandomGame();

            const validation = GameValidator.validateGameCompletion(result, logger);

            if (!validation.valid) {
                throw new Error('Valid game failed validation: ' + JSON.stringify(validation.errors));
            }

            // Test invalid game detection
            const invalidResult = {
                moveCount: 10,
                winner: 1,
                history: new Array(10).fill({}),
                scores: { player1: 100, player2: 50 }
            };

            const invalidValidation = GameValidator.validateGameCompletion(invalidResult, logger);
            if (invalidValidation.valid) {
                throw new Error('Invalid game passed validation');
            }

            logger.info('✅ Game validation test passed');
            return { passed: true };
        } catch (e) {
            logger.error('❌ Game validation test FAILED: ' + e.message, { stack: e.stack });
            return { passed: false, error: e.message };
        }
    }

    static test_SaveLoad(logger) {
        try {
            logger.info('Testing save/load...');

            const policy = new PolicyDatabase();
            policy.recordOutcome('pos1', 't5h9', 'win', 1.0);
            policy.recordOutcome('pos1', 't6h10', 'loss', 0.95);
            policy.totalGamesPlayed = 100;

            // Convert to JSON and back
            const json = policy.toJSON();
            const loaded = PolicyDatabase.fromJSON(json);

            // Check data preserved
            if (loaded.totalGamesPlayed !== 100) {
                throw new Error('Total games not preserved');
            }

            const stats = loaded.getStats('pos1');
            if (!stats['t5h9'] || !stats['t6h10']) {
                throw new Error('Move data not preserved');
            }

            logger.info('✅ Save/load test passed');
            return { passed: true };
        } catch (e) {
            logger.error('❌ Save/load test FAILED', e);
            return { passed: false, error: e.message };
        }
    }
}

// ============================================================================
// PHASE 1 RUNNER - Run sanity check with 1000 random games
// ============================================================================

class Phase1Runner {
    constructor() {
        this.logger = new AILogger(LogLevel.INFO);
        this.simulator = new GameSimulator(this.logger);
        this.policy = new PolicyDatabase();
    }

    async run(numGames = 1000) {
        this.logger.info('═══════════════════════════════════════');
        this.logger.info('🚀 PHASE 1: SANITY CHECK & VALIDATION');
        this.logger.info(`Running ${numGames} random games...`);
        this.logger.info('═══════════════════════════════════════');

        // First, run sanity tests
        const testsPass = SanityTests.runAll(this.logger);
        if (!testsPass) {
            this.logger.error('Sanity tests failed - aborting Phase 1');
            return false;
        }

        // Reset error counters after sanity tests (they generate expected errors during testing)
        const errorsFromTests = this.logger.errorCount;
        this.logger.errorCount = 0;
        this.logger.warnCount = 0;

        // Now run random games
        let completeGames = 0;
        let incompleteGames = 0;
        let invalidGames = 0;
        const startTime = Date.now();

        for (let i = 0; i < numGames; i++) {
            // Play random game
            const result = this.simulator.playRandomGame();

            // Validate game
            const validation = GameValidator.validateGameCompletion(result, this.logger);

            if (validation.valid) {
                if (validation.incomplete) {
                    incompleteGames++;
                } else {
                    completeGames++;
                }

                // Learn from this game (even incomplete ones are useful)
                this.learnFromGame(result);
            } else {
                invalidGames++;
                this.logger.error(`Game ${i + 1} validation failed`, validation.errors);
            }

            // Progress update every 100 games
            if ((i + 1) % 100 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const gamesPerSec = (i + 1) / elapsed;
                this.logger.info(`Progress: ${i + 1}/${numGames} games (${gamesPerSec.toFixed(1)} games/sec)`);
            }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const gamesPerSec = numGames / elapsed;

        // Report results
        this.logger.info('═══════════════════════════════════════');
        this.logger.info('📊 PHASE 1 RESULTS');
        this.logger.info('═══════════════════════════════════════');
        this.logger.info(`Total Games: ${numGames}`);
        this.logger.info(`Complete Games (18 moves): ${completeGames}`);
        this.logger.info(`Incomplete Games (16-17 moves): ${incompleteGames}`);
        this.logger.info(`Invalid Games: ${invalidGames}`);
        this.logger.info(`Completion Rate: ${(completeGames / numGames * 100).toFixed(1)}%`);
        this.logger.info(`Time: ${elapsed.toFixed(2)}s`);
        this.logger.info(`Speed: ${gamesPerSec.toFixed(1)} games/sec`);

        const policySummary = this.policy.getSummary();
        this.logger.info(`Positions Explored: ${policySummary.positionsExplored}`);
        this.logger.info(`Unique Moves: ${policySummary.uniqueMovesExplored}`);

        const logSummary = this.logger.getSummary();
        this.logger.info(`Errors: ${logSummary.errors}`);
        this.logger.info(`Warnings: ${logSummary.warnings}`);

        // Determine if Phase 1 passed (incomplete games are acceptable, but invalid ones are not)
        const success = invalidGames === 0 && logSummary.errors === 0;

        if (success) {
            this.logger.info('═══════════════════════════════════════');
            this.logger.info('✅ PHASE 1 COMPLETE - ALL SYSTEMS WORKING');
            this.logger.info('Safe to proceed to Phase 2');
        } else {
            this.logger.error('❌ PHASE 1 FAILED - FIX ISSUES BEFORE CONTINUING');
        }

        return success;
    }

    learnFromGame(gameResult) {
        const gamma = 0.95; // Discount factor
        const n = gameResult.history.length;

        for (let i = 0; i < n; i++) {
            const step = gameResult.history[i];

            // Calculate temporal discount weight (later moves get more credit)
            const stepsFromEnd = n - i;
            const weight = Math.pow(gamma, stepsFromEnd - 1);

            // Determine outcome for this player
            let outcome;
            if (gameResult.winner === 0) {
                outcome = 'tie';
            } else if (gameResult.winner === step.player) {
                outcome = 'win';
            } else {
                outcome = 'loss';
            }

            this.policy.recordOutcome(step.position, step.move, outcome, weight);
        }

        this.policy.totalGamesPlayed++;
    }
}

// ============================================================================
// PHASE 2 RUNNER - Policy-guided self-play training with learning validation
// ============================================================================

class Phase2Runner {
    constructor(initialPolicy = null, opponentPolicy = null, options = {}) {
        this.logger = new AILogger(LogLevel.INFO);
        this.simulator = new GameSimulator(this.logger);
        this.policy = initialPolicy || new PolicyDatabase();
        this.opponentPolicy = opponentPolicy; // Optional opponent policy for diversity training
        this.generationHistory = [];

        // Opening book training options (AlphaGo approach: play full games, learn only opening)
        this.maxMoveToLearn = options.maxMoveToLearn || 18;  // Only learn from first N moves
        this.openingBookMode = options.openingBookMode || false;
    }

    /**
     * Run a single generation of training with opponent diversity
     *
     * @param {number} numGames - Number of games to play
     * @param {number} explorationRate - Exploration rate for P1 (learning policy)
     * @param {string|Object} mode - Training mode or config object
     *   - 'self-play': Both players use same policy (default)
     *   - 'vs-random': P1 policy vs P2 random
     *   - 'vs-opponent': P1 policy vs opponent policy
     *   - 'mixed': Object {self: 0.4, random: 0.6} - Mix of modes
     */
    async runGeneration(numGames, explorationRate, mode = 'self-play') {
        this.logger.info(`═══ GENERATION ${this.generationHistory.length + 1} ═══`);

        // Parse mode configuration
        let modeConfig = {};
        if (typeof mode === 'string') {
            modeConfig[mode] = 1.0;
        } else {
            modeConfig = mode; // {self: 0.4, random: 0.6, opponent: 0.0}
        }

        this.logger.info(`Games: ${numGames}, Exploration: ${explorationRate}`);
        this.logger.info(`Mode: ${JSON.stringify(modeConfig)}`);

        // Save snapshot of policy BEFORE generation
        const beforePolicy = PolicyDatabase.fromJSON(this.policy.toJSON());
        const startTime = Date.now();

        let completeGames = 0;
        let p1Wins = 0, p2Wins = 0, ties = 0;
        let modeCounts = {self: 0, random: 0, opponent: 0};

        for (let i = 0; i < numGames; i++) {
            // Select mode for this game based on mix ratios
            const rand = Math.random();
            let cumulative = 0;
            let selectedMode = 'self-play';

            for (let [modeName, ratio] of Object.entries(modeConfig)) {
                cumulative += ratio;
                if (rand < cumulative) {
                    selectedMode = modeName;
                    break;
                }
            }

            // Play game based on selected mode (always play to completion for reliable winner)
            let result;
            if (selectedMode === 'self-play' || selectedMode === 'self') {
                result = this.simulator.playPolicyGuidedGame(this.policy, explorationRate);
                modeCounts.self++;
            } else if (selectedMode === 'vs-random' || selectedMode === 'random') {
                result = this.simulator.playPolicyGuidedGame(this.policy, explorationRate, 1.0);
                modeCounts.random++;
            } else if (selectedMode === 'vs-opponent' || selectedMode === 'opponent') {
                if (!this.opponentPolicy) {
                    // Fallback to self-play if no opponent
                    result = this.simulator.playPolicyGuidedGame(this.policy, explorationRate);
                    modeCounts.self++;
                } else {
                    result = this.simulator.playPolicyGuidedGame(this.policy, explorationRate, this.opponentPolicy, 0.1);
                    modeCounts.opponent++;
                }
            }

            // Validate and learn
            const validation = GameValidator.validateGameCompletion(result, this.logger);
            if (validation.valid) {
                completeGames++;
                this.learnFromGame(result);

                // Track wins
                if (result.winner === 1) p1Wins++;
                else if (result.winner === 2) p2Wins++;
                else ties++;
            }

            // Progress update
            if ((i + 1) % 100 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                this.logger.info(`Progress: ${i + 1}/${numGames} (${((i+1)/elapsed).toFixed(1)} games/sec)`);
            }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const summary = this.policy.getSummary();

        // Validate learning happened
        const validation = LearningValidator.validateGeneration(this.policy, beforePolicy);

        // Calculate diversity metrics
        const diversityMetrics = LearningValidator.calculateDiversityMetrics(this.policy, this.generationHistory);
        const recommendations = LearningValidator.recommendIntervention(diversityMetrics, validation.metrics);

        // Record generation stats
        const genStats = {
            generation: this.generationHistory.length + 1,
            gamesPlayed: numGames,
            completeGames,
            explorationRate,
            mode: modeConfig,
            modeCounts: modeCounts, // Track actual game distribution
            duration: elapsed,
            gamesPerSec: numGames / elapsed,
            p1Wins, p2Wins, ties,
            p1WinRate: p1Wins / numGames,
            positionsExplored: summary.positionsExplored,
            uniqueMoves: summary.uniqueMovesExplored,
            totalGames: summary.totalGamesPlayed,
            learningMetrics: validation.metrics,
            learningIssues: validation.issues,
            diversityMetrics: diversityMetrics,
            recommendations: recommendations
        };

        this.generationHistory.push(genStats);

        // Log results
        this.logger.info(`✓ Completed: ${completeGames}/${numGames} games in ${elapsed.toFixed(2)}s`);
        this.logger.info(`Win Distribution: P1=${p1Wins} P2=${p2Wins} Tie=${ties}`);
        this.logger.info(`Mode Distribution: Self=${modeCounts.self} Random=${modeCounts.random} Opponent=${modeCounts.opponent}`);
        this.logger.info(`Positions: ${summary.positionsExplored}, Moves: ${summary.uniqueMovesExplored}`);
        this.logger.info(`Learning: Coverage +${(validation.metrics.coverageGrowth * 100).toFixed(1)}%, Stability ${(validation.metrics.stability * 100).toFixed(1)}%`);

        if (!validation.isLearning) {
            this.logger.warn('⚠️ Learning issues detected:', validation.issues);
        }

        if (recommendations.length > 0) {
            this.logger.warn(`💡 Recommendations: ${recommendations.map(r => r.action).join(', ')}`);
        }

        return genStats;
    }

    /**
     * Run multiple generations with adaptive exploration
     */
    async runMultipleGenerations(config) {
        this.logger.info('═══════════════════════════════════════');
        this.logger.info('🚀 PHASE 2: POLICY-GUIDED TRAINING');
        this.logger.info(`${config.length} generations planned`);
        this.logger.info('═══════════════════════════════════════');

        for (let i = 0; i < config.length; i++) {
            const gen = config[i];

            // Use adaptive exploration if requested
            let exploration = gen.exploration;
            if (gen.adaptive && this.generationHistory.length > 0) {
                const lastMetrics = this.generationHistory[this.generationHistory.length - 1].learningMetrics;
                exploration = LearningValidator.getAdaptiveExplorationRate(i, lastMetrics);
                this.logger.info(`Adaptive exploration: ${gen.exploration.toFixed(3)} → ${exploration.toFixed(3)}`);
            }

            await this.runGeneration(gen.games, exploration, gen.mode || 'self-play');

            // Yield to prevent browser freeze
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Final summary
        this.logger.info('═══════════════════════════════════════');
        this.logger.info('📊 PHASE 2 COMPLETE');
        this.logger.info('═══════════════════════════════════════');
        this.logger.info(`Total Generations: ${this.generationHistory.length}`);
        this.logger.info(`Final Positions: ${this.policy.getSummary().positionsExplored}`);
        this.logger.info(`Final Moves: ${this.policy.getSummary().uniqueMovesExplored}`);

        // Check if learning improved over time
        if (this.generationHistory.length > 1) {
            const firstGen = this.generationHistory[0];
            const lastGen = this.generationHistory[this.generationHistory.length - 1];
            this.logger.info(`Position Growth: ${firstGen.positionsExplored} → ${lastGen.positionsExplored}`);
            this.logger.info(`Stability: ${(firstGen.learningMetrics.stability * 100).toFixed(1)}% → ${(lastGen.learningMetrics.stability * 100).toFixed(1)}%`);
        }

        return this.generationHistory;
    }

    /**
     * Learn from a game using AlphaGo approach for opening book training
     *
     * AlphaGo Strategy:
     * - Play full game to completion (18 moves) to get reliable winner
     * - Only update policy for first N moves (controlled by maxMoveToLearn)
     * - Use full game length for temporal credit assignment (more accurate weights)
     *
     * This solves the opening book problem:
     * - Winner determined from complete game (reliable learning signal)
     * - Policy stays small (only opening positions)
     * - Deep learning on critical opening moves (50-200 visits per position)
     */
    learnFromGame(gameResult) {
        const gamma = 0.95;
        const n = gameResult.history.length;  // Full game length (18 moves typically)

        // Only learn from first maxMoveToLearn moves (e.g., 8 for opening book)
        const learnUpTo = Math.min(n, this.maxMoveToLearn);

        for (let i = 0; i < learnUpTo; i++) {
            const step = gameResult.history[i];

            // Use full game length for temporal credit (not just opening moves)
            // This gives proper weight decay based on distance from actual game end
            const stepsFromEnd = n - i;
            const weight = Math.pow(gamma, stepsFromEnd - 1);

            const outcome = gameResult.winner === 0 ? 'tie' :
                          gameResult.winner === step.player ? 'win' : 'loss';

            this.policy.recordOutcome(step.position, step.move, outcome, weight);
        }

        this.policy.totalGamesPlayed++;
    }
}

// ============================================================================
// GLOBAL API - Expose for testing
// ============================================================================

window.HexukiAI = {
    LogLevel: LogLevel,
    AILogger: AILogger,
    PositionHasher: PositionHasher,
    PolicyDatabase: PolicyDatabase,
    GameValidator: GameValidator,
    LearningValidator: LearningValidator,
    GameSimulator: GameSimulator,
    PolicyPlayer: PolicyPlayer,
    SanityTests: SanityTests,
    Phase1Runner: Phase1Runner,
    Phase2Runner: Phase2Runner
};

console.log('✅ Hexuki AI Trainer V2 - Phase 1 & Phase 2 Infrastructure Loaded');
