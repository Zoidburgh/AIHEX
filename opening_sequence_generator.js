/**
 * Opening Sequence Generator - Layer by Layer Analysis
 *
 * Builds complete opening theory progressively:
 * Layer 1: P1's first move (import existing)
 * Layer 2: P2's responses to top 10 P1 openings
 * Layer 3: P1's third move
 * Etc.
 */

class OpeningSequenceGenerator {
    constructor(mctsSimsEvaluation = 1000, mctsSimsPlayou = 300) {
        this.mctsSimsEvaluation = mctsSimsEvaluation;
        this.mctsSimsPlayout = mctsSimsPlayou;

        this.layer1Data = null;  // Imported from opening book
        this.currentLayer = 1;
        this.layerData = new Map();  // layerNum -> data

        this.isRunning = false;
        this.isPaused = false;
        this.totalGamesThisLayer = 0;

        this.callbacks = {
            onProgress: null,
            onSequenceComplete: null,
            onLayerComplete: null
        };
    }

    /**
     * Load Layer 1 data from existing opening book
     */
    loadLayer1(openingBookJSON) {
        this.layer1Data = {
            layer: 1,
            totalGames: openingBookJSON.metadata.totalGames,
            allOpenings: openingBookJSON.openings,
            top10: openingBookJSON.openings.slice(0, 10)
        };

        this.layerData.set(1, this.layer1Data);
        this.currentLayer = 1;

        return this.layer1Data;
    }

    /**
     * Generate Layer 2: P2 responses to top 10 P1 openings
     */
    async generateLayer2(gamesPerSequence = 20) {
        if (!this.layer1Data) {
            throw new Error('Must load Layer 1 data first');
        }

        this.currentLayer = 2;
        this.isRunning = true;
        this.isPaused = false;
        this.totalGamesThisLayer = 0;

        const layer2Data = {
            layer: 2,
            parentOpenings: [],
            totalSequences: 0,
            totalGames: 0
        };

        const top10 = this.layer1Data.top10;

        // For each top 10 P1 opening
        for (let i = 0; i < top10.length; i++) {
            if (!this.isRunning) break;

            const p1Opening = top10[i];

            const parentData = {
                rank: i + 1,
                p1Move: { hex: p1Opening.hex, tile: p1Opening.tile },
                p1WinRateLayer1: p1Opening.winRate,
                p1GamesLayer1: p1Opening.games,
                p2Responses: [],
                bestP2Counters: []
            };

            // Test all possible P2 responses
            const p2Responses = this.getAllP2Responses(p1Opening);

            for (let j = 0; j < p2Responses.length; j++) {
                if (!this.isRunning) break;

                while (this.isPaused && this.isRunning) {
                    await this.sleep(500);
                }

                const p2Response = p2Responses[j];

                // Evaluate this sequence
                const result = await this.evaluateSequence(
                    [p1Opening, p2Response],
                    gamesPerSequence
                );

                parentData.p2Responses.push({
                    p2Move: p2Response,
                    p1WinRate: result.p1WinRate,
                    p2WinRate: 1 - result.p1WinRate,
                    avgScore: result.avgScore,
                    games: result.games,
                    sequenceNotation: this.getSequenceNotation([p1Opening, p2Response])
                });

                layer2Data.totalGames += result.games;
                this.totalGamesThisLayer += result.games;
                layer2Data.totalSequences++;

                if (this.callbacks.onSequenceComplete) {
                    this.callbacks.onSequenceComplete({
                        layer: 2,
                        p1Opening: p1Opening,
                        p2Response: p2Response,
                        result: result,
                        progress: {
                            parentNum: i + 1,
                            totalParents: top10.length,
                            responseNum: j + 1,
                            totalResponses: p2Responses.length,
                            totalGames: this.totalGamesThisLayer
                        }
                    });
                }

                // Yield to browser
                if (j % 5 === 0) {
                    await this.sleep(10);
                }
            }

            // Sort P2 responses by P2 win rate (descending = best for P2)
            parentData.p2Responses.sort((a, b) => b.p2WinRate - a.p2WinRate);

            // Keep only top 5 as "best counters" for layer 3
            parentData.bestP2Counters = parentData.p2Responses.slice(0, 5);

            layer2Data.parentOpenings.push(parentData);
        }

        this.isRunning = false;
        this.layerData.set(2, layer2Data);

        if (this.callbacks.onLayerComplete) {
            this.callbacks.onLayerComplete(layer2Data);
        }

        return layer2Data;
    }

    /**
     * Get all legal P2 responses to a P1 opening
     */
    getAllP2Responses(p1Opening) {
        const game = new HexukiGameEngineV2();

        // Apply P1's opening
        game.makeMove(p1Opening.hex, p1Opening.tile);

        // Get all valid P2 moves
        const allMoves = game.getAllValidMoves();

        return allMoves;
    }

    /**
     * Evaluate a move sequence by playing games
     */
    async evaluateSequence(moveSequence, numGames) {
        let p1Wins = 0;
        let totalScoreDiff = 0;

        for (let gameNum = 0; gameNum < numGames; gameNum++) {
            const game = new HexukiGameEngineV2();

            // Apply the sequence
            for (const move of moveSequence) {
                game.makeMove(move.hexId || move.hex, move.tileValue || move.tile);
            }

            // Play out the rest with MCTS
            const fastAI = new MCTSPlayer(this.mctsSimsPlayout);

            while (!game.gameEnded) {
                const result = fastAI.getBestMove(game);
                game.makeMove(result.move.hexId, result.move.tileValue);

                // Periodic yielding
                if (game.moveCount % 6 === 0) {
                    await this.sleep(1);
                }
            }

            const scores = game.calculateScores();
            const scoreDiff = scores.player1 - scores.player2;

            totalScoreDiff += scoreDiff;
            if (scoreDiff > 0) p1Wins++;
        }

        return {
            p1WinRate: p1Wins / numGames,
            avgScore: totalScoreDiff / numGames,
            games: numGames
        };
    }

    /**
     * Get sequence notation (like chess notation)
     */
    getSequenceNotation(moveSequence) {
        return moveSequence.map(move =>
            `${move.hexId || move.hex}-${move.tileValue || move.tile}`
        ).join(', ');
    }

    /**
     * Generate Layer 3: P1's third move
     */
    async generateLayer3(gamesPerSequence = 15) {
        const layer2 = this.layerData.get(2);
        if (!layer2) {
            throw new Error('Must complete Layer 2 first');
        }

        this.currentLayer = 3;
        this.isRunning = true;
        this.totalGamesThisLayer = 0;

        const layer3Data = {
            layer: 3,
            sequences: [],
            totalGames: 0
        };

        // For each P1 opening's top 5 P2 counters
        for (const parent of layer2.parentOpenings) {
            if (!this.isRunning) break;

            for (const p2Counter of parent.bestP2Counters) {
                if (!this.isRunning) break;

                // Get all legal P1 third moves
                const game = new HexukiGameEngineV2();
                game.makeMove(parent.p1Move.hex, parent.p1Move.tile);
                game.makeMove(p2Counter.p2Move.hexId, p2Counter.p2Move.tileValue);

                const p1ThirdMoves = game.getAllValidMoves();

                const sequenceData = {
                    move1: parent.p1Move,
                    move2: p2Counter.p2Move,
                    p1ThirdMoves: [],
                    bestP1Continuations: []
                };

                // Test each P1 third move
                for (let i = 0; i < p1ThirdMoves.length; i++) {
                    if (!this.isRunning) break;

                    while (this.isPaused && this.isRunning) {
                        await this.sleep(500);
                    }

                    const p1ThirdMove = p1ThirdMoves[i];

                    const result = await this.evaluateSequence(
                        [parent.p1Move, p2Counter.p2Move, p1ThirdMove],
                        gamesPerSequence
                    );

                    sequenceData.p1ThirdMoves.push({
                        move: p1ThirdMove,
                        p1WinRate: result.p1WinRate,
                        avgScore: result.avgScore,
                        games: result.games
                    });

                    layer3Data.totalGames += result.games;
                    this.totalGamesThisLayer += result.games;

                    if (this.callbacks.onProgress) {
                        this.callbacks.onProgress({
                            layer: 3,
                            totalGames: this.totalGamesThisLayer
                        });
                    }

                    if (i % 5 === 0) {
                        await this.sleep(10);
                    }
                }

                // Sort and keep top 5
                sequenceData.p1ThirdMoves.sort((a, b) => b.p1WinRate - a.p1WinRate);
                sequenceData.bestP1Continuations = sequenceData.p1ThirdMoves.slice(0, 5);

                layer3Data.sequences.push(sequenceData);
            }
        }

        this.isRunning = false;
        this.layerData.set(3, layer3Data);

        if (this.callbacks.onLayerComplete) {
            this.callbacks.onLayerComplete(layer3Data);
        }

        return layer3Data;
    }

    /**
     * Export all layer data
     */
    exportAllLayers() {
        const allData = {
            metadata: {
                layers: this.currentLayer,
                generatedAt: new Date().toISOString(),
                mctsSimsEvaluation: this.mctsSimsEvaluation,
                mctsSimsPlayout: this.mctsSimsPlayout
            },
            layers: {}
        };

        for (const [layerNum, data] of this.layerData) {
            allData.layers[`layer${layerNum}`] = data;
        }

        return allData;
    }

    /**
     * Export specific layer
     */
    exportLayer(layerNum) {
        return this.layerData.get(layerNum);
    }

    /**
     * Control methods
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
    window.OpeningSequenceGenerator = OpeningSequenceGenerator;
}
