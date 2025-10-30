/**
 * Opening Book Generator for HEXUKI
 *
 * Runs self-play games to analyze opening move strength
 * Incremental analysis with live updates
 */

class OpeningBookGenerator {
    constructor(mctsSimulations = 2000, gamesPerOpening = 20) {
        this.mctsSimulations = mctsSimulations;
        this.gamesPerOpening = gamesPerOpening;

        this.openingStats = new Map(); // hexId-tileValue -> stats
        this.gameHistory = [];
        this.totalGames = 0;
        this.isRunning = false;
        this.isPaused = false;

        this.callbacks = {
            onGameComplete: null,
            onBatchComplete: null,
            onAnalysisComplete: null,
            onProgress: null
        };
    }

    /**
     * Start opening book generation
     */
    async generateOpeningBook(totalGames = 1000, batchSize = 100) {
        this.isRunning = true;
        this.isPaused = false;

        const batches = Math.ceil(totalGames / batchSize);

        for (let batch = 0; batch < batches; batch++) {
            if (!this.isRunning) break;

            const gamesToPlay = Math.min(batchSize, totalGames - (batch * batchSize));

            if (this.callbacks.onProgress) {
                this.callbacks.onProgress({
                    batch: batch + 1,
                    totalBatches: batches,
                    gamesInBatch: gamesToPlay,
                    totalGames: this.totalGames
                });
            }

            await this.runBatch(gamesToPlay);

            if (this.callbacks.onBatchComplete) {
                this.callbacks.onBatchComplete(this.getAnalysis());
            }

            // Allow UI to update
            await this.sleep(100);

            // Check pause
            while (this.isPaused && this.isRunning) {
                await this.sleep(500);
            }
        }

        this.isRunning = false;

        if (this.callbacks.onAnalysisComplete) {
            this.callbacks.onAnalysisComplete(this.getAnalysis());
        }

        return this.getAnalysis();
    }

    /**
     * Run a batch of games
     */
    async runBatch(gameCount) {
        for (let i = 0; i < gameCount; i++) {
            await this.playOneGame();

            if (!this.isRunning) break;

            // Yield to browser after EVERY game
            await this.sleep(10);
        }
    }

    /**
     * Play one complete game and record opening
     */
    async playOneGame() {
        const game = new HexukiGameEngineV2();
        const ai = new MCTSPlayer(this.mctsSimulations);

        // Track first move
        const firstMoveResult = ai.getBestMove(game);
        const firstMove = firstMoveResult.move;
        const openingKey = `${firstMove.hexId}-${firstMove.tileValue}`;

        game.makeMove(firstMove.hexId, firstMove.tileValue);

        // Play rest of game with faster MCTS
        const fastAI = new MCTSPlayer(300); // Reduced from 500 for speed

        let moveCount = 0;
        while (!game.gameEnded) {
            const result = fastAI.getBestMove(game);
            game.makeMove(result.move.hexId, result.move.tileValue);

            // Yield to browser every few moves
            moveCount++;
            if (moveCount % 5 === 0) {
                await this.sleep(1);
            }
        }

        const scores = game.calculateScores();
        const winner = scores.player1 > scores.player2 ? 1 :
                      scores.player2 > scores.player1 ? 2 : 0;
        const scoreDiff = scores.player1 - scores.player2;

        // Record opening stats
        if (!this.openingStats.has(openingKey)) {
            this.openingStats.set(openingKey, {
                hexId: firstMove.hexId,
                tileValue: firstMove.tileValue,
                games: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                totalScoreDiff: 0,
                scores: []
            });
        }

        const stats = this.openingStats.get(openingKey);
        stats.games++;
        stats.totalScoreDiff += scoreDiff;
        stats.scores.push(scoreDiff);

        if (winner === 1) stats.wins++;
        else if (winner === 2) stats.losses++;
        else stats.draws++;

        this.totalGames++;

        // Record game
        this.gameHistory.push({
            gameNum: this.totalGames,
            opening: openingKey,
            winner,
            scores,
            scoreDiff
        });

        if (this.callbacks.onGameComplete) {
            this.callbacks.onGameComplete({
                gameNum: this.totalGames,
                opening: openingKey,
                winner,
                scores
            });
        }
    }

    /**
     * Get current analysis
     */
    getAnalysis() {
        const openings = Array.from(this.openingStats.values()).map(stat => {
            const winRate = stat.wins / stat.games;
            const avgScoreDiff = stat.totalScoreDiff / stat.games;

            // Calculate standard deviation
            const mean = avgScoreDiff;
            const variance = stat.scores.reduce((sum, score) =>
                sum + Math.pow(score - mean, 2), 0) / stat.games;
            const stdDev = Math.sqrt(variance);

            // Statistical significance (rough)
            const significance = stat.games >= 30 ? 'high' :
                                stat.games >= 15 ? 'medium' : 'low';

            return {
                hexId: stat.hexId,
                tileValue: stat.tileValue,
                key: `${stat.hexId}-${stat.tileValue}`,
                games: stat.games,
                winRate: winRate,
                avgScoreDiff: avgScoreDiff,
                stdDev: stdDev,
                wins: stat.wins,
                losses: stat.losses,
                draws: stat.draws,
                significance
            };
        });

        // Sort by win rate (then by games played)
        openings.sort((a, b) => {
            if (Math.abs(a.winRate - b.winRate) > 0.02) {
                return b.winRate - a.winRate;
            }
            return b.games - a.games;
        });

        return {
            totalGames: this.totalGames,
            uniqueOpenings: openings.length,
            openings: openings,
            topOpening: openings[0] || null,
            worstOpening: openings[openings.length - 1] || null
        };
    }

    /**
     * Get hex position analysis
     */
    getHexAnalysis() {
        const hexStats = new Map();

        for (const [key, stat] of this.openingStats) {
            const hexId = stat.hexId;

            if (!hexStats.has(hexId)) {
                hexStats.set(hexId, {
                    hexId,
                    games: 0,
                    totalWinRate: 0,
                    totalScoreDiff: 0,
                    openings: []
                });
            }

            const hex = hexStats.get(hexId);
            hex.games += stat.games;
            hex.totalWinRate += (stat.wins / stat.games) * stat.games;
            hex.totalScoreDiff += stat.totalScoreDiff;
            hex.openings.push({
                tileValue: stat.tileValue,
                games: stat.games,
                winRate: stat.wins / stat.games
            });
        }

        const hexes = Array.from(hexStats.values()).map(hex => ({
            hexId: hex.hexId,
            games: hex.games,
            avgWinRate: hex.totalWinRate / hex.games,
            avgScoreDiff: hex.totalScoreDiff / hex.games,
            openings: hex.openings.sort((a, b) => b.winRate - a.winRate)
        }));

        hexes.sort((a, b) => b.avgWinRate - a.avgWinRate);

        return hexes;
    }

    /**
     * Get tile value analysis
     */
    getTileAnalysis() {
        const tileStats = new Map();

        for (let tile = 1; tile <= 9; tile++) {
            tileStats.set(tile, {
                tileValue: tile,
                games: 0,
                totalWinRate: 0,
                totalScoreDiff: 0
            });
        }

        for (const [key, stat] of this.openingStats) {
            const tile = tileStats.get(stat.tileValue);
            tile.games += stat.games;
            tile.totalWinRate += (stat.wins / stat.games) * stat.games;
            tile.totalScoreDiff += stat.totalScoreDiff;
        }

        const tiles = Array.from(tileStats.values())
            .filter(t => t.games > 0)
            .map(t => ({
                tileValue: t.tileValue,
                games: t.games,
                avgWinRate: t.totalWinRate / t.games,
                avgScoreDiff: t.totalScoreDiff / t.games
            }));

        return tiles;
    }

    /**
     * Export opening book to JSON
     */
    exportOpeningBook() {
        const analysis = this.getAnalysis();

        return {
            metadata: {
                totalGames: this.totalGames,
                mctsSimulations: this.mctsSimulations,
                generatedAt: new Date().toISOString()
            },
            openings: analysis.openings.map(o => ({
                hex: o.hexId,
                tile: o.tileValue,
                winRate: o.winRate,
                avgScore: o.avgScoreDiff,
                games: o.games,
                confidence: o.significance
            })),
            hexAnalysis: this.getHexAnalysis(),
            tileAnalysis: this.getTileAnalysis()
        };
    }

    /**
     * Utility methods
     */
    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    stop() {
        this.isRunning = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export
if (typeof window !== 'undefined') {
    window.OpeningBookGenerator = OpeningBookGenerator;
}
