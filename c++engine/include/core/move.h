#ifndef HEXUKI_MOVE_H
#define HEXUKI_MOVE_H

#include <string>
#include <cstdint>
#include "utils/constants.h"

namespace hexuki {

/**
 * Represents a single move in Hexuki
 * A move consists of placing a tile with a specific value on a hex
 */
struct Move {
    int hexId;       // Hex position (0-18)
    int tileValue;   // Tile value (1-9)

    // Default constructor
    Move() : hexId(-1), tileValue(0) {}

    // Constructor
    Move(int hex, int tile) : hexId(hex), tileValue(tile) {}

    // Check if move is valid (not default-constructed)
    bool isValid() const {
        if (hexId < 0 || hexId >= NUM_HEXES) return false;

        // Check if tileValue is one of the valid tile values
        for (int i = 0; i < NUM_TILES_PER_PLAYER; i++) {
            if (tileValue == TILE_VALUES[i]) return true;
        }
        return false;
    }

    // Convert to string notation (e.g., "h6t5")
    std::string toString() const {
        return "h" + std::to_string(hexId) + "t" + std::to_string(tileValue);
    }

    // Parse from string notation (e.g., "h6t5")
    static Move fromString(const std::string& str);

    // Equality comparison
    bool operator==(const Move& other) const {
        return hexId == other.hexId && tileValue == other.tileValue;
    }

    bool operator!=(const Move& other) const {
        return !(*this == other);
    }
};

/**
 * Move with evaluation score (used by AI)
 */
struct ScoredMove {
    Move move;
    float score;

    ScoredMove() : move(), score(0.0f) {}
    ScoredMove(const Move& m, float s) : move(m), score(s) {}

    // For sorting (highest score first)
    bool operator<(const ScoredMove& other) const {
        return score > other.score;  // Note: reversed for descending order
    }
};

} // namespace hexuki

#endif // HEXUKI_MOVE_H
