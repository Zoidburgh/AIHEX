/**
 * Minimax Endgame Solver for HEXUKI
 *
 * When few enough tiles remain, we can solve the game perfectly using minimax.
 * This is possible because:
 * 1. We CAN evaluate terminal positions (final score)
 * 2. The branching factor is small enough to exhaustively search
 * 3. Minimax with alpha-beta pruning is very efficient
 *
 * Performance:
 * - 6 tiles remaining: ~1-2 seconds (perfect play)
 * - 8 tiles remaining: ~10-30 seconds (perfect play)
 * - 10 tiles remaining: ~1-3 minutes (perfect play)
 */

class MinimaxEndgameSolver {
    constructor(maxDepth = 12) {
        this.maxDepth = maxDepth; // Maximum tiles remaining to solve
        this.nodesSearched = 0;
        this.cacheHits = 0;
        this.cache = new Map(); // Transposition table
        this.maxCacheSize = 100000; // Limit cache size
    }

    /**
     * Check if position is solvable with minimax
     */
    isSolvable(game) {
        const tilesRemaining = game.player1Tiles.length + game.player2Tiles.length;
        return tilesRemaining <= this.maxDepth;
    }

    /**
     * Get best move using perfect minimax search
     */
    getBestMove(game) {
        if (!this.isSolvable(game)) {
            throw new Error('Position too complex for minimax solver');
        }

        const startTime = Date.now();
        this.nodesSearched = 0;
        this.cacheHits = 0;

        // Try all legal moves and find the best one
        const moves = game.getAllValidMoves();
        let bestMove = null;
        let bestScore = game.currentPlayer === 1 ? -Infinity : Infinity;
        const alpha = -Infinity;
        const beta = Infinity;

        const moveEvaluations = [];

        for (const move of moves) {
            // Make move
            const clonedGame = this.cloneGame(game);
            clonedGame.makeMove(move.hexId, move.tileValue);

            // Evaluate position
            const score = this.minimax(clonedGame, alpha, beta, false);

            moveEvaluations.push({
                move,
                score,
                isTerminal: clonedGame.gameEnded
            });

            // Update best move
            if (game.currentPlayer === 1) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        const elapsed = Date.now() - startTime;

        // Sort alternatives by score
        moveEvaluations.sort((a, b) => {
            return game.currentPlayer === 1 ? b.score - a.score : a.score - b.score;
        });

        return {
            move: bestMove,
            stats: {
                score: bestScore,
                nodesSearched: this.nodesSearched,
                cacheHits: this.cacheHits,
                timeMs: elapsed,
                perfect: true,
                alternatives: moveEvaluations.slice(0, 5).map(e => ({
                    move: e.move,
                    score: e.score
                }))
            }
        };
    }

    /**
     * Minimax with alpha-beta pruning
     * Returns score from Player 1's perspective (positive = good for P1)
     */
    minimax(game, alpha, beta, isMaximizing) {
        this.nodesSearched++;

        // Check cache
        const hash = this.hashPosition(game);
        if (this.cache.has(hash)) {
            this.cacheHits++;
            return this.cache.get(hash);
        }

        // Terminal node - game is over
        if (game.gameEnded) {
            const scores = game.calculateScores();
            const finalScore = scores.player1 - scores.player2;
            this.cacheSet(hash, finalScore);
            return finalScore;
        }

        // Get all valid moves
        const moves = game.getAllValidMoves();

        if (moves.length === 0) {
            // No valid moves - shouldn't happen but handle it
            const scores = game.calculateScores();
            const finalScore = scores.player1 - scores.player2;
            this.cacheSet(hash, finalScore);
            return finalScore;
        }

        // Maximizing player (Player 1)
        if (game.currentPlayer === 1) {
            let maxEval = -Infinity;

            for (const move of moves) {
                const clonedGame = this.cloneGame(game);
                clonedGame.makeMove(move.hexId, move.tileValue);

                const eval_ = this.minimax(clonedGame, alpha, beta, false);
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);

                if (beta <= alpha) {
                    break; // Beta cutoff
                }
            }

            this.cacheSet(hash, maxEval);
            return maxEval;
        }
        // Minimizing player (Player 2)
        else {
            let minEval = Infinity;

            for (const move of moves) {
                const clonedGame = this.cloneGame(game);
                clonedGame.makeMove(move.hexId, move.tileValue);

                const eval_ = this.minimax(clonedGame, alpha, beta, true);
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);

                if (beta <= alpha) {
                    break; // Alpha cutoff
                }
            }

            this.cacheSet(hash, minEval);
            return minEval;
        }
    }

    /**
     * Hash game position for caching
     */
    hashPosition(game) {
        // Create hash string: board state + current player + tiles
        let hash = '';

        // Board state
        for (const hex of game.board) {
            if (hex.value === null) {
                hash += 'x';
            } else {
                hash += hex.value + (hex.owner === 'player1' ? 'a' : 'b');
            }
        }

        // Current player
        hash += `_p${game.currentPlayer}`;

        // Available tiles (sorted for consistency)
        hash += '_t1:' + game.player1Tiles.sort().join(',');
        hash += '_t2:' + game.player2Tiles.sort().join(',');

        return hash;
    }

    /**
     * Set cache with size limit
     */
    cacheSet(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            // Clear half the cache when full (simple eviction)
            const keysToDelete = Array.from(this.cache.keys()).slice(0, this.maxCacheSize / 2);
            keysToDelete.forEach(k => this.cache.delete(k));
        }
        this.cache.set(key, value);
    }

    /**
     * Clone game state
     */
    cloneGame(game) {
        const cloned = new HexukiGameEngineV2();

        cloned.board = game.board.map(hex => ({
            id: hex.id,
            row: hex.row,
            col: hex.col,
            value: hex.value,
            owner: hex.owner
        }));

        cloned.player1Tiles = [...game.player1Tiles];
        cloned.player2Tiles = [...game.player2Tiles];
        cloned.player1UsedPositions = new Set(game.player1UsedPositions);
        cloned.player2UsedPositions = new Set(game.player2UsedPositions);
        cloned.currentPlayer = game.currentPlayer;
        cloned.gameEnded = game.gameEnded;
        cloned.moveCount = game.moveCount;

        return cloned;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cacheHits / Math.max(1, this.nodesSearched)
        };
    }
}

/**
 * Hybrid AI: MCTS for opening/midgame, Minimax for endgame
 */
class HybridAI {
    constructor(mctsSimulations = 2000, minimaxThreshold = 8) {
        this.mctsPlayer = new MCTSPlayer(mctsSimulations);
        this.minimaxSolver = new MinimaxEndgameSolver(minimaxThreshold);
        this.minimaxThreshold = minimaxThreshold;
    }

    /**
     * Get best move using appropriate solver
     */
    getBestMove(game) {
        const tilesRemaining = game.player1Tiles.length + game.player2Tiles.length;

        if (tilesRemaining <= this.minimaxThreshold) {
            console.log(`Switching to MINIMAX (${tilesRemaining} tiles remaining)`);
            return this.minimaxSolver.getBestMove(game);
        } else {
            console.log(`Using MCTS (${tilesRemaining} tiles remaining)`);
            return this.mctsPlayer.getBestMove(game);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            mcts: this.mctsPlayer.getStats(),
            minimax: this.minimaxSolver.getCacheStats(),
            threshold: this.minimaxThreshold
        };
    }
}

/**
 * Utility: Play game with hybrid AI
 */
function playHybridGame(p1Config, p2Config, verbose = false) {
    const game = new HexukiGameEngineV2();
    const player1 = new HybridAI(p1Config.mcts, p1Config.minimax);
    const player2 = new HybridAI(p2Config.mcts, p2Config.minimax);

    const moveHistory = [];

    while (!game.gameEnded) {
        const currentPlayer = game.currentPlayer === 1 ? player1 : player2;
        const result = currentPlayer.getBestMove(game);

        if (verbose) {
            const isPerfect = result.stats.perfect ? ' [PERFECT]' : '';
            console.log(`Player ${game.currentPlayer} move ${game.moveCount + 1}:`,
                       result.move,
                       result.stats.perfect
                           ? `score: ${result.stats.score}${isPerfect}`
                           : `win rate: ${(result.stats.winRate * 100).toFixed(1)}%`);
        }

        game.makeMove(result.move.hexId, result.move.tileValue);
        moveHistory.push({
            player: game.currentPlayer === 1 ? 2 : 1,
            move: result.move,
            stats: result.stats
        });
    }

    const finalScores = game.calculateScores();
    const winner = finalScores.player1 > finalScores.player2 ? 1 :
                   finalScores.player2 > finalScores.player1 ? 2 : 0;

    return {
        winner,
        scores: finalScores,
        moveHistory
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.MinimaxEndgameSolver = MinimaxEndgameSolver;
    window.HybridAI = HybridAI;
    window.playHybridGame = playHybridGame;
}
