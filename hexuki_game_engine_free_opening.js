/**
 * Hexuki Headless Game Engine - Free Opening Variant
 *
 * RULE CHANGE: P1's first move can be placed ANYWHERE on the board (bypassing adjacency)
 * - Move 1 (P1): Can place on any of the 18 empty hexes
 * - All other moves: Normal adjacency, chain length, and antisymmetry rules apply
 */

class HexukiGameEngineFreeOpening {
    constructor() {
        this.reset();
    }

    reset() {
        // EXACT copy from real game (lines 2314-2350)
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

        this.board = [];
        positions.forEach(pos => {
            this.board.push({
                id: pos.id,
                row: pos.row,
                col: pos.col,
                value: null,
                owner: null
            });
        });

        // Set center tile (id: 9) with value 1
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

        // Anti-symmetry tracking: once symmetry is broken, no need to check again
        this.symmetryStillPossible = true;

        // Vertical mirror pairs (for anti-symmetry rule)
        // Maps each hex ID to its vertical mirror across the center column (col 2)
        this.verticalMirrorPairs = {
            0: 0,   // Center column (col 2) - mirrors to itself
            1: 2,   // Col 1 ↔ Col 3
            2: 1,
            3: 5,   // Col 0 ↔ Col 4
            4: 4,   // Center column
            5: 3,
            6: 7,   // Col 1 ↔ Col 3
            7: 6,
            8: 10,  // Col 0 ↔ Col 4
            9: 9,   // Center column
            10: 8,
            11: 12, // Col 1 ↔ Col 3
            12: 11,
            13: 15, // Col 0 ↔ Col 4
            14: 14, // Center column
            15: 13,
            16: 17, // Col 1 ↔ Col 3
            17: 16,
            18: 18  // Center column
        };

        // Scoring chain definitions - SYMMETRIC straight diagonals
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
     * EXACT copy from real game (lines 3755-3779)
     */
    getAdjacentHexes(hexId) {
        const hex = this.board[hexId];
        const adjacent = [];

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
     * EXACT copy from real game (lines 3852-3882)
     */
    getChainLengthsFromStart(boardState, startId, direction) {
        const lengths = [];
        let currentLength = 0;
        let current = startId;

        while (current !== null) {
            const hex = boardState.find(h => h.id === current);
            if (!hex) break;

            if (hex.value !== null) {
                currentLength++;
            } else if (currentLength > 0) {
                // Hit empty cell, record current chain and reset
                lengths.push(currentLength);
                currentLength = 0;
            }

            // Move to next cell in direction
            const nextHex = boardState.find(h =>
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
     * EXACT copy from real game (lines 3822-3850)
     */
    getAllChainLengthsForBoard(boardState) {
        const chainLengths = [];

        // All possible chain starters and directions from RulesV1.java
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
            const lengths = this.getChainLengthsFromStart(boardState, start, dir);
            chainLengths.push(...lengths);
        });

        return chainLengths;
    }

    /**
     * EXACT copy from real game (lines 3806-3820)
     */
    getFirstAndSecondChainLengthsForBoard(boardState) {
        const allChainLengths = this.getAllChainLengthsForBoard(boardState);
        let first = 0, second = 0;

        allChainLengths.forEach(length => {
            if (length > first) {
                second = first;
                first = length;
            } else if (length > second) {
                second = length;
            }
        });

        return { first, second };
    }

    /**
     * EXACT copy from real game (lines 3781-3800)
     */
    checkChainLengthConstraint(hexId) {
        // Order 1 games have no length constraint
        if (this.board.length === 7) return true;

        // Make a test board with the proposed move
        const testBoard = JSON.parse(JSON.stringify(this.board));
        testBoard[hexId].value = 1; // Use dummy value for testing
        testBoard[hexId].owner = `player${this.currentPlayer}`;

        // Get chain lengths AFTER the hypothetical placement
        const newChainLengths = this.getFirstAndSecondChainLengthsForBoard(testBoard);

        // Rule: longest chain can be at most 1 longer than second longest
        if (newChainLengths.first > newChainLengths.second + 1) {
            return false;
        }

        return true;
    }

    /**
     * Check if a hex has an adjacent occupied hex
     */
    hasAdjacentOccupied(hexId) {
        const adjacentHexes = this.getAdjacentHexes(hexId);
        return adjacentHexes.some(adjId => this.board[adjId].value !== null);
    }

    /**
     * Modified for Free Opening variant
     * P1's first move (moveCount === 0) can be placed ANYWHERE
     */
    isMoveLegal(hexId) {
        const hex = this.board[hexId];

        // Check if hex is empty
        if (hex.value !== null) {
            return false;
        }

        // FREE OPENING RULE: P1's first move can be placed anywhere
        if (this.moveCount === 0) {
            return true; // No adjacency or chain length check needed
        }

        // For all other moves: normal rules apply
        // Check if adjacent to an occupied hex
        const adjacentHexes = this.getAdjacentHexes(hexId);
        const hasAdjacentOccupied = adjacentHexes.some(id =>
            this.board[id] && this.board[id].value !== null
        );

        if (!hasAdjacentOccupied) return false;

        // Check chain length constraint
        const chainOk = this.checkChainLengthConstraint(hexId);

        return chainOk;
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

        // Place the tile TEMPORARILY to test symmetry
        this.board[hexId].value = tileValue;
        this.board[hexId].owner = `player${this.currentPlayer}`;

        // Anti-symmetry rule: reject if board becomes perfectly mirrored
        // Only check starting from move 2 (moveCount >= 1 before increment)
        // Only check if symmetry is still possible (optimization)
        if (this.symmetryStillPossible && this.moveCount >= 1 && this.isBoardMirrored()) {
            // UNDO the placement - move creates illegal symmetry
            this.board[hexId].value = null;
            this.board[hexId].owner = null;
            return false;
        }

        // Move is valid - finalize it
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
     * Based on real game logic (lines 4336-4390)
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
     * Check if board VALUES are perfectly mirrored vertically
     * Returns true if the board is symmetric (which makes the position ILLEGAL)
     *
     * OPTIMIZATION: Sets symmetryStillPossible = false if any mismatch found,
     * permanently disabling future checks for this game.
     */
    isBoardMirrored() {
        // If symmetry already broken, no need to check
        if (!this.symmetryStillPossible) {
            return false;
        }

        // Center column hexes are ON the symmetry line - skip them
        const centerHexes = [0, 4, 9, 14, 18];

        // Check if board is currently symmetric
        // A board is symmetric if ALL non-center pairs are either:
        // - both empty, OR
        // - both have the same value
        let isCurrentlySymmetric = true;

        for (let hexId = 0; hexId < 19; hexId++) {
            if (centerHexes.includes(hexId)) continue;

            const mirrorHexId = this.verticalMirrorPairs[hexId];
            const val1 = this.board[hexId].value;
            const val2 = this.board[mirrorHexId].value;

            // If one is empty and the other isn't, not currently symmetric
            if ((val1 === null) !== (val2 === null)) {
                isCurrentlySymmetric = false;
                break;
            }

            // If both occupied but different values, not symmetric AND never will be
            if (val1 !== null && val2 !== null && val1 !== val2) {
                // ONLY disable permanently when both are occupied with different values
                // This means symmetry is IMPOSSIBLE going forward
                this.symmetryStillPossible = false;
                return false;
            }
        }

        return isCurrentlySymmetric;
    }

    /**
     * Get all valid moves for current player
     */
    getAllValidMoves() {
        const moves = [];
        const availableTiles = this.currentPlayer === 1 ? this.player1Tiles : this.player2Tiles;

        // Early optimization: if symmetry already broken, skip symmetry checks
        const needSymmetryCheck = this.symmetryStillPossible && this.moveCount >= 1;

        for (let hexId = 0; hexId < 19; hexId++) {
            if (this.board[hexId].value !== null) continue;

            if (this.isMoveLegal(hexId)) {
                // Try each available tile
                for (let tileValue of availableTiles) {
                    // Check if this move would create symmetry
                    if (needSymmetryCheck) {
                        // Save current state
                        const prevValue = this.board[hexId].value;
                        const prevOwner = this.board[hexId].owner;
                        const prevSymmetryPossible = this.symmetryStillPossible;

                        // Place tile temporarily
                        this.board[hexId].value = tileValue;
                        this.board[hexId].owner = `player${this.currentPlayer}`;

                        // Check symmetry
                        const wouldBeSymmetric = this.isBoardMirrored();

                        // Restore everything
                        this.board[hexId].value = prevValue;
                        this.board[hexId].owner = prevOwner;
                        this.symmetryStillPossible = prevSymmetryPossible;

                        // Only add move if it doesn't create symmetry
                        if (!wouldBeSymmetric) {
                            moves.push({ hexId, tileValue });
                        }
                    } else {
                        // No symmetry check needed
                        moves.push({ hexId, tileValue });
                    }
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
    window.HexukiGameEngineFreeOpening = HexukiGameEngineFreeOpening;
}
