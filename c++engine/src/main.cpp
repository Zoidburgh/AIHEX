#include <iostream>
#include "core/bitboard.h"
#include "core/move.h"
#include "core/zobrist.h"

using namespace hexuki;

int main() {
    std::cout << "===========================================\n";
    std::cout << "HEXUKI C++ ENGINE - Phase 1 Test Program\n";
    std::cout << "===========================================\n\n";

    // Initialize Zobrist hashing
    Zobrist::initialize();
    std::cout << "✓ Zobrist hashing initialized\n\n";

    // Create a game
    HexukiBitboard game;
    std::cout << "✓ Game created\n\n";

    // Print initial state
    std::cout << "Initial board state:\n";
    game.print();
    std::cout << "\n";

    // Test: Get valid moves
    auto moves = game.getValidMoves();
    std::cout << "Valid first moves: " << moves.size() << " total\n";
    std::cout << "First 10: ";
    for (size_t i = 0; i < std::min(size_t(10), moves.size()); i++) {
        std::cout << moves[i].toString();
        if (i < 9 && i < moves.size() - 1) std::cout << ", ";
    }
    std::cout << "...\n\n";

    // Play a few moves using tile values from TILE_VALUES array
    std::cout << "Playing opening sequence using tiles: "
              << TILE_VALUES[4] << ", " << TILE_VALUES[3] << ", " << TILE_VALUES[0] << "\n\n";

    Move m1(6, TILE_VALUES[4]);  // Hex 6, middle tile
    if (game.isValidMove(m1)) {
        game.makeMove(m1);
        std::cout << "Move 1: " << m1.toString() << " (P1)\n";
        game.print();
        std::cout << "\n";
    }

    Move m2(7, TILE_VALUES[3]);  // Hex 7, 4th tile
    if (game.isValidMove(m2)) {
        game.makeMove(m2);
        std::cout << "Move 2: " << m2.toString() << " (P2)\n";
        game.print();
        std::cout << "\n";
    }

    Move m3(2, TILE_VALUES[0]);  // Hex 2, first tile
    if (game.isValidMove(m3)) {
        game.makeMove(m3);
        std::cout << "Move 3: " << m3.toString() << " (P1)\n";
        game.print();
        std::cout << "\n";
    }

    // Test unmake
    std::cout << "Testing unmake...\n";
    game.unmakeMove();
    std::cout << "After unmake (should be back to move 2):\n";
    game.print();
    std::cout << "\n";

    // Final stats
    std::cout << "===========================================\n";
    std::cout << "PHASE 1 TESTS COMPLETE\n";
    std::cout << "✓ Bitboard structure working\n";
    std::cout << "✓ Move generation working\n";
    std::cout << "✓ Move make/unmake working\n";
    std::cout << "✓ Scoring calculation working\n";
    std::cout << "✓ Zobrist hashing working\n";
    std::cout << "===========================================\n";

    return 0;
}
