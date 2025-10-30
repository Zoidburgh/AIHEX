#ifndef HEXUKI_ZOBRIST_H
#define HEXUKI_ZOBRIST_H

#include <cstdint>
#include "utils/constants.h"

namespace hexuki {

// Forward declaration
class HexukiBitboard;

/**
 * Zobrist hashing for game positions
 *
 * Used for transposition tables in minimax:
 * - Each position gets a unique 64-bit hash
 * - Same position = same hash (deterministic)
 * - Fast incremental updates (XOR operations)
 */
class Zobrist {
public:
    // Initialize random hash tables (call once at program start)
    static void initialize();

    // Get hash for a tile placement
    static uint64_t getTileHash(int hexId, int tileValue);

    // Get hash for player-to-move
    static uint64_t getPlayerHash(int player);

    // Calculate full hash for a board state
    static uint64_t hash(const HexukiBitboard& board);

private:
    // Hash tables (initialized with random numbers)
    // Sized for MAX_TILE_VALUE to handle any tile values (e.g., if using tiles 2,4,6,8... up to 18)
    static uint64_t tileHashes[NUM_HEXES][MAX_TILE_VALUE + 1];  // [hexId][tileValue]
    static uint64_t playerHashes[2];                             // [player-1]

    // Tile count hashes for available tiles (supports duplicates)
    // tileCountHashes[player][tileValue][count] = hash for having 'count' of 'tileValue' for 'player'
    // player: 0 = P1, 1 = P2
    // tileValue: 1-9
    // count: 0-9 (max 9 of any tile value)
    static uint64_t tileCountHashes[2][MAX_TILE_VALUE + 1][10];

    static bool initialized;
};

} // namespace hexuki

#endif // HEXUKI_ZOBRIST_H
