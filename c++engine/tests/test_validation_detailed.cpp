#include "core/bitboard.h"
#include "core/move.h"
#include "core/zobrist.h"
#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include <map>

using namespace hexuki;

/**
 * Detailed validation: Output ALL valid moves for debugging
 */

int main() {
    std::cout << "=== FULL MOVE LIST: Loaded Position ===\n";
    std::cout << "Position: h9:1,h6:5,h7:3|p1:2,4,8|p2:6,7,9|turn:1\n";
    std::cout << "\n";

    Zobrist::initialize();

    HexukiBitboard board;
    board.loadPosition("h9:1,h6:5,h7:3|p1:2,4,8|p2:6,7,9|turn:1");

    std::cout << "Board state:\n";
    for (int i = 0; i < 19; i++) {
        int val = board.getTileValue(i);
        if (val > 0) {
            std::cout << "  h" << i << ": value=" << val << "\n";
        }
    }
    std::cout << "\n";

    auto p1Tiles = board.getAvailableTiles(PLAYER_1);
    auto p2Tiles = board.getAvailableTiles(PLAYER_2);

    std::cout << "Player 1 tiles: ";
    for (size_t i = 0; i < p1Tiles.size(); i++) {
        std::cout << p1Tiles[i];
        if (i < p1Tiles.size() - 1) std::cout << ",";
    }
    std::cout << "\n";

    std::cout << "Player 2 tiles: ";
    for (size_t i = 0; i < p2Tiles.size(); i++) {
        std::cout << p2Tiles[i];
        if (i < p2Tiles.size() - 1) std::cout << ",";
    }
    std::cout << "\n";

    std::cout << "Current player: " << board.getCurrentPlayer() << "\n";
    std::cout << "\n";

    // Get all valid moves
    auto moves = board.getValidMoves();

    std::vector<std::string> moveStrs;
    for (const auto& move : moves) {
        moveStrs.push_back(move.toString());
    }
    std::sort(moveStrs.begin(), moveStrs.end());

    std::cout << "Total valid moves: " << moveStrs.size() << "\n";
    std::cout << "\n";
    std::cout << "ALL VALID MOVES:\n";
    for (size_t i = 0; i < moveStrs.size(); i++) {
        std::cout << "  " << (i + 1) << ". " << moveStrs[i] << "\n";
    }
    std::cout << "\n";

    // Group by hex to see which hexes are legal
    std::map<int, std::vector<int>> hexMap;
    for (const auto& move : moves) {
        hexMap[move.hexId].push_back(move.tileValue);
    }

    std::cout << "VALID HEXES (and tile options):\n";
    for (const auto& pair : hexMap) {
        std::cout << "  h" << pair.first << ": tiles [";
        auto tiles = pair.second;
        std::sort(tiles.begin(), tiles.end());
        for (size_t i = 0; i < tiles.size(); i++) {
            std::cout << tiles[i];
            if (i < tiles.size() - 1) std::cout << ", ";
        }
        std::cout << "]\n";
    }
    std::cout << "\n";

    // Check which empty hexes are NOT legal
    std::cout << "ILLEGAL EMPTY HEXES:\n";
    for (int hexId = 0; hexId < 19; hexId++) {
        if (board.getTileValue(hexId) == 0 && hexMap.find(hexId) == hexMap.end()) {
            std::cout << "  h" << hexId << "\n";
        }
    }

    return 0;
}
