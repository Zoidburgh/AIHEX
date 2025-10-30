#include "ai/mcts_node.h"
#include <cmath>
#include <algorithm>
#include <limits>

namespace hexuki {
namespace mcts {

MCTSNode::MCTSNode(MCTSNode* parent, const Move& move)
    : parent(parent)
    , move(move)
    , playerToMove(0)  // Will be set by MCTS::expand()
    , visits(0)
    , totalScore(0.0) {
}

MCTSNode::~MCTSNode() {
    deleteChildren();
}

void MCTSNode::deleteChildren() {
    for (MCTSNode* child : children) {
        delete child;
    }
    children.clear();
}

double MCTSNode::getUCTValue(double explorationConstant) const {
    if (visits == 0) {
        return std::numeric_limits<double>::infinity();  // Unvisited nodes have infinite UCT
    }

    if (parent == nullptr || parent->visits == 0) {
        return getAverageScore();  // Root node or parent not visited
    }

    // UCT formula: exploitation + exploration
    // Child nodes store wins from THEIR perspective (opponent's turn)
    // We want children with LOW scores (bad for opponent = good for us)
    // So invert: 1.0 - childScore to prefer children where opponent loses
    double exploitation = 1.0 - getAverageScore();
    double exploration = explorationConstant * std::sqrt(std::log(parent->visits) / visits);

    return exploitation + exploration;
}

MCTSNode* MCTSNode::selectBestChild(double explorationConstant) const {
    if (children.empty()) {
        return nullptr;
    }

    MCTSNode* bestChild = nullptr;
    double bestValue = -std::numeric_limits<double>::infinity();

    for (MCTSNode* child : children) {
        double uctValue = child->getUCTValue(explorationConstant);

        if (uctValue > bestValue) {
            bestValue = uctValue;
            bestChild = child;
        }
    }

    return bestChild;
}

MCTSNode* MCTSNode::addChild(const Move& move) {
    MCTSNode* child = new MCTSNode(this, move);
    children.push_back(child);
    return child;
}

void MCTSNode::update(double score) {
    visits++;
    totalScore += score;
}

} // namespace mcts
} // namespace hexuki
