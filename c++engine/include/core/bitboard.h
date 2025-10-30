#ifndef HEXUKI_BITBOARD_H
#define HEXUKI_BITBOARD_H

#include <cstdint>
#include <vector>
#include <array>
#include "core/move.h"
#include "utils/constants.h"

namespace hexuki {

/**
 * Bitboard representation of REAL Hexuki game state
 *
 * REAL RULES (from hexuki_game_engine_v2.js):
 * - ONE tile per hex (not multiple)
 * - Each player has tiles [1,2,3,4,5,6,7,8,9], use ONCE
 * - Scoring: Multiply tile values along 5 diagonal chains per player
 * - Move rules: adjacent, chain length constraint, anti-symmetry
 */
class HexukiBitboard {
public:
    // Constructors
    HexukiBitboard();
    HexukiBitboard(const HexukiBitboard& other) = default;
    HexukiBitboard& operator=(const HexukiBitboard& other) = default;

    // Game state queries
    bool isHexOccupied(int hexId) const;
    int getTileValue(int hexId) const;        // Returns 0 if empty, 1-9 if occupied
    int getCurrentPlayer() const { return currentPlayer; }
    bool isGameOver() const;

    // Tile availability
    bool isTileAvailable(int player, int tileValue) const;
    std::vector<int> getAvailableTiles(int player) const;

    // Scoring (REAL chain-based multiplication)
    int getScore(int player) const;

    // Move operations
    std::vector<Move> getValidMoves() const;
    bool isValidMove(const Move& move) const;
    void makeMove(const Move& move);
    void unmakeMove(const Move& move);  // Undo move (for minimax)

    // Utility
    void reset();  // Reset to initial game state
    uint64_t getHash() const { return zobristHash; }  // For transposition table

    // Puzzle setup (for loading partial positions)
    void setHexValue(int hexId, int tileValue);  // Place a tile on a hex
    void removeHexValue(int hexId);              // Remove a tile from a hex
    void setAvailableTiles(int player, const std::vector<int>& tiles);  // Set player's available tiles
    void setCurrentPlayer(int player) { currentPlayer = player; }
    void clearBoard();  // Clear all tiles (but keep metadata)

    // Load position from string notation
    // Format: "h0:1,h4:5,h9:1|p1:2,3,4|p2:6,7,8|turn:1"
    //   h0:1 = hex 0 has tile value 1
    //   p1:2,3,4 = player 1 has tiles 2,3,4 available
    //   turn:1 = player 1 to move
    void loadPosition(const std::string& position);
    std::string savePosition() const;  // Save current position to string

    // Debug
    void print() const;  // Print board state (for debugging)
    std::string toNotation() const;  // Convert to move sequence string

private:
    // ========================================================================
    // Core state (bitboards + tile tracking)
    // ========================================================================

    // Board state: which hexes have tiles (19 bits)
    uint32_t hexOccupied;

    // Tile values at each hex (0 = empty, 1-9 = tile value)
    // Using 4 bits per hex (0-15 range, we use 0-9)
    uint8_t hexValues[NUM_HEXES];

    // Available tiles for each player (array-based to support duplicates)
    // Can now handle asymmetric tiles like [1,1,1,1,1,1,1,1,1] vs [2,2,2,2,2,2,2,2,2]
    std::vector<int> p1AvailableTiles;  // e.g. [1,2,3,4,5,6,7,8,9] or [1,1,1,1,1,1,1,1,1]
    std::vector<int> p2AvailableTiles;

    // Metadata
    int currentPlayer;  // PLAYER_1 or PLAYER_2

    // Anti-symmetry tracking (optimization)
    bool symmetryStillPossible;
    bool tilesAreIdentical;  // Only enforce anti-symmetry if both players have identical starting tiles

    // Zobrist hashing (for transposition table)
    uint64_t zobristHash;

    // ========================================================================
    // Internal helpers
    // ========================================================================

    // Adjacency
    std::vector<int> getAdjacentHexes(int hexId) const;
    bool hasAdjacentOccupied(int hexId) const;

    // Move legality (REAL rules)
    bool isMoveLegal(int hexId) const;  // Check position legality
    bool checkChainLengthConstraint(int hexId) const;  // Chain length rule
    bool isBoardMirrored() const;  // Anti-symmetry check

    // Chain info structure (for affected chain tracking)
    struct ChainInfo {
        int length;
        std::vector<int> hexIds;
    };

    // Chain detection (for chain length constraint)
    std::vector<int> getChainLengthsFromStart(int startHex, const Direction& dir) const;
    std::vector<int> getAllChainLengths() const;
    void getFirstAndSecondChainLengths(int& first, int& second) const;
    std::vector<ChainInfo> getAllChainsWithMembers() const;  // Get chains with hex IDs

    // Scoring helpers
    int calculatePlayerScore(int player) const;
    int calculateChainScore(const int* chain, int chainLength) const;

    // Zobrist hashing
    void updateZobristHash(const Move& move);

    // Helper: find hex at row/col
    int findHexAt(int row, int col) const;
};

} // namespace hexuki

#endif // HEXUKI_BITBOARD_H
