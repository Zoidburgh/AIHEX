#include "core/bitboard.h"
#include "core/move.h"
#include "core/zobrist.h"
#include <iostream>
#include <cassert>

using namespace hexuki;

void testPuzzleSetup() {
    std::cout << "Testing puzzle setup...\n";

    HexukiBitboard board;

    // Start fresh (no initial center tile)
    board.clearBoard();

    // Set up a puzzle position manually:
    // Hex 9 (center) has tile 1
    // Hex 6 has tile 5
    // Hex 7 has tile 3
    board.setHexValue(9, 1);
    board.setHexValue(6, 5);
    board.setHexValue(7, 3);

    // Player 1 only has tiles 2, 4, 8 available
    board.setAvailableTiles(PLAYER_1, {2, 4, 8});

    // Player 2 only has tiles 6, 7, 9 available
    board.setAvailableTiles(PLAYER_2, {6, 7, 9});

    // Player 1 to move
    board.setCurrentPlayer(PLAYER_1);

    // Verify setup
    assert(board.isHexOccupied(9));
    assert(board.getTileValue(9) == 1);
    assert(board.isHexOccupied(6));
    assert(board.getTileValue(6) == 5);

    assert(board.isTileAvailable(PLAYER_1, 2));
    assert(board.isTileAvailable(PLAYER_1, 4));
    assert(board.isTileAvailable(PLAYER_1, 8));
    assert(!board.isTileAvailable(PLAYER_1, 5));  // Tile 5 not available

    assert(board.getCurrentPlayer() == PLAYER_1);

    std::cout << "✓ Manual puzzle setup works\n\n";

    board.print();
}

void testPositionLoadSave() {
    std::cout << "\nTesting position load/save...\n";

    HexukiBitboard board;

    // Create a puzzle position
    std::string puzzlePosition = "h9:1,h6:5,h7:3|p1:2,4,8|p2:6,7,9|turn:1";

    // Load it
    board.loadPosition(puzzlePosition);

    // Verify loaded correctly
    assert(board.isHexOccupied(9));
    assert(board.getTileValue(9) == 1);
    assert(board.isHexOccupied(6));
    assert(board.getTileValue(6) == 5);
    assert(board.isHexOccupied(7));
    assert(board.getTileValue(7) == 3);

    auto p1Tiles = board.getAvailableTiles(PLAYER_1);
    assert(p1Tiles.size() == 3);
    assert(p1Tiles[0] == 2 && p1Tiles[1] == 4 && p1Tiles[2] == 8);

    auto p2Tiles = board.getAvailableTiles(PLAYER_2);
    assert(p2Tiles.size() == 3);
    assert(p2Tiles[0] == 6 && p2Tiles[1] == 7 && p2Tiles[2] == 9);

    assert(board.getCurrentPlayer() == PLAYER_1);

    std::cout << "✓ Position loading works\n\n";

    board.print();

    // Save position and verify it matches
    std::string saved = board.savePosition();
    std::cout << "\nSaved position: " << saved << "\n";

    // Load saved position into new board
    HexukiBitboard board2;
    board2.loadPosition(saved);

    // Verify they match
    assert(board2.isHexOccupied(9));
    assert(board2.getTileValue(9) == 1);
    assert(board2.getCurrentPlayer() == PLAYER_1);

    std::cout << "✓ Position save/load roundtrip works\n";
}

void testPuzzleSolving() {
    std::cout << "\nTesting puzzle solving...\n";

    HexukiBitboard board;

    // Load a simple endgame puzzle:
    // - Center has tile 1
    // - Most hexes already filled
    // - P1 has only tile 9 left
    // - P2 has tiles 6, 7 left
    // - P1 to move
    std::string endgamePuzzle = "h9:1,h4:2,h6:3,h7:4,h11:5,h12:8|p1:9|p2:6,7|turn:1";

    board.loadPosition(endgamePuzzle);

    std::cout << "Loaded endgame puzzle:\n";
    board.print();

    // Get valid moves for P1 (should have limited options)
    auto moves = board.getValidMoves();
    std::cout << "\nPlayer 1 has " << moves.size() << " valid moves:\n";
    for (const auto& move : moves) {
        std::cout << "  " << move.toString() << "\n";
    }

    // P1 can only place tile 9 on legal hexes
    assert(moves.size() > 0);
    for (const auto& move : moves) {
        assert(move.tileValue == 9);
    }

    std::cout << "✓ Puzzle solving works\n";
}

void testEmptyBoardPuzzle() {
    std::cout << "\nTesting completely custom puzzle...\n";

    HexukiBitboard board;

    // Create a puzzle where NO initial tiles are placed
    // Each player has only 3 tiles
    board.clearBoard();
    board.setAvailableTiles(PLAYER_1, {3, 6, 9});
    board.setAvailableTiles(PLAYER_2, {2, 5, 8});
    board.setCurrentPlayer(PLAYER_1);

    // Set center tile manually (required for valid game)
    board.setHexValue(9, 1);

    std::cout << "Custom puzzle - P1 has {3,6,9}, P2 has {2,5,8}:\n";
    board.print();

    auto moves = board.getValidMoves();
    std::cout << "\nPlayer 1 has " << moves.size() << " valid first moves\n";

    // P1 should only be able to place tiles 3, 6, or 9
    for (const auto& move : moves) {
        assert(move.tileValue == 3 || move.tileValue == 6 || move.tileValue == 9);
    }

    std::cout << "✓ Empty board puzzle works\n";
}

int main() {
    std::cout << "===========================================\n";
    std::cout << "HEXUKI C++ ENGINE - Puzzle Loading Tests\n";
    std::cout << "===========================================\n\n";

    Zobrist::initialize();

    testPuzzleSetup();
    testPositionLoadSave();
    testPuzzleSolving();
    testEmptyBoardPuzzle();

    std::cout << "\n===========================================\n";
    std::cout << "✅ All puzzle tests passed!\n";
    std::cout << "===========================================\n";

    return 0;
}
