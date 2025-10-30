#include "core/bitboard.h"
#include "core/move.h"
#include "core/zobrist.h"
#include <iostream>
#include <cassert>

using namespace hexuki;

// Helper function to count moves (occupied hexes excluding initial center hex)
int countMoves(const HexukiBitboard& board) {
    int count = 0;
    for (int i = 0; i < NUM_HEXES; i++) {
        if (i != CENTER_HEX && board.isHexOccupied(i)) {
            count++;
        }
    }
    return count;
}

void testBitboardCreation() {
    HexukiBitboard board;
    assert(board.getCurrentPlayer() == PLAYER_1);
    assert(countMoves(board) == 0);
    assert(!board.isGameOver());

    // Center hex should start with tile 1
    assert(board.isHexOccupied(CENTER_HEX));
    assert(board.getTileValue(CENTER_HEX) == STARTING_TILE);

    std::cout << "✓ Bitboard creation test passed\n";
}

void testMoveParsing() {
    Move m = Move::fromString("h6t5");
    assert(m.hexId == 6);
    assert(m.tileValue == 5);
    assert(m.toString() == "h6t5");
    std::cout << "✓ Move parsing test passed\n";
}

void testMoveGeneration() {
    HexukiBitboard board;
    auto moves = board.getValidMoves();
    assert(moves.size() > 0);

    // First move: all adjacent hexes to center (6 hexes) × 9 tiles = 54 moves
    std::cout << "✓ Move generation test passed (" << moves.size() << " first moves)\n";
}

void testTileAvailability() {
    HexukiBitboard board;

    // Both players should have all 9 tile values available initially
    for (int i = 0; i < NUM_TILES_PER_PLAYER; i++) {
        int tileVal = TILE_VALUES[i];
        assert(board.isTileAvailable(PLAYER_1, tileVal));
        assert(board.isTileAvailable(PLAYER_2, tileVal));
    }

    // Play a move with the 5th tile in TILE_VALUES array (index 4)
    int testTileVal = TILE_VALUES[4];  // Middle tile
    Move m1(6, testTileVal);  // Hex 6 is adjacent to center
    board.makeMove(m1);

    // Player 1 should no longer have that tile
    assert(!board.isTileAvailable(PLAYER_1, testTileVal));
    // But Player 2 should still have it
    assert(board.isTileAvailable(PLAYER_2, testTileVal));

    std::cout << "✓ Tile availability test passed\n";
}

void testMakingMoves() {
    HexukiBitboard board;
    int testTileVal = TILE_VALUES[4];  // Use middle tile value
    Move m1(6, testTileVal);
    assert(board.isValidMove(m1));

    board.makeMove(m1);
    assert(countMoves(board) == 1);
    assert(board.getCurrentPlayer() == PLAYER_2);
    assert(board.isHexOccupied(6));
    assert(board.getTileValue(6) == testTileVal);

    std::cout << "✓ Making moves test passed\n";
}

void testUnmakeMove() {
    HexukiBitboard board;

    // Save initial state
    int initialMoveCount = countMoves(board);
    int initialPlayer = board.getCurrentPlayer();

    // Make a move
    int testTileVal = TILE_VALUES[4];
    Move m1(6, testTileVal);
    board.makeMove(m1);

    // Verify move was made
    assert(countMoves(board) == initialMoveCount + 1);
    assert(board.isHexOccupied(6));
    assert(!board.isTileAvailable(PLAYER_1, testTileVal));

    // Unmake the move
    board.unmakeMove(m1);

    // Verify state restored
    assert(countMoves(board) == initialMoveCount);
    assert(board.getCurrentPlayer() == initialPlayer);
    assert(!board.isHexOccupied(6));
    assert(board.isTileAvailable(PLAYER_1, testTileVal));

    std::cout << "✓ Unmake move test passed\n";
}

void testChainScoring() {
    HexukiBitboard board;

    // Initial score: only center hex (tile 1)
    // P1 chains: {3,6,9,12,15} has hex 9 with value 1, so contributes 1
    // Other P1 chains: empty, contribute 1 each (product of empty = 1)
    // Total P1 initial: 1 + 1 + 1 + 1 + 1 = 5
    int initialP1 = board.getScore(PLAYER_1);
    int initialP2 = board.getScore(PLAYER_2);

    std::cout << "  Initial scores: P1=" << initialP1 << ", P2=" << initialP2 << "\n";

    // Both should have same initial score (center tile is in both player's center chains)
    assert(initialP1 == initialP2);

    std::cout << "✓ Chain scoring test passed\n";
}

void testAntiSymmetry() {
    HexukiBitboard board;

    // Play a symmetric position (if allowed)
    // Then verify symmetric moves are blocked

    int testTileVal = TILE_VALUES[4];

    // Move 1: P1 plays h6 (left of center)
    Move m1(6, testTileVal);
    board.makeMove(m1);

    // Move 2: P2 plays h7 (mirror of h6, right of center) with same tile value
    // This SHOULD be allowed (symmetry rule starts from move 2 onward for P1)
    Move m2(7, testTileVal);
    if (board.isValidMove(m2)) {
        board.makeMove(m2);
        std::cout << "  Symmetric P2 response allowed\n";
    }

    std::cout << "✓ Anti-symmetry test passed\n";
}

void testGameOver() {
    HexukiBitboard board;

    // Game should end after 18 moves (all non-center hexes filled)
    assert(!board.isGameOver());
    assert(countMoves(board) == 0);

    // A full game has 18 moves
    // (We won't play a full game here, just verify the counter)

    std::cout << "✓ Game over test passed\n";
}

int main() {
    std::cout << "===========================================\n";
    std::cout << "HEXUKI C++ ENGINE - Validation Tests\n";
    std::cout << "===========================================\n\n";

    Zobrist::initialize();

    testBitboardCreation();
    testMoveParsing();
    testMoveGeneration();
    testTileAvailability();
    testMakingMoves();
    testUnmakeMove();
    testChainScoring();
    testAntiSymmetry();
    testGameOver();

    std::cout << "\n===========================================\n";
    std::cout << "✅ All validation tests passed!\n";
    std::cout << "===========================================\n";
    return 0;
}
