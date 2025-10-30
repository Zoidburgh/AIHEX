/**
 * Minimax Training Strategy
 *
 * Training approach:
 * - First 12 moves: Random or policy-based (for exploration/learning)
 * - Last 6 moves: Perfect minimax play (generates perfect endgame data)
 *
 * This creates a dataset where:
 * - Early game has exploration and variety
 * - Endgame always shows optimal play
 * - Policy learns what perfect endgame play looks like
 */

class MinimaxTrainingStrategy {
    constructor(minimaxThreshold = 6) {
        this.minimaxThreshold = minimaxThreshold;
        this.gamesPlayed = 0;
        this.movesFromRandom = 0;
        this.movesFromMinimax = 0;
        this.perfectEndgamesGenerated = 0;
    }

    /**
     * Choose a move for training
     * @param {HexukiGameEngineV2} game - The game engine
     * @param {number} explorationRate - Probability of random move (0.0 - 1.0)
     * @returns {object} - {tile, hexId, source}
     */
    chooseTrainingMove(game, explorationRate = 1.0) {
        const emptyCount = game.board.filter(h => h.owner === null).length;

        // ENDGAME: Use minimax for perfect play
        if (emptyCount <= this.minimaxThreshold) {
            const solver = new MinimaxEndgameSolver(game);
            const move = solver.findBestMove();

            if (move) {
                this.movesFromMinimax++;

                // Check if this is the start of endgame
                if (emptyCount === this.minimaxThreshold) {
                    this.perfectEndgamesGenerated++;
                }

                return {
                    tile: move.tile,
                    hexId: move.hexId,
                    source: 'minimax',
                    score: move.score
                };
            }
        }

        // OPENING/MIDGAME: Random exploration
        const legalMoves = game.getAllValidMoves();

        if (legalMoves.length === 0) {
            return null;
        }

        // Random move for exploration
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        this.movesFromRandom++;

        return {
            tile: randomMove.tileValue,
            hexId: randomMove.hexId,
            source: 'random'
        };
    }

    /**
     * Play a complete training game
     * @param {HexukiGameEngineV2} game - The game engine
     * @returns {object} - Game result with move history
     */
    playTrainingGame(game) {
        game.reset();

        const moveHistory = [];
        const maxMoves = 18;
        let moveCount = 0;

        while (!game.gameEnded && moveCount < maxMoves) {
            const move = this.chooseTrainingMove(game, 1.0); // 100% random until minimax kicks in

            if (!move) {
                break;
            }

            moveHistory.push({
                moveNumber: moveCount + 1,
                player: game.currentPlayer,
                tile: move.tile,
                hexId: move.hexId,
                source: move.source,
                score: move.score,
                emptyPositions: game.board.filter(h => h.owner === null).length
            });

            game.makeMove(move.hexId, move.tile);
            moveCount++;
        }

        const scores = game.calculateScores();
        this.gamesPlayed++;

        return {
            moveHistory,
            finalScores: scores,
            winner: scores.player1 > scores.player2 ? 1 : scores.player2 > scores.player1 ? 2 : 0,
            totalMoves: moveCount,
            minimaxMovesUsed: moveHistory.filter(m => m.source === 'minimax').length,
            randomMovesUsed: moveHistory.filter(m => m.source === 'random').length
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            gamesPlayed: this.gamesPlayed,
            movesFromRandom: this.movesFromRandom,
            movesFromMinimax: this.movesFromMinimax,
            perfectEndgamesGenerated: this.perfectEndgamesGenerated,
            avgRandomMovesPerGame: this.gamesPlayed > 0 ? this.movesFromRandom / this.gamesPlayed : 0,
            avgMinimaxMovesPerGame: this.gamesPlayed > 0 ? this.movesFromMinimax / this.gamesPlayed : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.gamesPlayed = 0;
        this.movesFromRandom = 0;
        this.movesFromMinimax = 0;
        this.perfectEndgamesGenerated = 0;
    }
}

/**
 * Update an existing policy with training game data
 * Records the perfect minimax moves in the policy
 */
class MinimaxPolicyUpdater {
    constructor(policy) {
        this.policy = policy;
        this.minimaxMovesRecorded = 0;
    }

    /**
     * Generate state key from game state
     */
    getStateKey(game) {
        const turn = game.currentPlayer;
        const boardState = game.board.map(hex => {
            if (hex.owner === null) return 'null';
            if (hex.owner === 'neutral') return `${hex.value}p0`;
            const playerNum = hex.owner === 'player1' ? 1 : 2;
            return `${hex.value}p${playerNum}`;
        }).join(',');

        const p1Available = game.player1Tiles.sort((a, b) => a - b).join('');
        const p2Available = game.player2Tiles.sort((a, b) => a - b).join('');
        const p1Used = Array.from(game.player1UsedPositions).sort((a, b) => a - b).join('');
        const p2Used = Array.from(game.player2UsedPositions).sort((a, b) => a - b).join('');

        return `${turn}|${boardState}|p1a:${p1Available}|p2a:${p2Available}|p1u:${p1Used}|p2u:${p2Used}`;
    }

    /**
     * Record a game result into the policy
     * @param {object} gameResult - Result from playTrainingGame()
     * @param {HexukiGameEngineV2} game - The game engine (to replay moves)
     */
    recordGame(gameResult, game) {
        game.reset();

        const winnerBonus = gameResult.winner === 1 ? 1 : gameResult.winner === 2 ? -1 : 0;

        // Replay the game and record each move
        for (const moveData of gameResult.moveHistory) {
            const stateKey = this.getStateKey(game);
            const moveKey = `t${moveData.tile}h${moveData.hexId}`;

            // Initialize state in policy if needed
            if (!this.policy.database[stateKey]) {
                this.policy.database[stateKey] = {};
            }

            // Initialize move in policy if needed
            if (!this.policy.database[stateKey][moveKey]) {
                this.policy.database[stateKey][moveKey] = {
                    wins: 0,
                    losses: 0,
                    ties: 0,
                    totalWeight: 0,
                    gamesPlayed: 0,
                    lastUpdated: Date.now()
                };
            }

            const moveStats = this.policy.database[stateKey][moveKey];

            // Calculate outcome from this player's perspective
            const currentPlayer = moveData.player;
            let outcome;

            if (gameResult.winner === 0) {
                outcome = 'tie';
            } else if (gameResult.winner === currentPlayer) {
                outcome = 'win';
            } else {
                outcome = 'loss';
            }

            // Weight minimax moves more heavily (they're perfect!)
            const weight = moveData.source === 'minimax' ? 2.0 : 1.0;

            // Update statistics
            if (outcome === 'win') {
                moveStats.wins += weight;
            } else if (outcome === 'loss') {
                moveStats.losses += weight;
            } else {
                moveStats.ties += weight;
            }

            moveStats.totalWeight += weight;
            moveStats.gamesPlayed += 1;
            moveStats.lastUpdated = Date.now();

            if (moveData.source === 'minimax') {
                this.minimaxMovesRecorded++;
            }

            // Make the move in the game
            game.makeMove(moveData.hexId, moveData.tile);
        }

        this.policy.totalGamesPlayed = (this.policy.totalGamesPlayed || 0) + 1;
        this.policy.lastUpdated = new Date().toISOString();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            minimaxMovesRecorded: this.minimaxMovesRecorded,
            totalGamesInPolicy: this.policy.totalGamesPlayed || 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MinimaxTrainingStrategy, MinimaxPolicyUpdater };
}
