#include "core/bitboard.h"
#include "core/zobrist.h"
#include "ai/mcts.h"
#include <iostream>
#include <iomanip>

using namespace hexuki;
using namespace hexuki::mcts;

void testMCTSOnPosition(const std::string& description, const std::string& position, int simulations) {
    std::cout << "==============================================\n";
    std::cout << description << "\n";
    std::cout << "==============================================\n";
    std::cout << "Position: " << position << "\n";
    std::cout << "Simulations: " << simulations << "\n\n";

    HexukiBitboard board;
    board.loadPosition(position);

    // Show current state
    std::cout << "Current player: " << board.getCurrentPlayer() << "\n";
    std::cout << "Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "Score P2: " << board.getScore(PLAYER_2) << "\n";

    auto moves = board.getValidMoves();
    std::cout << "Valid moves: " << moves.size() << "\n\n";

    // Run MCTS search with EXACT simulation count (no time limit)
    std::cout << "Searching with MCTS...\n";

    MCTS mcts;
    MCTSConfig config;
    config.numSimulations = simulations;
    config.useTimeLimit = false;  // Use simulation count, not time limit
    config.verbose = false;

    auto result = mcts.findBestMove(board, config);

    // Display results
    std::cout << "\n----------------------------------------\n";
    std::cout << "MCTS RESULTS:\n";
    std::cout << "----------------------------------------\n";
    std::cout << "Best move: " << result.bestMove.toString() << "\n";
    std::cout << "Win rate: " << std::fixed << std::setprecision(3) << result.winRate << "\n";
    std::cout << "Visits: " << result.visits << "\n";
    std::cout << "Simulations: " << result.simulations << "\n";
    std::cout << "Time: " << std::fixed << std::setprecision(1) << result.timeMs << " ms\n";
    std::cout << "Simulations/sec: " << (int)(result.simulations * 1000.0 / result.timeMs) << "\n";

    if (!result.topMoves.empty()) {
        std::cout << "\nTop moves by visit count:\n";
        for (size_t i = 0; i < result.topMoves.size(); i++) {
            const auto& stats = result.topMoves[i];
            std::cout << "  " << (i + 1) << ". " << stats.move.toString()
                      << " - visits: " << stats.visits
                      << ", win rate: " << std::fixed << std::setprecision(3) << stats.winRate << "\n";
        }
    }

    // Make the move and show result
    board.makeMove(result.bestMove);
    std::cout << "\nAfter best move:\n";
    std::cout << "  Player: " << board.getCurrentPlayer() << "\n";
    std::cout << "  Score P1: " << board.getScore(PLAYER_1) << "\n";
    std::cout << "  Score P2: " << board.getScore(PLAYER_2) << "\n";
    std::cout << "\n";
}

int main() {
    std::cout << "============================================\n";
    std::cout << "C++ MCTS TEST - 50,000 SIMULATIONS\n";
    std::cout << "============================================\n\n";

    Zobrist::initialize();

    // Test 1: Opening position
    testMCTSOnPosition(
        "TEST 1: Opening position",
        "h9:1|turn:1",
        50000
    );

    // Test 2: Mid-game position
    testMCTSOnPosition(
        "TEST 2: Mid-game position",
        "h4:3,h6:5,h7:4,h9:1,h11:2,h12:6|p1:1,2,4,7,8,9|p2:1,3,5,6,7,8,9|turn:2",
        50000
    );

    // Test 3: Late-game position
    testMCTSOnPosition(
        "TEST 3: Late-game position",
        "h4:3,h6:5,h7:4,h9:1,h11:2,h12:6,h1:7,h2:8,h3:9,h5:1,h8:2,h10:3,h14:4,h0:5,h13:6|p1:4,9|p2:7,8,9|turn:1",
        50000
    );

    std::cout << "============================================\n";
    std::cout << "All MCTS tests complete!\n";
    std::cout << "============================================\n";

    return 0;
}
