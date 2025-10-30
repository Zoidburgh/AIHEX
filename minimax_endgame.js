/**
 * Minimax Endgame Solver for Hexuki
 * When 6 or fewer empty positions remain, solve perfectly using minimax
 */

class MinimaxEndgameSolver {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.nodesSearched = 0;
        this.cacheHits = 0;
        this.transpositionTable = new Map();
    }

    /**
     * Check if we should use minimax (6 or fewer empty positions)
     */
    shouldUseMinimax() {
        const emptyCount = this.game.board.filter(h => h.owner === null).length;
        return emptyCount <= 6;
    }

    /**
     * Get number of empty positions
     */
    getEmptyCount() {
        return this.game.board.filter(h => h.owner === null).length;
    }

    /**
     * Create a state hash for transposition table
     */
    getStateHash() {
        // Create a string representation of the board state
        const boardState = this.game.board.map(h => {
            if (h.owner === null) return 'e';
            if (h.owner === 'neutral') return 'n' + h.value;
            return h.owner[6] + h.value; // '1' or '2' + value
        }).join(',');

        const p1Tiles = this.game.player1Tiles.sort().join(',');
        const p2Tiles = this.game.player2Tiles.sort().join(',');
        const p1Used = Array.from(this.game.player1UsedPositions).sort().join(',');
        const p2Used = Array.from(this.game.player2UsedPositions).sort().join(',');

        return `${boardState}|${this.game.currentPlayer}|${p1Tiles}|${p2Tiles}|${p1Used}|${p2Used}`;
    }

    /**
     * Evaluate terminal position (game over)
     */
    evaluateTerminal() {
        const scores = this.game.calculateScores();

        if (scores.player1 > scores.player2) {
            return 1000; // Player 1 wins
        } else if (scores.player2 > scores.player1) {
            return -1000; // Player 2 wins
        } else {
            return 0; // Tie
        }
    }

    /**
     * Minimax algorithm with alpha-beta pruning
     * @param {number} depth - Remaining depth to search
     * @param {number} alpha - Alpha value for pruning
     * @param {number} beta - Beta value for pruning
     * @param {boolean} maximizingPlayer - True if Player 1 (maximizing), false if Player 2 (minimizing)
     * @returns {number} - Best score achievable from this position
     */
    minimax(depth, alpha, beta, maximizingPlayer) {
        this.nodesSearched++;

        // Check transposition table
        const stateHash = this.getStateHash();
        if (this.transpositionTable.has(stateHash)) {
            this.cacheHits++;
            return this.transpositionTable.get(stateHash);
        }

        // Terminal conditions
        if (this.game.gameEnded || depth === 0) {
            const score = this.evaluateTerminal();
            this.transpositionTable.set(stateHash, score);
            return score;
        }

        const legalMoves = this.game.getAllValidMoves();

        // No legal moves = game over
        if (legalMoves.length === 0) {
            const score = this.evaluateTerminal();
            this.transpositionTable.set(stateHash, score);
            return score;
        }

        if (maximizingPlayer) {
            // Player 1 (maximizing)
            let maxScore = -Infinity;

            for (const move of legalMoves) {
                // Save state
                const savedState = this.saveState();

                // Make move
                this.game.makeMove(move.hexId, move.tileValue);

                // Recurse
                const score = this.minimax(depth - 1, alpha, beta, false);

                // Restore state
                this.restoreState(savedState);

                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);

                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }

            this.transpositionTable.set(stateHash, maxScore);
            return maxScore;

        } else {
            // Player 2 (minimizing)
            let minScore = Infinity;

            for (const move of legalMoves) {
                // Save state
                const savedState = this.saveState();

                // Make move
                this.game.makeMove(move.hexId, move.tileValue);

                // Recurse
                const score = this.minimax(depth - 1, alpha, beta, true);

                // Restore state
                this.restoreState(savedState);

                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);

                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }

            this.transpositionTable.set(stateHash, minScore);
            return minScore;
        }
    }

    /**
     * Find the best move using minimax
     * @returns {object} - {tile, hexId, score} or null if no moves
     */
    findBestMove(verbose = false) {
        if (verbose) {
            console.log('\n=== MINIMAX ENDGAME SOLVER ===');
            console.log(`Empty positions: ${this.getEmptyCount()}`);
            console.log(`Current player: ${this.game.currentPlayer}`);
        }

        this.nodesSearched = 0;
        this.cacheHits = 0;
        // DON'T clear cache - it helps across moves!

        const legalMoves = this.game.getAllValidMoves();

        if (legalMoves.length === 0) {
            if (verbose) console.log('No legal moves available');
            return null;
        }

        const maximizingPlayer = (this.game.currentPlayer === 1);
        let bestMove = null;
        let bestScore = maximizingPlayer ? -Infinity : Infinity;

        if (verbose) console.log(`Evaluating ${legalMoves.length} possible moves...`);

        for (const move of legalMoves) {
            // Save state
            const savedState = this.saveState();

            // Make move
            this.game.makeMove(move.hexId, move.tileValue);

            // Evaluate with minimax
            const depth = this.getEmptyCount(); // Search to end of game
            const score = this.minimax(depth, -Infinity, Infinity, !maximizingPlayer);

            // Restore state
            this.restoreState(savedState);

            if (verbose) console.log(`  t${move.tileValue}h${move.hexId}: score=${score}`);

            // Update best move
            if (maximizingPlayer) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { tile: move.tileValue, hexId: move.hexId, score };
                }
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = { tile: move.tileValue, hexId: move.hexId, score };
                }
            }
        }

        if (verbose) {
            console.log(`\nBest move: t${bestMove.tile}h${bestMove.hexId} (score=${bestScore})`);
            console.log(`Nodes searched: ${this.nodesSearched}`);
            console.log(`Cache hits: ${this.cacheHits}`);
            console.log(`Cache hit rate: ${(this.cacheHits / this.nodesSearched * 100).toFixed(1)}%`);
            console.log('==============================\n');
        }

        return bestMove;
    }

    /**
     * Save current game state for undo
     */
    saveState() {
        return {
            board: JSON.parse(JSON.stringify(this.game.board)),
            player1Tiles: [...this.game.player1Tiles],
            player2Tiles: [...this.game.player2Tiles],
            player1UsedPositions: new Set(this.game.player1UsedPositions),
            player2UsedPositions: new Set(this.game.player2UsedPositions),
            currentPlayer: this.game.currentPlayer,
            gameEnded: this.game.gameEnded,
            moveCount: this.game.moveCount
        };
    }

    /**
     * Restore saved game state
     */
    restoreState(state) {
        this.game.board = JSON.parse(JSON.stringify(state.board));
        this.game.player1Tiles = [...state.player1Tiles];
        this.game.player2Tiles = [...state.player2Tiles];
        this.game.player1UsedPositions = new Set(state.player1UsedPositions);
        this.game.player2UsedPositions = new Set(state.player2UsedPositions);
        this.game.currentPlayer = state.currentPlayer;
        this.game.gameEnded = state.gameEnded;
        this.game.moveCount = state.moveCount;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MinimaxEndgameSolver;
}
