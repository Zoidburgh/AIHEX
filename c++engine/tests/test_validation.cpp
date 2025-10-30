#include "core/bitboard.h"
#include "core/move.h"
#include "core/zobrist.h"
#include <iostream>
#include <algorithm>
#include <vector>
#include <string>

using namespace hexuki;

/**
 * Cross-validation test: Compare C++ engine with JavaScript
 *
 * This program outputs game states in a format that can be compared
 * with JavaScript output to verify correctness.
 */

void testInitialState() {
    std::cout << "=== TEST 1: Initial Game State ===\n";

    HexukiBitboard board;

    // Output board state
    std::cout << "Position: " << board.savePosition() << "\n";
    std::cout << "Player: " << board.getCurrentPlayer() << "\n";
    std::cout << "Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "Score P2: " << board.getScore(PLAYER_2) << "\n";
    std::cout << "Game Over: " << (board.isGameOver() ? "true" : "false") << "\n";

    // Output valid moves (sorted)
    auto moves = board.getValidMoves();
    std::vector<std::string> moveStrs;
    for (const auto& move : moves) {
        moveStrs.push_back(move.toString());
    }
    std::sort(moveStrs.begin(), moveStrs.end());

    std::cout << "Valid Moves (" << moveStrs.size() << "): ";
    for (size_t i = 0; i < moveStrs.size(); i++) {
        std::cout << moveStrs[i];
        if (i < moveStrs.size() - 1) std::cout << ",";
    }
    std::cout << "\n\n";
}

void testAfterOneMoveH6T5() {
    std::cout << "=== TEST 2: After Move h6t5 ===\n";

    HexukiBitboard board;
    board.makeMove(Move(6, 5));

    std::cout << "Position: " << board.savePosition() << "\n";
    std::cout << "Player: " << board.getCurrentPlayer() << "\n";
    std::cout << "Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "Score P2: " << board.getScore(PLAYER_2) << "\n";

    auto moves = board.getValidMoves();
    std::vector<std::string> moveStrs;
    for (const auto& move : moves) {
        moveStrs.push_back(move.toString());
    }
    std::sort(moveStrs.begin(), moveStrs.end());

    std::cout << "Valid Moves (" << moveStrs.size() << "): ";
    for (size_t i = 0; i < std::min(size_t(10), moveStrs.size()); i++) {
        std::cout << moveStrs[i];
        if (i < std::min(size_t(10), moveStrs.size()) - 1) std::cout << ",";
    }
    if (moveStrs.size() > 10) std::cout << "...";
    std::cout << "\n\n";
}

void testGameSequence() {
    std::cout << "=== TEST 3: Game Sequence ===\n";

    HexukiBitboard board;

    // Play a sequence of moves
    std::vector<Move> sequence = {
        Move(6, 5),   // h6t5
        Move(7, 4),   // h7t4
        Move(4, 3),   // h4t3
        Move(11, 2),  // h11t2
        Move(12, 6)   // h12t6
    };

    for (const auto& move : sequence) {
        std::cout << "Playing: " << move.toString() << "\n";

        if (!board.isValidMove(move)) {
            std::cout << "ERROR: Move is invalid!\n";
            break;
        }

        board.makeMove(move);

        std::cout << "  Player: " << board.getCurrentPlayer() << "\n";
        std::cout << "  Score P1: " << board.getScore(PLAYER_1) << "\n";
        std::cout << "  Score P2: " << board.getScore(PLAYER_2) << "\n";
        std::cout << "  Position: " << board.savePosition() << "\n";
    }
    std::cout << "\n";
}

void testLoadPosition() {
    std::cout << "=== TEST 4: Load Position ===\n";

    // Test loading a mid-game position
    std::string position = "h9:1,h6:5,h7:3|p1:2,4,8|p2:6,7,9|turn:1";

    HexukiBitboard board;
    board.loadPosition(position);

    std::cout << "Loaded: " << position << "\n";
    std::cout << "Player: " << board.getCurrentPlayer() << "\n";
    std::cout << "Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "Score P2: " << board.getScore(PLAYER_2) << "\n";

    // Check available tiles
    auto p1Tiles = board.getAvailableTiles(PLAYER_1);
    auto p2Tiles = board.getAvailableTiles(PLAYER_2);

    std::cout << "P1 Tiles: ";
    for (size_t i = 0; i < p1Tiles.size(); i++) {
        std::cout << p1Tiles[i];
        if (i < p1Tiles.size() - 1) std::cout << ",";
    }
    std::cout << "\n";

    std::cout << "P2 Tiles: ";
    for (size_t i = 0; i < p2Tiles.size(); i++) {
        std::cout << p2Tiles[i];
        if (i < p2Tiles.size() - 1) std::cout << ",";
    }
    std::cout << "\n";

    // Valid moves
    auto moves = board.getValidMoves();
    std::cout << "Valid Moves (" << moves.size() << "): ";
    for (size_t i = 0; i < std::min(size_t(10), moves.size()); i++) {
        std::cout << moves[i].toString();
        if (i < std::min(size_t(10), moves.size()) - 1) std::cout << ",";
    }
    if (moves.size() > 10) std::cout << "...";
    std::cout << "\n\n";
}

void testScoring() {
    std::cout << "=== TEST 5: Scoring Validation ===\n";

    // Test position with known scoring
    HexukiBitboard board;
    board.clearBoard();
    board.setHexValue(9, 1);   // Center
    board.setHexValue(6, 3);   // P1 chain
    board.setHexValue(9, 1);   // Overwrite (shouldn't change)
    board.setAvailableTiles(PLAYER_1, {2, 4, 5, 6, 7, 8, 9});
    board.setAvailableTiles(PLAYER_2, {1, 2, 4, 5, 6, 7, 8, 9});
    board.setCurrentPlayer(PLAYER_1);

    std::cout << "Position: " << board.savePosition() << "\n";
    std::cout << "Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "Score P2: " << board.getScore(PLAYER_2) << "\n";

    // Expected: P1 should have chains with products including 3×1=3
    std::cout << "\n";
}

int main() {
    std::cout << "============================================\n";
    std::cout << "C++ ENGINE VALIDATION TEST\n";
    std::cout << "Compare output with JavaScript version\n";
    std::cout << "============================================\n\n";

    Zobrist::initialize();

    testInitialState();
    testAfterOneMoveH6T5();
    testGameSequence();
    testLoadPosition();
    testScoring();

    std::cout << "============================================\n";
    std::cout << "All tests complete!\n";
    std::cout << "============================================\n";

    return 0;
}
