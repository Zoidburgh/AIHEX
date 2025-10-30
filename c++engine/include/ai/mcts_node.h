#ifndef HEXUKI_MCTS_NODE_H
#define HEXUKI_MCTS_NODE_H

#include "core/move.h"
#include <vector>
#include <memory>

namespace hexuki {
namespace mcts {

/**
 * MCTS Tree Node
 *
 * Each node represents a game state after making a move.
 * Stores statistics for UCT (Upper Confidence Bound for Trees) selection.
 */
class MCTSNode {
public:
    // Constructor
    MCTSNode(MCTSNode* parent = nullptr, const Move& move = Move());

    // Destructor (cleanup children)
    ~MCTSNode();

    // Tree structure
    MCTSNode* parent;
    std::vector<MCTSNode*> children;
    Move move;  // The move that led to this node (empty for root)
    int playerToMove;     // Which player moves at this node (1 or 2)

    // MCTS statistics
    int visits;           // Number of times this node was visited
    double totalScore;    // Sum of scores from simulations

    // Unexpanded moves (moves we haven't created child nodes for yet)
    std::vector<Move> untriedMoves;

    // Node state
    bool isFullyExpanded() const { return untriedMoves.empty(); }
    bool isLeaf() const { return children.empty(); }
    bool hasChildren() const { return !children.empty(); }

    // UCT calculation (Upper Confidence Bound for Trees)
    // Formula: wins/visits + C * sqrt(ln(parent_visits) / visits)
    // Higher = better to explore this node
    double getUCTValue(double explorationConstant) const;

    // Select best child using UCT
    MCTSNode* selectBestChild(double explorationConstant) const;

    // Add a child node for a given move
    MCTSNode* addChild(const Move& move);

    // Get average score (wins per visit)
    double getAverageScore() const {
        return visits > 0 ? totalScore / visits : 0.0;
    }

    // Update statistics after simulation
    void update(double score);

    // Delete all children (for memory cleanup)
    void deleteChildren();
};

} // namespace mcts
} // namespace hexuki

#endif // HEXUKI_MCTS_NODE_H
