#ifndef HEXUKI_MINIMAX_H
#define HEXUKI_MINIMAX_H

#include "core/bitboard.h"
#include "core/move.h"
#include <unordered_map>
#include <chrono>

namespace hexuki {
namespace minimax {

/**
 * Transposition Table Entry
 * Stores previously evaluated positions to avoid recalculation
 */
struct TTEntry {
    enum Flag { EXACT, LOWER_BOUND, UPPER_BOUND };

    int score;          // Evaluation score
    int depth;          // Depth at which this was evaluated
    Flag flag;          // Type of bound
    Move bestMove;      // Best move found at this position

    TTEntry() : score(0), depth(0), flag(EXACT), bestMove() {}
    TTEntry(int s, int d, Flag f, const Move& m)
        : score(s), depth(d), flag(f), bestMove(m) {}
};

/**
 * Transposition Table (hash table for board positions)
 */
class TranspositionTable {
public:
    TranspositionTable(size_t sizeMB = 128);  // Default: 128MB table

    void store(uint64_t hash, const TTEntry& entry);
    bool probe(uint64_t hash, TTEntry& entry) const;
    void clear();

    size_t getSize() const { return table.size(); }
    size_t getHits() const { return hits; }
    size_t getMisses() const { return misses; }

private:
    std::unordered_map<uint64_t, TTEntry> table;
    size_t maxSize;
    mutable size_t hits;
    mutable size_t misses;
};

/**
 * Search statistics and result
 */
struct SearchResult {
    Move bestMove;          // Best move found
    int score;              // Evaluation score (positive = good for current player)
    int nodesSearched;      // Total nodes evaluated
    double timeMs;          // Time taken in milliseconds
    int depth;              // Final depth reached
    bool timeout;           // Did search hit time limit?

    // Transposition table stats
    size_t ttHits;
    size_t ttMisses;

    SearchResult() : bestMove(), score(0), nodesSearched(0), timeMs(0.0),
                     depth(0), timeout(false), ttHits(0), ttMisses(0) {}
};

/**
 * Minimax search configuration
 */
struct SearchConfig {
    int maxDepth = 20;              // Maximum depth to search
    int timeLimitMs = 30000;        // Time limit (30 seconds default)
    bool useIterativeDeepening = true;  // Start shallow, go deeper
    bool useMoveOrdering = true;    // Order moves to improve pruning
    bool useTranspositionTable = true;  // Cache positions
    size_t ttSizeMB = 128;          // Transposition table size
    bool verbose = false;           // Print search info

    SearchConfig() = default;
};

/**
 * Main minimax search function with alpha-beta pruning
 *
 * @param board Current game state
 * @param config Search configuration
 * @return Search result with best move and statistics
 */
SearchResult findBestMove(HexukiBitboard& board, const SearchConfig& config = SearchConfig());

/**
 * Simple interface: just search to a specific depth
 */
SearchResult findBestMove(HexukiBitboard& board, int depth, int timeLimitMs = 30000);

/**
 * Alpha-beta search (internal, recursive)
 *
 * @param board Current position
 * @param depth Remaining depth to search
 * @param alpha Alpha value (best for maximizing player)
 * @param beta Beta value (best for minimizing player)
 * @param tt Transposition table
 * @param nodesSearched Counter for nodes visited
 * @param startTime Search start time
 * @param timeLimitMs Time limit
 * @return Evaluation score
 */
int alphaBeta(
    HexukiBitboard& board,
    int depth,
    int alpha,
    int beta,
    TranspositionTable& tt,
    int& nodesSearched,
    std::chrono::steady_clock::time_point startTime,
    int timeLimitMs
);

/**
 * Quiescence search (search until position is "quiet")
 * Helps avoid horizon effect in tactical positions
 */
int quiescence(
    HexukiBitboard& board,
    int alpha,
    int beta,
    TranspositionTable& tt,
    int& nodesSearched
);

/**
 * Move ordering: sort moves to search best ones first
 * Better move ordering = more alpha-beta cutoffs = faster search
 */
void orderMoves(std::vector<Move>& moves, HexukiBitboard& board, const TTEntry* ttEntry = nullptr);

/**
 * Simple evaluation function
 * Returns score from current player's perspective
 */
int evaluate(const HexukiBitboard& board);

} // namespace minimax
} // namespace hexuki

#endif // HEXUKI_MINIMAX_H
