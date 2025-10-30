#ifndef HEXUKI_MCTS_H
#define HEXUKI_MCTS_H

#include "core/bitboard.h"
#include "core/move.h"
#include "ai/mcts_node.h"
#include "ai/minimax.h"
#include <random>
#include <chrono>

namespace hexuki {
namespace mcts {

/**
 * MCTS Search Configuration
 */
struct MCTSConfig {
    int numSimulations = 10000;     // Number of simulations to run
    int timeLimitMs = 5000;         // Time limit in milliseconds
    double explorationConstant = 1.414;  // UCT exploration constant (√2 is standard)
    bool useTimeLimit = true;       // Use time limit vs simulation count
    bool verbose = false;           // Print search progress

    // Minimax rollout configuration
    bool useMinimaxRollouts = false;  // Use minimax for endgame evaluation
    int minimaxThreshold = 7;         // Switch to minimax at this many empty hexes

    MCTSConfig() = default;
};

/**
 * MCTS Search Result
 */
struct MCTSResult {
    Move bestMove;              // Best move found
    int simulations;            // Number of simulations run
    double timeMs;              // Time taken in milliseconds
    double winRate;             // Win rate of best move (0.0 to 1.0)
    int visits;                 // Number of visits to best move

    // Top moves for analysis
    struct MoveStats {
        Move move;
        int visits;
        double winRate;
    };
    std::vector<MoveStats> topMoves;  // Top N moves by visit count

    MCTSResult() : bestMove(), simulations(0), timeMs(0.0),
                   winRate(0.0), visits(0) {}
};

/**
 * MCTS Search Engine
 *
 * Monte Carlo Tree Search for Hexuki
 * Perfect for this game because it simulates games to completion,
 * getting REAL final scores instead of unreliable mid-game evaluations.
 *
 * Algorithm:
 * 1. Selection: Use UCT to traverse tree to leaf node
 * 2. Expansion: Add one child node
 * 3. Simulation: Play random game to end from new node
 * 4. Backpropagation: Update all ancestor nodes with result
 */
class MCTS {
public:
    MCTS();
    ~MCTS();

    /**
     * Find best move using MCTS
     *
     * @param board Current game state
     * @param config Search configuration
     * @return Search result with best move and statistics
     */
    MCTSResult findBestMove(HexukiBitboard& board, const MCTSConfig& config = MCTSConfig());

    /**
     * Simple interface: search for given time or simulation count
     */
    MCTSResult findBestMove(HexukiBitboard& board, int simulations);
    MCTSResult findBestMoveWithTime(HexukiBitboard& board, int timeLimitMs);

private:
    MCTSNode* root;
    std::mt19937 rng;  // Random number generator for simulations
    int rootPlayer;    // Player to move at root (1 or 2)
    const MCTSConfig* currentConfig;  // Current search configuration

    // Shared minimax transposition table for rollout evaluation
    // Reused across all simulations for speed (cache hit rate improves over time)
    minimax::TranspositionTable* sharedMinimaxTT;

    // MCTS phases
    MCTSNode* select(MCTSNode* node, HexukiBitboard& board);
    MCTSNode* expand(MCTSNode* node, HexukiBitboard& board);
    double simulate(HexukiBitboard& board, const MCTSConfig& config);
    void backpropagate(MCTSNode* node, double score);

    // Helper: get all valid moves at current state
    std::vector<Move> getValidMoves(const HexukiBitboard& board) const;

    // Helper: check if game is over
    bool isTerminal(const HexukiBitboard& board) const;

    // Helper: evaluate terminal position (final score)
    double evaluateTerminal(const HexukiBitboard& board) const;

    // Helper: select random move for simulation
    Move selectRandomMove(const std::vector<Move>& moves);

    // Cleanup
    void resetTree();
};

} // namespace mcts
} // namespace hexuki

#endif // HEXUKI_MCTS_H
