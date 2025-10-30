#include "core/bitboard.h"
#include "core/zobrist.h"
#include "ai/minimax.h"
#include <iostream>
#include <iomanip>

using namespace hexuki;
using namespace hexuki::minimax;

void testMinimaxOnPosition(const std::string& description, const std::string& position, int depth, int timeLimitMs) {
    std::cout << "==============================================\n";
    std::cout << description << "\n";
    std::cout << "==============================================\n";
    std::cout << "Position: " << position << "\n";
    std::cout << "Search depth: " << depth << "\n";
    std::cout << "Time limit: " << timeLimitMs << "ms\n\n";

    HexukiBitboard board;
    board.loadPosition(position);

    // Show current state
    std::cout << "Current player: " << board.getCurrentPlayer() << "\n";
    std::cout << "Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "Score P2: " << board.getScore(PLAYER_2) << "\n";

    auto moves = board.getValidMoves();
    std::cout << "Valid moves: " << moves.size() << "\n\n";

    // Run minimax search
    std::cout << "Searching...\n";

    SearchConfig config;
    config.maxDepth = depth;
    config.timeLimitMs = timeLimitMs;
    config.useIterativeDeepening = true;
    config.useMoveOrdering = true;
    config.useTranspositionTable = true;
    config.verbose = true;  // Show depth-by-depth progress

    auto result = findBestMove(board, config);

    // Display results
    std::cout << "\n----------------------------------------\n";
    std::cout << "SEARCH RESULTS:\n";
    std::cout << "----------------------------------------\n";
    std::cout << "Best move: " << result.bestMove.toString() << "\n";
    std::cout << "Score: " << result.score << "\n";
    std::cout << "Depth reached: " << result.depth << "\n";
    std::cout << "Nodes searched: " << result.nodesSearched << "\n";
    std::cout << "Time: " << std::fixed << std::setprecision(1) << result.timeMs << " ms\n";
    std::cout << "Nodes/sec: " << (int)(result.nodesSearched * 1000.0 / result.timeMs) << "\n";
    std::cout << "TT hits: " << result.ttHits << "\n";
    std::cout << "TT misses: " << result.ttMisses << "\n";
    std::cout << "TT hit rate: " << std::fixed << std::setprecision(1)
              << (100.0 * result.ttHits / (result.ttHits + result.ttMisses)) << "%\n";
    std::cout << "Timeout: " << (result.timeout ? "YES" : "NO") << "\n";

    // Make the move and show result
    board.makeMove(result.bestMove);
    std::cout << "\nAfter best move:\n";
    std::cout << "  Player: " << board.getCurrentPlayer() << "\n";
    std::cout << "  Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "  Score P2: " << board.getScore(PLAYER_2) << "\n";
    std::cout << "  Position: " << board.savePosition() << "\n";
    std::cout << "\n";
}

int main() {
    std::cout << "============================================\n";
    std::cout << "C++ MINIMAX AI TEST\n";
    std::cout << "============================================\n\n";

    Zobrist::initialize();

    // Test 1: Initial position (lots of moves, should be fast at shallow depth)
    testMinimaxOnPosition(
        "TEST 1: Opening position",
        "h9:1|turn:1",
        6,   // Depth
        5000 // 5 second limit
    );

    // Test 2: Mid-game position (fewer moves, can search deeper)
    testMinimaxOnPosition(
        "TEST 2: Mid-game position",
        "h4:3,h6:5,h7:4,h9:1,h11:2,h12:6|p1:1,2,4,7,8,9|p2:1,3,5,6,7,8,9|turn:2",
        8,   // Depth
        5000 // 5 second limit
    );

    // Test 3: Late-game position (very few moves, can search to end)
    testMinimaxOnPosition(
        "TEST 3: Late-game position",
        "h4:3,h6:5,h7:4,h9:1,h11:2,h12:6,h1:7,h2:8,h3:9,h5:1,h8:2,h10:3,h14:4,h0:5,h13:6|p1:4,9|p2:7,8,9|turn:1",
        20,  // Depth (search to end)
        10000 // 10 second limit
    );

    std::cout << "============================================\n";
    std::cout << "All minimax tests complete!\n";
    std::cout << "============================================\n";

    return 0;
}
