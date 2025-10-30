/**
 * Monte Carlo Tree Search AI for HEXUKI
 *
 * Solves the "no intermediate scoring" problem by playing complete games
 * to the end and backpropagating results.
 */

class MCTSNode {
    constructor(game, parent = null, move = null, playerJustMoved = null, config = {}, sharedMinimaxSolver = null) {
        // Clone game state for this node
        this.game = this.cloneGame(game);
        this.parent = parent;
        this.move = move; // {hexId, tileValue} that led to this state

        this.children = [];
        this.wins = 0;
        this.visits = 0;
        this.untriedMoves = this.game.getAllValidMoves();

        // Player who made the move to reach this state
        // For root node, this should be null (no move yet)
        // For child nodes, it's passed from parent
        this.playerJustMoved = playerJustMoved;

        // Store config for minimax rollouts
        this.config = config;

        // OPTIMIZATION: Store reference to shared minimax solver
        this.sharedMinimaxSolver = sharedMinimaxSolver;
    }

    /**
     * Clone game state deeply - OPTIMIZED VERSION
     * Automatically detects which engine variant to use
     */
    cloneGame(game) {
        // Detect which engine class we're using
        const EngineClass = game.constructor;
        const cloned = new EngineClass();

        // Fast board copy - avoid JSON.parse/stringify
        cloned.board = game.board.map(hex => ({
            id: hex.id,
            row: hex.row,
            col: hex.col,
            value: hex.value,
            owner: hex.owner
        }));

        // Copy tile arrays
        cloned.player1Tiles = [...game.player1Tiles];
        cloned.player2Tiles = [...game.player2Tiles];

        // Copy used positions
        cloned.player1UsedPositions = new Set(game.player1UsedPositions);
        cloned.player2UsedPositions = new Set(game.player2UsedPositions);

        // Copy game state
        cloned.currentPlayer = game.currentPlayer;
        cloned.gameEnded = game.gameEnded;
        cloned.moveCount = game.moveCount;

        return cloned;
    }

    /**
     * UCB1 (Upper Confidence Bound) formula for selecting child nodes
     * Balances exploitation (high win rate) with exploration (less visited)
     *
     * CRITICAL: Child wins are from child's perspective (opponent)
     * We want LOWEST child win rate (bad for opponent = good for us)
     */
    selectChild() {
        const c = Math.sqrt(2); // Exploration constant

        return this.children.reduce((best, child) => {
            // Invert win rate since child represents opponent's node
            const exploit = 1.0 - (child.wins / child.visits);
            const explore = c * Math.sqrt(Math.log(this.visits) / child.visits);
            const ucb1 = exploit + explore;

            return ucb1 > best.ucb1 ? {node: child, ucb1} : best;
        }, {node: null, ucb1: -Infinity}).node;
    }

    /**
     * Add a child node for an untried move
     */
    addChild(move) {
        const childGame = this.cloneGame(this.game);
        const playerMakingMove = childGame.currentPlayer; // Save before move switches it
        childGame.makeMove(move.hexId, move.tileValue);

        // Pass the player who made the move to reach this child state (and config + shared solver)
        const child = new MCTSNode(childGame, this, move, playerMakingMove, this.config, this.sharedMinimaxSolver);
        this.untriedMoves = this.untriedMoves.filter(m =>
            !(m.hexId === move.hexId && m.tileValue === move.tileValue)
        );
        this.children.push(child);
        return child;
    }

    /**
     * Simulate a random game to completion from this state
     * Returns result from PLAYER 1's perspective (always)
     *
     * @param {boolean} useMinimaxRollouts - Use minimax for endgame evaluation
     * @param {number} minimaxThreshold - Switch to minimax when <= this many empty hexes
     */
    simulate(useMinimaxRollouts = false, minimaxThreshold = 6) {
        const simGame = this.cloneGame(this.game);

        // PHASE 1: Random rollout until threshold
        while (!simGame.gameEnded) {
            const emptyHexes = simGame.board.filter(h => h.value === null).length;

            // Switch to minimax when <= threshold empty hexes
            if (useMinimaxRollouts && emptyHexes <= minimaxThreshold) {
                break;
            }

            const moves = simGame.getAllValidMoves();
            if (moves.length === 0) {
                break; // Should not happen but safety check
            }

            // Pure random for speed
            const move = moves[Math.floor(Math.random() * moves.length)];
            simGame.makeMove(move.hexId, move.tileValue);
        }

        // PHASE 2: Minimax evaluation (if enabled and not already game over)
        if (useMinimaxRollouts && !simGame.gameEnded) {
            // OPTIMIZATION: Reuse shared minimax solver instead of creating new one
            // This avoids rebuilding Zobrist tables and shares transposition table
            if (!this.sharedMinimaxSolver) {
                // Fallback: create solver if not provided (shouldn't happen)
                this.sharedMinimaxSolver = new MinimaxEndgameSolverOptimized(simGame);
            }

            const score = this.sharedMinimaxSolver.evaluatePosition(simGame, false);

            // Convert minimax score to MCTS probability
            // score > 0 = P1 wins → return 1.0
            // score < 0 = P2 wins → return 0.0
            // score ≈ 0 = draw → return 0.5
            if (score > 0) return 1.0;
            if (score < 0) return 0.0;
            return 0.5;
        }

        // PHASE 3: Fallback to random evaluation (if minimax not used or game already over)
        const scores = simGame.calculateScores();
        const scoreDiff = scores.player1 - scores.player2;

        // Convert to normalized result: 1.0 for P1 win, 0.0 for P1 loss, 0.5 for draw
        if (scoreDiff > 0) return 1.0;
        if (scoreDiff < 0) return 0.0;
        return 0.5;
    }

    /**
     * Improved random move selection
     * Slightly bias toward center hexes and higher value tiles
     */
    smartRandomMove(moves, game) {
        // 80% truly random, 20% biased
        if (Math.random() < 0.8) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // Calculate simple score for each move
        const scored = moves.map(move => {
            let score = 0;

            // Prefer center-ish hexes (id 4, 7, 9, 11, 14)
            const centerHexes = [4, 7, 9, 11, 14];
            if (centerHexes.includes(move.hexId)) {
                score += 2;
            }

            // Slightly prefer higher value tiles
            score += move.tileValue / 10;

            return {move, score};
        });

        // Pick best of 3 random moves
        const samples = [];
        for (let i = 0; i < Math.min(3, scored.length); i++) {
            samples.push(scored[Math.floor(Math.random() * scored.length)]);
        }

        return samples.reduce((best, curr) =>
            curr.score > best.score ? curr : best
        ).move;
    }

    /**
     * Backpropagate result up the tree
     * Result is ALWAYS from Player 1's perspective (1.0 = P1 wins, 0.0 = P2 wins)
     */
    update(result) {
        this.visits++;

        // Add wins based on whose turn it is at this node
        if (this.game.currentPlayer === 1) {
            // This is Player 1's turn, so result directly applies
            this.wins += result;
        } else {
            // This is Player 2's turn, so invert (P2 wants opposite of P1)
            this.wins += (1.0 - result);
        }

        if (this.parent) {
            this.parent.update(result);
        }
    }
}

/**
 * MCTS AI Player
 */
class MCTSPlayer {
    constructor(simulationsPerMove = 10000, timeLimit = null, config = {}) {
        this.simulationsPerMove = simulationsPerMove;
        this.timeLimit = timeLimit; // Optional: time limit in milliseconds

        // Configuration for hybrid minimax rollouts
        this.config = {
            useMinimaxRollouts: config.useMinimaxRollouts || false,
            minimaxThreshold: config.minimaxThreshold || 6,
            ...config
        };

        // OPTIMIZATION: Create shared minimax solver for reuse across all simulations
        // This avoids rebuilding Zobrist tables and allows transposition table sharing
        this.sharedMinimaxSolver = null;
        if (this.config.useMinimaxRollouts) {
            // Will be initialized with proper game state on first use
            this.sharedMinimaxSolver = new MinimaxEndgameSolverOptimized(null);
        }

        this.stats = {
            totalSimulations: 0,
            totalTime: 0,
            movesMade: 0,
            avgSimulationsPerMove: 0,
            avgTimePerMove: 0
        };
    }

    /**
     * Get best move using MCTS
     * Can be called sync or async - automatically yields to browser every 100ms
     */
    async getBestMove(game, progressCallback = null) {
        const startTime = Date.now();

        // Clear transposition table between moves for fresh evaluation
        if (this.sharedMinimaxSolver) {
            this.sharedMinimaxSolver.transpositionTable.clear();
        }

        const rootNode = new MCTSNode(game, null, null, null, this.config, this.sharedMinimaxSolver);

        let simulations = 0;
        let lastYieldTime = Date.now();

        // Run MCTS for specified number of simulations or time limit
        while (true) {
            // Check termination conditions
            if (this.timeLimit && (Date.now() - startTime) >= this.timeLimit) {
                break;
            }
            if (!this.timeLimit && simulations >= this.simulationsPerMove) {
                break;
            }

            // MCTS main loop: Selection -> Expansion -> Simulation -> Backpropagation
            let node = rootNode;

            // 1. Selection: traverse tree using UCB1
            while (node.untriedMoves.length === 0 && node.children.length > 0) {
                node = node.selectChild();
            }

            // 2. Expansion: add a child if there are untried moves
            if (node.untriedMoves.length > 0) {
                const move = node.untriedMoves[Math.floor(Math.random() * node.untriedMoves.length)];
                node = node.addChild(move);
            }

            // 3. Simulation: play out random game (with optional minimax rollouts)
            const result = node.simulate(
                node.config.useMinimaxRollouts || false,
                node.config.minimaxThreshold || 6
            );

            // 4. Backpropagation: update nodes with result
            node.update(result);

            simulations++;

            // Yield to browser every 100ms to prevent "unresponsive script" warnings
            const now = Date.now();
            if (now - lastYieldTime > 100) {
                if (progressCallback) {
                    progressCallback(simulations, this.simulationsPerMove);
                }
                await new Promise(resolve => setTimeout(resolve, 0));
                lastYieldTime = now;
            }
        }

        // Select best move (most visited child - standard MCTS)
        // Note: visits naturally balance exploration/exploitation via UCB1
        const bestChild = rootNode.children.reduce((best, child) =>
            child.visits > best.visits ? child : best
        );

        // IMPORTANT: Child node's wins are from child's currentPlayer perspective
        // If we're at root (P1 to move), children are P2 nodes
        // So child.wins represents P2's wins, which we need to invert for display

        // Update statistics
        const elapsed = Date.now() - startTime;
        this.stats.totalSimulations += simulations;
        this.stats.totalTime += elapsed;
        this.stats.movesMade++;
        this.stats.avgSimulationsPerMove = this.stats.totalSimulations / this.stats.movesMade;
        this.stats.avgTimePerMove = this.stats.totalTime / this.stats.movesMade;

        return {
            move: bestChild.move,
            stats: {
                simulations,
                timeMs: elapsed,
                winRate: bestChild.wins / bestChild.visits,
                visits: bestChild.visits,
                alternatives: rootNode.children
                    .sort((a, b) => b.visits - a.visits)
                    .slice(0, 5)
                    .map(c => ({
                        move: c.move,
                        visits: c.visits,
                        winRate: c.wins / c.visits
                    }))
            }
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalSimulations: 0,
            totalTime: 0,
            movesMade: 0,
            avgSimulationsPerMove: 0,
            avgTimePerMove: 0
        };
    }

    /**
     * Get human-readable stats
     */
    getStats() {
        return {
            ...this.stats,
            avgTimePerMoveMs: Math.round(this.stats.avgTimePerMove),
            avgSimulationsPerMove: Math.round(this.stats.avgSimulationsPerMove)
        };
    }
}

/**
 * Utility: Play a full game between two MCTS players
 */
async function playMCTSGame(player1Sims, player2Sims, verbose = false) {
    const game = new HexukiGameEngineV2();
    const player1 = new MCTSPlayer(player1Sims);
    const player2 = new MCTSPlayer(player2Sims);

    const moveHistory = [];

    while (!game.gameEnded) {
        const currentPlayer = game.currentPlayer === 1 ? player1 : player2;
        const result = await currentPlayer.getBestMove(game);

        if (verbose) {
            console.log(`Player ${game.currentPlayer} move ${game.moveCount + 1}:`,
                       result.move,
                       `(${result.stats.simulations} sims, ${result.stats.timeMs}ms, ` +
                       `win rate: ${(result.stats.winRate * 100).toFixed(1)}%)`);
        }

        game.makeMove(result.move.hexId, result.move.tileValue);
        moveHistory.push({
            player: game.currentPlayer === 1 ? 2 : 1, // Player who just moved
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
        moveHistory,
        player1Stats: player1.getStats(),
        player2Stats: player2.getStats()
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.MCTSPlayer = MCTSPlayer;
    window.MCTSNode = MCTSNode;
    window.playMCTSGame = playMCTSGame;
}
