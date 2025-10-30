/**
 * Hybrid AI Player
 * Uses policy for opening/midgame, switches to minimax for endgame (last 6 moves)
 */

class HybridAIPlayer {
    constructor(gameEngine, policy, minimaxThreshold = 6) {
        this.game = gameEngine;
        this.policy = policy;
        this.minimaxThreshold = minimaxThreshold;
        this.minimaxSolver = new MinimaxEndgameSolver(gameEngine);
        this.movesFromPolicy = 0;
        this.movesFromMinimax = 0;
    }

    /**
     * Choose the best move (using policy or minimax depending on game state)
     * @param {number} epsilon - Exploration rate for policy (ignored in minimax)
     * @returns {object} - {tile, hexId, source} where source is 'policy' or 'minimax'
     */
    chooseMove(epsilon = 0.0) {
        const emptyCount = this.minimaxSolver.getEmptyCount();

        // Use minimax for endgame
        if (emptyCount <= this.minimaxThreshold) {
            console.log(`[HYBRID AI] Switching to MINIMAX (${emptyCount} empty positions)`);
            const move = this.minimaxSolver.findBestMove();
            if (move) {
                this.movesFromMinimax++;
                return { tile: move.tile, hexId: move.hexId, source: 'minimax', score: move.score };
            }
        }

        // Use policy for opening/midgame
        console.log(`[HYBRID AI] Using POLICY (${emptyCount} empty positions)`);
        const move = this.chooseMoveFromPolicy(epsilon);
        if (move) {
            this.movesFromPolicy++;
            return { ...move, source: 'policy' };
        }

        return null;
    }

    /**
     * Choose move from policy (existing policy logic)
     */
    chooseMoveFromPolicy(epsilon = 0.0) {
        const stateKey = this.getStateKey();
        const legalMoves = this.game.getAllValidMoves();

        if (legalMoves.length === 0) {
            return null;
        }

        // Exploration: random move
        if (Math.random() < epsilon) {
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            return { tile: randomMove.tileValue, hexId: randomMove.hexId };
        }

        // Exploitation: use policy
        const stateData = this.policy.database[stateKey];

        if (!stateData) {
            // State not in policy, choose random
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            return { tile: randomMove.tileValue, hexId: randomMove.hexId };
        }

        // Find best move according to policy
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of legalMoves) {
            const moveKey = `t${move.tileValue}h${move.hexId}`;
            const moveData = stateData[moveKey];

            if (moveData && moveData.totalWeight > 0) {
                const winRate = moveData.wins / moveData.totalWeight;
                if (winRate > bestScore) {
                    bestScore = winRate;
                    bestMove = { tile: move.tileValue, hexId: move.hexId };
                }
            }
        }

        // If no move found in policy, choose random
        if (!bestMove) {
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            bestMove = { tile: randomMove.tileValue, hexId: randomMove.hexId };
        }

        return bestMove;
    }

    /**
     * Get state key for policy lookup
     */
    getStateKey() {
        const turn = this.game.currentPlayer;
        const boardState = this.game.board.map(hex => {
            if (hex.owner === null) return 'null';
            if (hex.owner === 'neutral') return `${hex.value}p0`;
            const playerNum = hex.owner === 'player1' ? 1 : 2;
            return `${hex.value}p${playerNum}`;
        }).join(',');

        const p1Available = this.game.player1Tiles.sort((a, b) => a - b).join('');
        const p2Available = this.game.player2Tiles.sort((a, b) => a - b).join('');
        const p1Used = Array.from(this.game.player1UsedPositions).sort((a, b) => a - b).join('');
        const p2Used = Array.from(this.game.player2UsedPositions).sort((a, b) => a - b).join('');

        return `${turn}|${boardState}|p1a:${p1Available}|p2a:${p2Available}|p1u:${p1Used}|p2u:${p2Used}`;
    }

    /**
     * Get statistics about move sources
     */
    getStats() {
        return {
            movesFromPolicy: this.movesFromPolicy,
            movesFromMinimax: this.movesFromMinimax,
            totalMoves: this.movesFromPolicy + this.movesFromMinimax
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.movesFromPolicy = 0;
        this.movesFromMinimax = 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridAIPlayer;
}
