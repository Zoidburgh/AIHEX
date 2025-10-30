#include "core/move.h"
#include "utils/constants.h"
#include <regex>
#include <stdexcept>

namespace hexuki {

Move Move::fromString(const std::string& str) {
    // Expected format: "h6t5" (hex 6, tile 5)
    std::regex moveRegex(R"(h(\d+)t(\d+))");
    std::smatch match;

    if (std::regex_match(str, match, moveRegex)) {
        int hexId = std::stoi(match[1]);
        int tileValue = std::stoi(match[2]);

        // Validate hex ID
        if (hexId < 0 || hexId >= NUM_HEXES) {
            throw std::invalid_argument("Invalid hex ID: " + std::to_string(hexId));
        }

        // Validate tile value is one of the allowed values
        bool validTile = false;
        for (int i = 0; i < NUM_TILES_PER_PLAYER; i++) {
            if (tileValue == TILE_VALUES[i]) {
                validTile = true;
                break;
            }
        }

        if (validTile) {
            return Move(hexId, tileValue);
        } else {
            throw std::invalid_argument("Invalid tile value: " + std::to_string(tileValue));
        }
    }

    throw std::invalid_argument("Invalid move string format: " + str);
}

} // namespace hexuki
