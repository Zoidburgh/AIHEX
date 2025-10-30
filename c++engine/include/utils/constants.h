#ifndef HEXUKI_CONSTANTS_H
#define HEXUKI_CONSTANTS_H

#include <cstdint>
#include <array>

namespace hexuki {

// ============================================================================
// REAL HEXUKI RULES (extracted from hexuki_game_engine_v2.js)
// ============================================================================

// Game constants
constexpr int NUM_HEXES = 19;
constexpr int NUM_TILES_PER_PLAYER = 9;  // ALWAYS 9 tiles per player (game rule)
constexpr int CENTER_HEX = 9;            // Center hex (starts with value 1)
constexpr int STARTING_TILE = 1;         // Value of starting tile at center
constexpr int MAX_MOVES = 18;            // All non-center hexes

// ============================================================================
// TILE VALUES (configurable for testing variants)
// ============================================================================

// The actual tile values each player has (9 values)
// DEFAULT: Standard 1-9 tiles
constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 2, 3, 4, 5, 6, 7, 8, 9};

// EXAMPLES - uncomment to test variants:
// constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {2, 4, 6, 8, 10, 12, 14, 16, 18};  // Even numbers
// constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 3, 5, 7, 9, 11, 13, 15, 17};   // Odd numbers
// constexpr int TILE_VALUES[NUM_TILES_PER_PLAYER] = {1, 2, 3, 5, 8, 13, 21, 34, 55};   // Fibonacci

// Calculate available tiles mask from TILE_VALUES
constexpr uint16_t calculateTilesMask() {
    uint16_t mask = 0;
    for (int i = 0; i < NUM_TILES_PER_PLAYER; i++) {
        mask |= (1u << TILE_VALUES[i]);
    }
    return mask;
}

constexpr uint16_t ALL_TILES_MASK = calculateTilesMask();

// Helper: Get max tile value (for array sizing)
constexpr int getMaxTileValue() {
    int maxVal = TILE_VALUES[0];
    for (int i = 1; i < NUM_TILES_PER_PLAYER; i++) {
        if (TILE_VALUES[i] > maxVal) maxVal = TILE_VALUES[i];
    }
    return maxVal;
}

constexpr int MAX_TILE_VALUE = getMaxTileValue();

// Players
constexpr int PLAYER_1 = 1;
constexpr int PLAYER_2 = 2;
constexpr int NO_PLAYER = 0;

// ============================================================================
// HEX GRID LAYOUT (row/col coordinates)
// ============================================================================

struct HexPosition {
    int id;
    int row;
    int col;
};

// Hex positions (from JavaScript lines 14-34)
constexpr HexPosition HEX_POSITIONS[NUM_HEXES] = {
    {0,  0, 2},
    {1,  1, 1},
    {2,  1, 3},
    {3,  2, 0},
    {4,  2, 2},
    {5,  2, 4},
    {6,  3, 1},
    {7,  3, 3},
    {8,  4, 0},
    {9,  4, 2},  // CENTER
    {10, 4, 4},
    {11, 5, 1},
    {12, 5, 3},
    {13, 6, 0},
    {14, 6, 2},
    {15, 6, 4},
    {16, 7, 1},
    {17, 7, 3},
    {18, 8, 2}
};

// ============================================================================
// ADJACENCY DIRECTIONS (row/col offsets)
// ============================================================================

struct Direction {
    int dr;  // Row offset
    int dc;  // Column offset
};

// 6 hex directions (from JavaScript lines 117-124)
constexpr Direction HEX_DIRECTIONS[6] = {
    {-2,  0},  // UP
    {-1,  1},  // UPRIGHT
    { 1,  1},  // DOWNRIGHT
    { 2,  0},  // DOWN
    { 1, -1},  // DOWNLEFT
    {-1, -1}   // UPLEFT
};

// ============================================================================
// VERTICAL MIRROR PAIRS (for anti-symmetry rule)
// ============================================================================

// Maps each hex ID to its vertical mirror across center column (col 2)
// (from JavaScript lines 68-88)
constexpr int VERTICAL_MIRROR_PAIRS[NUM_HEXES] = {
    0,   // Hex 0 → 0 (center column)
    2,   // Hex 1 → 2
    1,   // Hex 2 → 1
    5,   // Hex 3 → 5
    4,   // Hex 4 → 4 (center column)
    3,   // Hex 5 → 3
    7,   // Hex 6 → 7
    6,   // Hex 7 → 6
    10,  // Hex 8 → 10
    9,   // Hex 9 → 9 (center column)
    8,   // Hex 10 → 8
    12,  // Hex 11 → 12
    11,  // Hex 12 → 11
    15,  // Hex 13 → 15
    14,  // Hex 14 → 14 (center column)
    13,  // Hex 15 → 13
    17,  // Hex 16 → 17
    16,  // Hex 17 → 16
    18   // Hex 18 → 18 (center column)
};

// Center column hexes (mirror to themselves)
constexpr int CENTER_COLUMN_HEXES[5] = {0, 4, 9, 14, 18};

// ============================================================================
// SCORING CHAINS (diagonal lines)
// ============================================================================

// Player 1 chains: down-right diagonals (\)
// (from JavaScript lines 92-98)
constexpr int P1_CHAIN_COUNT = 5;
constexpr int P1_CHAINS[P1_CHAIN_COUNT][5] = {
    {0, 2, 5, -1, -1},        // 3-hex chain (padded with -1)
    {1, 4, 7, 10, -1},        // 4-hex chain
    {3, 6, 9, 12, 15},        // 5-hex chain (center diagonal)
    {8, 11, 14, 17, -1},      // 4-hex chain
    {13, 16, 18, -1, -1}      // 3-hex chain
};

// Chain lengths for P1
constexpr int P1_CHAIN_LENGTHS[P1_CHAIN_COUNT] = {3, 4, 5, 4, 3};

// Player 2 chains: down-left diagonals (/)
// (from JavaScript lines 101-107)
constexpr int P2_CHAIN_COUNT = 5;
constexpr int P2_CHAINS[P2_CHAIN_COUNT][5] = {
    {0, 1, 3, -1, -1},        // 3-hex chain
    {2, 4, 6, 8, -1},         // 4-hex chain
    {5, 7, 9, 11, 13},        // 5-hex chain (center diagonal)
    {10, 12, 14, 16, -1},     // 4-hex chain
    {15, 17, 18, -1, -1}      // 3-hex chain
};

// Chain lengths for P2
constexpr int P2_CHAIN_LENGTHS[P2_CHAIN_COUNT] = {3, 4, 5, 4, 3};

// ============================================================================
// CHAIN LENGTH CONSTRAINT
// ============================================================================

// Chain starters for detecting continuous occupied chains in any direction
// (from JavaScript lines 180-196)
struct ChainStarter {
    int startHex;
    Direction dir;
};

constexpr ChainStarter CHAIN_STARTERS[15] = {
    {0,  {1, -1}},  // DOWNLEFT
    {0,  {2,  0}},  // DOWN
    {0,  {1,  1}},  // DOWNRIGHT
    {1,  {2,  0}},  // DOWN
    {1,  {1,  1}},  // DOWNRIGHT
    {2,  {1, -1}},  // DOWNLEFT
    {2,  {2,  0}},  // DOWN
    {3,  {2,  0}},  // DOWN
    {3,  {1,  1}},  // DOWNRIGHT
    {5,  {1, -1}},  // DOWNLEFT
    {5,  {2,  0}},  // DOWN
    {8,  {1,  1}},  // DOWNRIGHT
    {10, {1, -1}},  // DOWNLEFT
    {13, {1,  1}},  // DOWNRIGHT
    {15, {1, -1}}   // DOWNLEFT
};

} // namespace hexuki

#endif // HEXUKI_CONSTANTS_H
