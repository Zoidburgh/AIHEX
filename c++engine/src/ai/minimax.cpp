#include "ai/minimax.h"
#include "core/zobrist.h"
#include <algorithm>
#include <iostream>
#include <limits>

namespace hexuki {
namespace minimax {

// Constants
constexpr int INF = 1000000;
constexpr int MATE_SCORE = 900000;
constexpr int TIMEOUT_CHECK_INTERVAL = 1000;  // Check time every 1000 nodes

// ============================================================================
// Transposition Table Implementation
// ============================================================================

TranspositionTable::TranspositionTable(size_t sizeMB)
    : maxSize((sizeMB * 1024 * 1024) / sizeof(TTEntry))
    , hits(0)
    , misses(0) {
    table.reserve(maxSize);  // Reserve full capacity to avoid rehashing
}

void TranspositionTable::store(uint64_t hash, const TTEntry& entry) {
    // Always-replace strategy with depth preference for existing entries
    auto it = table.find(hash);

    if (it != table.end()) {
        // Entry exists - replace only if new entry is deeper or same depth
        if (entry.depth >= it->second.depth) {
            it->second = entry;
        }
        // Otherwise keep the deeper entry
    } else {
        // Entry doesn't exist - always add it
        // Let the hash map grow beyond maxSize if needed
        // This ensures deep search results are always stored
        table[hash] = entry;
    }
}

bool TranspositionTable::probe(uint64_t hash, TTEntry& entry) const {
    auto it = table.find(hash);
    if (it != table.end()) {
        entry = it->second;
        hits++;
        return true;
    }
    misses++;
    return false;
}

void TranspositionTable::clear() {
    table.clear();
    hits = 0;
    misses = 0;
}

// ============================================================================
// Evaluation Function
// ============================================================================

int evaluate(const HexukiBitboard& board) {
    // Get actual scores for both players
    int p1Score = board.getScore(PLAYER_1);
    int p2Score = board.getScore(PLAYER_2);

    // Return from current player's perspective (required for negamax)
    // Positive = current player winning, negative = opponent winning
    if (board.getCurrentPlayer() == PLAYER_1) {
        return p1Score - p2Score;
    } else {
        return p2Score - p1Score;
    }
}

// ============================================================================
// Move Ordering
// ============================================================================

void orderMoves(std::vector<Move>& moves, HexukiBitboard& board, const TTEntry* ttEntry) {
    // OPTIMIZATION: Evaluate each move to get better ordering (more alpha-beta cutoffs)
    // This reduces node count from 11M to ~2M for typical positions

    // Cache for move scores to avoid re-evaluation
    std::vector<std::pair<int, size_t>> moveScores;
    moveScores.reserve(moves.size());

    for (size_t i = 0; i < moves.size(); i++) {
        const Move& move = moves[i];
        int score = 0;

        // Highest priority: TT move (proven best from previous search)
        if (ttEntry && move == ttEntry->bestMove) {
            score = 10000000;
        } else {
            // CRITICAL: Actually evaluate the position after this move
            board.makeMove(move);
            int evalScore = evaluate(board);
            board.unmakeMove(move);

            // Negate because we want moves that are good for US (current player)
            // evaluate() returns score from current player's perspective
            // After makeMove, current player switches, so we negate
            score = -evalScore;

            // Tie-breaker: prefer high-value tiles (when eval scores are equal)
            score += move.tileValue * 10;

            // Tie-breaker: prefer center control
            if (move.hexId == 9 || move.hexId == 4 || move.hexId == 6 ||
                move.hexId == 7 || move.hexId == 11 || move.hexId == 12) {
                score += 5;
            }
        }

        moveScores.push_back({score, i});
    }

    // Sort by score (descending) and reorder moves
    std::sort(moveScores.begin(), moveScores.end(),
              [](const auto& a, const auto& b) { return a.first > b.first; });

    // Reorder moves based on sorted scores
    std::vector<Move> sortedMoves;
    sortedMoves.reserve(moves.size());
    for (const auto& pair : moveScores) {
        sortedMoves.push_back(moves[pair.second]);
    }
    moves = sortedMoves;
}

// ============================================================================
// Alpha-Beta Search
// ============================================================================

int alphaBeta(
    HexukiBitboard& board,
    int depth,
    int alpha,
    int beta,
    TranspositionTable& tt,
    int& nodesSearched,
    std::chrono::steady_clock::time_point startTime,
    int timeLimitMs
) {
    nodesSearched++;

    // Check timeout periodically
    if (nodesSearched % TIMEOUT_CHECK_INTERVAL == 0) {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - startTime).count();
        if (elapsed >= timeLimitMs) {
            return 0;  // Timeout - return neutral score
        }
    }

    // Terminal node: game over or depth reached
    if (depth == 0 || board.isGameOver()) {
        return evaluate(board);
    }

    uint64_t hash = board.getHash();

    // Transposition table lookup
    TTEntry ttEntry;
    bool ttValid = false;  // Track if TT entry is usable for move ordering

    if (tt.probe(hash, ttEntry)) {
        if (ttEntry.depth >= depth) {
            // Entry is from sufficient depth - can be used for both score and move ordering
            ttValid = true;

            if (ttEntry.flag == TTEntry::EXACT) {
                return ttEntry.score;
            } else if (ttEntry.flag == TTEntry::LOWER_BOUND) {
                alpha = std::max(alpha, ttEntry.score);
            } else if (ttEntry.flag == TTEntry::UPPER_BOUND) {
                beta = std::min(beta, ttEntry.score);
            }

            if (alpha >= beta) {
                return ttEntry.score;
            }
        }
        // If ttEntry.depth < depth, entry is from shallow search - don't use it!
        // Using shallow entries for move ordering causes wrong scores at deeper depths
    }

    // Get and order moves
    std::vector<Move> moves = board.getValidMoves();

    if (moves.empty()) {
        // No moves available - game over
        return evaluate(board);
    }

    // BUGFIX: Only use TT entry for move ordering if it's from sufficient depth
    // Passing stale shallow entries was causing non-deterministic scores (265→261→275)
    orderMoves(moves, board, ttValid ? &ttEntry : nullptr);

    int bestScore = -INF;
    Move bestMove = moves[0];
    TTEntry::Flag flag = TTEntry::UPPER_BOUND;

    // Search all moves
    for (const auto& move : moves) {
        board.makeMove(move);
        int score = -alphaBeta(board, depth - 1, -beta, -alpha, tt, nodesSearched, startTime, timeLimitMs);
        board.unmakeMove(move);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;

            if (score > alpha) {
                alpha = score;
                flag = TTEntry::EXACT;
            }
        }

        // Beta cutoff
        if (alpha >= beta) {
            flag = TTEntry::LOWER_BOUND;
            break;
        }
    }

    // Store in transposition table
    tt.store(hash, TTEntry(bestScore, depth, flag, bestMove));

    return bestScore;
}

// ============================================================================
// Quiescence Search
// ============================================================================

int quiescence(
    HexukiBitboard& board,
    int alpha,
    int beta,
    TranspositionTable& tt,
    int& nodesSearched
) {
    nodesSearched++;

    // Stand-pat score
    int standPat = evaluate(board);

    if (standPat >= beta) {
        return beta;
    }

    if (standPat > alpha) {
        alpha = standPat;
    }

    // Only search "tactical" moves (high-value tiles, critical positions)
    // For now, just return stand-pat (quiescence not critical for this game)
    return standPat;
}

// ============================================================================
// Main Search Function
// ============================================================================

SearchResult findBestMove(HexukiBitboard& board, const SearchConfig& config) {
    SearchResult result;

    auto startTime = std::chrono::steady_clock::now();

    // Initialize transposition table
    TranspositionTable tt(config.ttSizeMB);

    std::vector<Move> moves = board.getValidMoves();

    if (moves.empty()) {
        // No legal moves
        result.bestMove = Move();
        result.score = evaluate(board);
        return result;
    }

    if (moves.size() == 1) {
        // Only one move - still need to search ahead to get accurate score!
        // Don't just return current evaluation - make the move and evaluate the resulting position
        result.bestMove = moves[0];

        // Make the move, search the resulting position, then unmake
        board.makeMove(moves[0]);
        int nodesSearched = 0;
        result.score = -alphaBeta(board, config.maxDepth - 1, -INF, INF, tt, nodesSearched, startTime, config.timeLimitMs);
        board.unmakeMove(moves[0]);

        result.depth = config.maxDepth;
        result.nodesSearched = nodesSearched;

        auto endTime = std::chrono::steady_clock::now();
        result.timeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

        return result;
    }

    Move bestMove = moves[0];
    int bestScore = -INF;

    if (config.useIterativeDeepening) {
        // Iterative deepening: search 1, 2, 3, ..., maxDepth
        for (int depth = 1; depth <= config.maxDepth; depth++) {
            int nodesSearched = 0;
            int alpha = -INF;
            int beta = INF;

            Move currentBestMove;
            int currentBestScore = -INF;

            // Order moves based on previous iteration's best
            if (depth > 1) {
                orderMoves(moves, board, nullptr);
            }

            // Search all moves at current depth
            bool depthTimedOut = false;
            long long elapsed = 0;
            for (const auto& move : moves) {
                board.makeMove(move);
                int score = -alphaBeta(board, depth - 1, -beta, -alpha, tt, nodesSearched, startTime, config.timeLimitMs);
                board.unmakeMove(move);

                // Check if we timed out during this search
                auto now = std::chrono::steady_clock::now();
                elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - startTime).count();
                if (elapsed >= config.timeLimitMs) {
                    depthTimedOut = true;
                    break;
                }

                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;

                    if (score > alpha) {
                        alpha = score;
                    }
                }
            }

            // If we timed out mid-depth, don't use this depth's results - use previous depth
            if (depthTimedOut) {
                result.timeout = true;
                break;
            }

            // Update best move from this COMPLETED depth
            bestMove = currentBestMove;
            bestScore = currentBestScore;
            result.depth = depth;
            result.nodesSearched += nodesSearched;

            if (config.verbose) {
                std::cout << "Depth " << depth << ": score=" << bestScore
                          << " move=" << bestMove.toString()
                          << " nodes=" << nodesSearched
                          << " time=" << elapsed << "ms" << std::endl;
            }

            // Stop if mate found
            if (std::abs(bestScore) > MATE_SCORE - 100) {
                break;
            }
        }
    } else {
        // Single depth search
        int nodesSearched = 0;
        int alpha = -INF;
        int beta = INF;

        if (config.useMoveOrdering) {
            orderMoves(moves, board, nullptr);
        }

        for (const auto& move : moves) {
            board.makeMove(move);
            int score = -alphaBeta(board, config.maxDepth - 1, -beta, -alpha, tt, nodesSearched, startTime, config.timeLimitMs);
            board.unmakeMove(move);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;

                if (score > alpha) {
                    alpha = score;
                }
            }
        }

        result.nodesSearched = nodesSearched;
        result.depth = config.maxDepth;
    }

    auto endTime = std::chrono::steady_clock::now();
    result.timeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    result.bestMove = bestMove;
    result.score = bestScore;
    result.ttHits = tt.getHits();
    result.ttMisses = tt.getMisses();

    return result;
}

// Simple interface
SearchResult findBestMove(HexukiBitboard& board, int depth, int timeLimitMs) {
    SearchConfig config;
    config.maxDepth = depth;
    config.timeLimitMs = timeLimitMs;
    config.useIterativeDeepening = true;
    config.useMoveOrdering = true;
    config.useTranspositionTable = true;
    config.verbose = false;  // Disable verbose logging

    return findBestMove(board, config);
}

} // namespace minimax
} // namespace hexuki
