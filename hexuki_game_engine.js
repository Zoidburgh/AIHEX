/**
 * Hexuki Headless Game Engine
 * Pure game logic without any UI - optimized for AI training
 */

class HexukiGameEngine {
    constructor() {
        this.reset();
    }

    reset() {
        // Create board - 19 hexes with row/col coordinates (same as main game)
        const positions = [
            {id: 0, row: 0, col: 2},
            {id: 1, row: 1, col: 1},
            {id: 2, row: 1, col: 3},
            {id: 3, row: 2, col: 0},
            {id: 4, row: 2, col: 2},
            {id: 5, row: 2, col: 4},
            {id: 6, row: 3, col: 1},
            {id: 7, row: 3, col: 3},
            {id: 8, row: 4, col: 0},
            {id: 9, row: 4, col: 2},
            {id: 10, row: 4, col: 4},
            {id: 11, row: 5, col: 1},
            {id: 12, row: 5, col: 3},
            {id: 13, row: 6, col: 0},
            {id: 14, row: 6, col: 2},
            {id: 15, row: 6, col: 4},
            {id: 16, row: 7, col: 1},
            {id: 17, row: 7, col: 3},
            {id: 18, row: 8, col: 2}
        ];

        this.board = positions.map(pos => ({
            id: pos.id,
            row: pos.row,
            col: pos.col,
            value: null,
            owner: null
        }));

        // Center hex starts with 1
        this.board[9].value = 1;
        this.board[9].owner = 'neutral';

        // Each player has tiles 1-9
        this.player1Tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.player2Tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        // Track which tile positions have been used
        this.player1UsedPositions = new Set();
        this.player2UsedPositions = new Set();

        this.currentPlayer = 1;
        this.gameEnded = false;
        this.moveCount = 0;

        // Chain definitions - SYMMETRIC straight diagonals
        // Player 1 chains: down-right diagonals (\)
        this.player1Chains = [
            [0, 2, 5],           // 3-hex chain
            [1, 4, 7, 10],       // 4-hex chain
            [3, 6, 9, 12, 15],   // 5-hex chain (center diagonal, includes starting hex 9)
            [8, 11, 14, 17],     // 4-hex chain
            [13, 16, 18]         // 3-hex chain
        ];

        // Player 2 chains: down-left diagonals (/)
        this.player2Chains = [
            [0, 1, 3],           // 3-hex chain
            [2, 4, 6, 8],        // 4-hex chain
            [5, 7, 9, 11, 13],   // 5-hex chain (center diagonal, includes starting hex 9)
            [10, 12, 14, 16],    // 4-hex chain (FIXED: was [12, 14, 16, 10])
            [15, 17, 18]         // 3-hex chain
        ];
    }

    /**
     * Get adjacent hex IDs for a given hex (dynamic calculation using row/col)
     * Same logic as the main game
     */
    getAdjacentHexes(hexId) {
        const hex = this.board[hexId];
        const adjacent = [];

        // Hexagonal grid directions (same as main game)
        const directions = [
            {dr: -2, dc: 0},   // UP
            {dr: -1, dc: 1},   // UPRIGHT
            {dr: 1, dc: 1},    // DOWNRIGHT
            {dr: 2, dc: 0},    // DOWN
            {dr: 1, dc: -1},   // DOWNLEFT
            {dr: -1, dc: -1}   // UPLEFT
        ];

        directions.forEach(({dr, dc}) => {
            const adjHex = this.board.find(h =>
                h.row === hex.row + dr && h.col === hex.col + dc
            );
            if (adjHex) {
                adjacent.push(adjHex.id);
            }
        });

        return adjacent;
    }

    /**
     * Check if a hex has an adjacent occupied hex
     */
    hasAdjacentOccupied(hexId) {
        const adjacentHexes = this.getAdjacentHexes(hexId);
        return adjacentHexes.some(adjId => this.board[adjId].value !== null);
    }

    /**
     * Get chain lengths from a starting hex in a direction
     */
    getChainLengthsFromStart(startId, direction) {
        const lengths = [];
        let currentLength = 0;
        let current = startId;

        while (current !== null) {
            const hex = this.board[current];
            if (!hex) break;

            if (hex.value !== null) {
                currentLength++;
            } else if (currentLength > 0) {
                // Hit empty cell, record current chain and reset
                lengths.push(currentLength);
                currentLength = 0;
            }

            // Move to next cell in direction
            const nextHex = this.board.find(h =>
                h.row === hex.row + direction.dr && h.col === hex.col + direction.dc
            );
            current = nextHex ? nextHex.id : null;
        }

        // Record final chain if we ended on occupied cells
        if (currentLength > 0) {
            lengths.push(currentLength);
        }

        return lengths;
    }

    /**
     * Calculate ALL chain lengths - counts consecutive OCCUPIED hexes (any player)
     * This is used for the chain length constraint, NOT for scoring
     * Checks ALL straight lines in 3 directions (same as real game)
     */
    calculateChainLengths(playerNum) {
        // Note: playerNum is ignored - we count ALL occupied hexes regardless of owner
        const chainLengths = [];

        // All possible chain starters and directions (same as RulesV1.java)
        const chainStarters = [
            {start: 0, dir: {dr: 1, dc: -1}}, // DOWNLEFT
            {start: 0, dir: {dr: 2, dc: 0}},  // DOWN
            {start: 0, dir: {dr: 1, dc: 1}},  // DOWNRIGHT
            {start: 1, dir: {dr: 2, dc: 0}},  // DOWN
            {start: 1, dir: {dr: 1, dc: 1}},  // DOWNRIGHT
            {start: 2, dir: {dr: 1, dc: -1}}, // DOWNLEFT
            {start: 2, dir: {dr: 2, dc: 0}},  // DOWN
            {start: 3, dir: {dr: 2, dc: 0}},  // DOWN
            {start: 3, dir: {dr: 1, dc: 1}},  // DOWNRIGHT
            {start: 5, dir: {dr: 1, dc: -1}}, // DOWNLEFT
            {start: 5, dir: {dr: 2, dc: 0}},  // DOWN
            {start: 8, dir: {dr: 1, dc: 1}},  // DOWNRIGHT
            {start: 10, dir: {dr: 1, dc: -1}}, // DOWNLEFT
            {start: 13, dir: {dr: 1, dc: 1}}, // DOWNRIGHT
            {start: 15, dir: {dr: 1, dc: -1}} // DOWNLEFT
        ];

        chainStarters.forEach(({start, dir}) => {
            const lengths = this.getChainLengthsFromStart(start, dir);
            chainLengths.push(...lengths);
        });

        return chainLengths;
    }

    /**
     * Check chain length constraint after placing at hexId
     */
    checkChainLengthConstraint(hexId) {
        // Temporarily place tile to check
        const originalValue = this.board[hexId].value;
        const originalOwner = this.board[hexId].owner;
        this.board[hexId].value = 999; // Dummy value to mark as occupied
        this.board[hexId].owner = 'temp';

        const lengths = this.calculateChainLengths(this.currentPlayer);
        lengths.sort((a, b) => b - a);

        const longest = lengths[0];
        const secondLongest = lengths[1];

        // Restore original
        this.board[hexId].value = originalValue;
        this.board[hexId].owner = originalOwner;

        // Longest can be at most 1 longer than second longest
        return (longest - secondLongest) <= 1;
    }

    /**
     * Check if a move is legal
     */
    isMoveLegal(hexId) {
        // Hex must be empty
        if (this.board[hexId].value !== null) {
            return false;
        }

        // Must be adjacent to an occupied hex (including the center which starts occupied)
        if (!this.hasAdjacentOccupied(hexId)) {
            return false;
        }

        // Check chain length constraint
        if (!this.checkChainLengthConstraint(hexId)) {
            return false;
        }

        return true;
    }

    /**
     * Make a move (place a tile)
     * Returns true if successful, false if illegal
     */
    makeMove(hexId, tileValue) {
        // Validate move
        if (!this.isMoveLegal(hexId)) {
            return false;
        }

        // Validate tile is available
        const availableTiles = this.currentPlayer === 1 ? this.player1Tiles : this.player2Tiles;
        if (!availableTiles.includes(tileValue)) {
            return false;
        }

        // Place the tile
        this.board[hexId].value = tileValue;
        this.board[hexId].owner = `player${this.currentPlayer}`;

        // Remove tile from available tiles
        if (this.currentPlayer === 1) {
            const idx = this.player1Tiles.indexOf(tileValue);
            this.player1Tiles.splice(idx, 1);
        } else {
            const idx = this.player2Tiles.indexOf(tileValue);
            this.player2Tiles.splice(idx, 1);
        }

        this.moveCount++;

        // Check if game ended (all 18 tiles placed)
        if (this.moveCount >= 18) {
            this.gameEnded = true;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        return true;
    }

    /**
     * Calculate scores for both players
     */
    calculateScores() {
        const p1Score = this.calculatePlayerScore(1);
        const p2Score = this.calculatePlayerScore(2);

        return {
            player1: p1Score,
            player2: p2Score
        };
    }

    /**
     * Calculate score for a specific player
     */
    calculatePlayerScore(playerNum) {
        const chains = playerNum === 1 ? this.player1Chains : this.player2Chains;
        let totalScore = 0;

        for (let chain of chains) {
            let chainProduct = 1;

            for (let hexId of chain) {
                const hex = this.board[hexId];
                if (hex.value !== null) {
                    chainProduct *= hex.value;
                }
            }

            totalScore += chainProduct;
        }

        return totalScore;
    }

    /**
     * Get all valid moves for current player
     */
    getAllValidMoves() {
        const moves = [];
        const availableTiles = this.currentPlayer === 1 ? this.player1Tiles : this.player2Tiles;

        for (let hexId = 0; hexId < 19; hexId++) {
            if (this.board[hexId].value !== null) continue;

            if (this.isMoveLegal(hexId)) {
                // Try each available tile
                for (let tileValue of availableTiles) {
                    moves.push({ hexId, tileValue });
                }
            }
        }

        return moves;
    }

    /**
     * Get game state for hashing
     */
    getState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            player1Tiles: [...this.player1Tiles],
            player2Tiles: [...this.player2Tiles],
            player1UsedPositions: this.player1UsedPositions,
            player2UsedPositions: this.player2UsedPositions
        };
    }
}

// Export for use in AI trainer
if (typeof window !== 'undefined') {
    window.HexukiGameEngine = HexukiGameEngine;
}
