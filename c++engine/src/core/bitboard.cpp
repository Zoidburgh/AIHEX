#include "core/bitboard.h"
#include "core/zobrist.h"
#include "utils/timer.h"
#include <iostream>
#include <sstream>
#include <algorithm>
#include <cstring>
#include <set>

#ifdef _MSC_VER
#include <intrin.h>
#endif

namespace hexuki {

// ============================================================================
// Helper Functions
// ============================================================================

// Check if two tile vectors are identical (same values in any order)
static bool tilesMatch(std::vector<int> tiles1, std::vector<int> tiles2) {
    if (tiles1.size() != tiles2.size()) return false;
    std::sort(tiles1.begin(), tiles1.end());
    std::sort(tiles2.begin(), tiles2.end());
    return tiles1 == tiles2;
}

// ============================================================================
// Constructor & Reset
// ============================================================================

HexukiBitboard::HexukiBitboard()
    : hexOccupied(0)
    , hexValues{}
    , p1AvailableTiles(ALL_TILES_MASK)  // All tiles 1-NUM_TILE_VALUES available
    , p2AvailableTiles(ALL_TILES_MASK)
    , currentPlayer(PLAYER_1)
    , symmetryStillPossible(true)
    , tilesAreIdentical(true)
    , cachedP1Score(0)
    , cachedP2Score(0)
    , zobristHash(0)
{
    reset();
}

void HexukiBitboard::reset() {
    // Clear board
    hexOccupied = 0;
    std::memset(hexValues, 0, sizeof(hexValues));

    // Reset available tiles (all tiles 1-9 available)
    // Array-based: supports standard [1,2,3,4,5,6,7,8,9] and asymmetric sets
    p1AvailableTiles = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    p2AvailableTiles = {1, 2, 3, 4, 5, 6, 7, 8, 9};

    // Initial state: center hex (9) has tile value 1
    hexOccupied = (1u << CENTER_HEX);
    hexValues[CENTER_HEX] = STARTING_TILE;

    currentPlayer = PLAYER_1;
    symmetryStillPossible = true;
    tilesAreIdentical = tilesMatch(p1AvailableTiles, p2AvailableTiles);

    // Calculate initial scores (center hex = value 1)
    cachedP1Score = calculatePlayerScore(PLAYER_1);
    cachedP2Score = calculatePlayerScore(PLAYER_2);

    zobristHash = Zobrist::hash(*this);
}

// ============================================================================
// State Queries
// ============================================================================

// isHexOccupied() and getTileValue() are now inlined in bitboard.h for performance

bool HexukiBitboard::isGameOver() const {
    // Game ends when all 19 hexes are filled
    // Can't use moveCount >= 18 because puzzles might have empty center hex (allowing 19 moves)
    int occupiedCount = 0;
    for (int i = 0; i < NUM_HEXES; i++) {
        if (isHexOccupied(i)) occupiedCount++;
    }
    return occupiedCount >= NUM_HEXES;
}

bool HexukiBitboard::isTileAvailable(int player, int tileValue) const {
    if (tileValue < 1 || tileValue > MAX_TILE_VALUE) return false;
    const std::vector<int>& tiles = (player == PLAYER_1) ? p1AvailableTiles : p2AvailableTiles;
    // Use std::find to check if tile value exists in array (supports duplicates)
    return std::find(tiles.begin(), tiles.end(), tileValue) != tiles.end();
}

std::vector<int> HexukiBitboard::getAvailableTiles(int player) const {
    // Simply return the tile array (already supports duplicates)
    return (player == PLAYER_1) ? p1AvailableTiles : p2AvailableTiles;
}

// ============================================================================
// Adjacency (REAL hex grid adjacency)
// ============================================================================

int HexukiBitboard::findHexAt(int row, int col) const {
    // PERFORMANCE OPTIMIZATION: O(1) lookup instead of O(19) linear search
    // This function is called 100-500 MILLION times during depth-10 minimax!
    // Before: 19 comparisons per call = billions of operations
    // After: 1 array lookup = millions of operations (5-10x speedup)

    // Bounds check (safety)
    if (row < 0 || row >= 9 || col < 0 || col >= 5) {
        return -1;
    }

    // Direct O(1) lookup from pre-computed table
    return ROW_COL_TO_HEX[row][col];  // Returns -1 if no hex at this position
}

std::vector<int> HexukiBitboard::getAdjacentHexes(int hexId) const {
    std::vector<int> adjacent;
    if (hexId < 0 || hexId >= NUM_HEXES) return adjacent;

    const HexPosition& hex = HEX_POSITIONS[hexId];

    // Check all 6 hex directions
    for (int i = 0; i < 6; i++) {
        int newRow = hex.row + HEX_DIRECTIONS[i].dr;
        int newCol = hex.col + HEX_DIRECTIONS[i].dc;

        int adjId = findHexAt(newRow, newCol);
        if (adjId >= 0) {
            adjacent.push_back(adjId);
        }
    }

    return adjacent;
}

bool HexukiBitboard::hasAdjacentOccupied(int hexId) const {
    // PERFORMANCE: Use pre-computed lookup table (no heap allocation!)
    if (hexId < 0 || hexId >= NUM_HEXES) return false;

    const AdjacentList& adj = ADJACENT_HEXES[hexId];
    for (int i = 0; i < adj.count; i++) {
        if (isHexOccupied(adj.hexes[i])) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// Chain Length Constraint (REAL algorithm from JavaScript)
// ============================================================================

std::vector<int> HexukiBitboard::getChainLengthsFromStart(int startHex, const Direction& dir) const {
    std::vector<int> lengths;
    int currentLength = 0;
    int currentHex = startHex;

    while (currentHex >= 0) {
        if (isHexOccupied(currentHex)) {
            currentLength++;
        } else if (currentLength > 0) {
            // Hit empty cell, record current chain and reset
            lengths.push_back(currentLength);
            currentLength = 0;
        }

        // Move to next cell in direction
        const HexPosition& pos = HEX_POSITIONS[currentHex];
        int newRow = pos.row + dir.dr;
        int newCol = pos.col + dir.dc;
        currentHex = findHexAt(newRow, newCol);
    }

    // Record final chain if we ended on occupied cells
    if (currentLength > 0) {
        lengths.push_back(currentLength);
    }

    return lengths;
}

std::vector<int> HexukiBitboard::getAllChainLengths() const {
    std::vector<int> chainLengths;

    // Check all chain starters
    for (int i = 0; i < 15; i++) {
        const ChainStarter& starter = CHAIN_STARTERS[i];
        auto lengths = getChainLengthsFromStart(starter.startHex, starter.dir);
        chainLengths.insert(chainLengths.end(), lengths.begin(), lengths.end());
    }

    return chainLengths;
}

std::vector<HexukiBitboard::ChainInfo> HexukiBitboard::getAllChainsWithMembers() const {
    std::vector<ChainInfo> chains;

    // Check all chain starters
    for (int i = 0; i < 15; i++) {
        const ChainStarter& starter = CHAIN_STARTERS[i];
        std::vector<int> currentChain;
        int currentHex = starter.startHex;

        while (currentHex >= 0) {
            if (isHexOccupied(currentHex)) {
                currentChain.push_back(currentHex);
            } else if (!currentChain.empty()) {
                // Hit empty cell, record current chain and reset
                ChainInfo info;
                info.length = currentChain.size();
                info.hexIds = currentChain;
                chains.push_back(info);
                currentChain.clear();
            }

            // Move to next cell in direction
            const HexPosition& pos = HEX_POSITIONS[currentHex];
            int newRow = pos.row + starter.dir.dr;
            int newCol = pos.col + starter.dir.dc;
            currentHex = findHexAt(newRow, newCol);
        }

        // Record final chain if we ended on occupied cells
        if (!currentChain.empty()) {
            ChainInfo info;
            info.length = currentChain.size();
            info.hexIds = currentChain;
            chains.push_back(info);
        }
    }

    // Find isolated tiles (occupied hexes not part of any detected chain)
    std::set<int> hexesInChains;
    for (const auto& chain : chains) {
        for (int hexId : chain.hexIds) {
            hexesInChains.insert(hexId);
        }
    }

    // Add isolated tiles as 1-chains
    for (int hexId = 0; hexId < NUM_HEXES; hexId++) {
        if (isHexOccupied(hexId) && hexesInChains.find(hexId) == hexesInChains.end()) {
            ChainInfo info;
            info.length = 1;
            info.hexIds = {hexId};
            chains.push_back(info);
        }
    }

    return chains;
}

void HexukiBitboard::getFirstAndSecondChainLengths(int& first, int& second) const {
    auto allLengths = getAllChainLengths();
    first = 0;
    second = 0;

    for (int length : allLengths) {
        if (length > first) {
            second = first;
            first = length;
        } else if (length > second) {
            second = length;
        }
    }
}

bool HexukiBitboard::checkChainLengthConstraint(int hexId) const {
    // OPTIMIZATION: Walk chains directly instead of calling getAllChainsWithMembers()
    // This eliminates 324 million vector allocations during depth-10 search

    // Save original state
    uint8_t savedValue = hexValues[hexId];
    uint32_t savedOccupied = hexOccupied;

    // Temporarily place tile
    const_cast<HexukiBitboard*>(this)->hexOccupied |= (1u << hexId);
    const_cast<HexukiBitboard*>(this)->hexValues[hexId] = 1;

    // Walk all 15 chain directions, tracking lengths inline
    int maxLength = 0;
    int secondMaxLength = 0;
    int longestAffected = 0;  // Longest chain containing hexId

    for (int i = 0; i < 15; i++) {
        const ChainStarter& starter = CHAIN_STARTERS[i];
        int currentLength = 0;
        int currentHex = starter.startHex;
        bool chainContainsHexId = false;

        // Walk this chain direction
        while (currentHex >= 0) {
            if (isHexOccupied(currentHex)) {
                currentLength++;
                if (currentHex == hexId) {
                    chainContainsHexId = true;
                }
            } else if (currentLength > 0) {
                // Chain ended - update max/secondMax
                if (currentLength > maxLength) {
                    secondMaxLength = maxLength;
                    maxLength = currentLength;
                } else if (currentLength > secondMaxLength) {
                    secondMaxLength = currentLength;
                }

                // Track longest affected
                if (chainContainsHexId && currentLength > longestAffected) {
                    longestAffected = currentLength;
                }

                // Reset for next chain segment
                currentLength = 0;
                chainContainsHexId = false;
            }

            // Move to next hex in this direction
            const HexPosition& pos = HEX_POSITIONS[currentHex];
            int newRow = pos.row + starter.dir.dr;
            int newCol = pos.col + starter.dir.dc;
            currentHex = findHexAt(newRow, newCol);
        }

        // Handle chain that extends to edge of board
        if (currentLength > 0) {
            if (currentLength > maxLength) {
                secondMaxLength = maxLength;
                maxLength = currentLength;
            } else if (currentLength > secondMaxLength) {
                secondMaxLength = currentLength;
            }

            if (chainContainsHexId && currentLength > longestAffected) {
                longestAffected = currentLength;
            }
        }
    }

    // Restore original state
    const_cast<HexukiBitboard*>(this)->hexValues[hexId] = savedValue;
    const_cast<HexukiBitboard*>(this)->hexOccupied = savedOccupied;

    // Apply same constraint rule as before
    // Rule: longest affected chain can be at most 1 longer than second longest
    if (longestAffected > secondMaxLength + 1) {
        return false;
    }

    return true;
}

// ============================================================================
// Anti-Symmetry Rule (REAL algorithm from JavaScript)
// ============================================================================

bool HexukiBitboard::isBoardMirrored() const {
    // If symmetry already broken, no need to check
    if (!symmetryStillPossible) {
        return false;
    }

    // Check if board is currently symmetric
    for (int hexId = 0; hexId < NUM_HEXES; hexId++) {
        // Skip center column hexes (they mirror to themselves)
        bool isCenterHex = false;
        for (int i = 0; i < 5; i++) {
            if (hexId == CENTER_COLUMN_HEXES[i]) {
                isCenterHex = true;
                break;
            }
        }
        if (isCenterHex) continue;

        int mirrorHexId = VERTICAL_MIRROR_PAIRS[hexId];
        int val1 = hexValues[hexId];
        int val2 = hexValues[mirrorHexId];

        // If one is empty and the other isn't, not currently symmetric
        if ((val1 == 0) != (val2 == 0)) {
            return false;
        }

        // If both occupied but different values, not symmetric AND never will be
        if (val1 != 0 && val2 != 0 && val1 != val2) {
            // NOTE: We can't modify symmetryStillPossible here (const function)
            // This will be handled in the non-const version
            return false;
        }
    }

    return true;  // Board is currently symmetric
}

// ============================================================================
// Move Validation (REAL rules from JavaScript)
// ============================================================================

bool HexukiBitboard::isMoveLegal(int hexId) const {
    // Check if hex is empty
    if (isHexOccupied(hexId)) {
        return false;
    }

    // Check if adjacent to an occupied hex
    if (!hasAdjacentOccupied(hexId)) {
        return false;
    }

    // Check chain length constraint
    if (!checkChainLengthConstraint(hexId)) {
        return false;
    }

    return true;
}

bool HexukiBitboard::isValidMove(const Move& move) const {
    if (!move.isValid()) return false;

    // Check if position is legal
    if (!isMoveLegal(move.hexId)) {
        return false;
    }

    // Check if tile is available
    if (!isTileAvailable(currentPlayer, move.tileValue)) {
        return false;
    }

    // Symmetry checks removed - no longer enforcing anti-symmetry rule

    return true;
}

std::vector<Move> HexukiBitboard::getValidMoves() const {
    std::vector<Move> moves;

    // OPTIMIZATION: Use const reference to avoid copying the tiles vector
    const std::vector<int>& availableTiles = (currentPlayer == PLAYER_1) ? p1AvailableTiles : p2AvailableTiles;

    // Get unique tile values (handle duplicates like [1,1,1,1,1,1,1,1,1])
    // If tiles = [1,1,1], we only want to try placing "1" once, not three times
    // OPTIMIZATION: Reserve capacity to avoid reallocations
    std::vector<int> uniqueTileValues;
    uniqueTileValues.reserve(9);  // Max 9 unique tiles

    // Manual deduplication (faster than copy+sort+unique for small vectors)
    for (int tile : availableTiles) {
        if (std::find(uniqueTileValues.begin(), uniqueTileValues.end(), tile) == uniqueTileValues.end()) {
            uniqueTileValues.push_back(tile);
        }
    }

    // Symmetry checks removed - no longer enforcing anti-symmetry rule

    for (int hexId = 0; hexId < NUM_HEXES; hexId++) {
        if (isHexOccupied(hexId)) continue;

        if (isMoveLegal(hexId)) {
            // Try each unique tile value (avoids generating duplicate moves)
            for (int tileValue : uniqueTileValues) {
                // Add all valid moves without symmetry checks
                moves.push_back(Move(hexId, tileValue));
            }
        }
    }

    return moves;
}

// ============================================================================
// Move Execution
// ============================================================================

void HexukiBitboard::makeMove(const Move& move) {
    // INCREMENTAL SCORING: Calculate old chain scores before placing tile
    const HexChains& chains = HEX_TO_CHAINS[move.hexId];
    int oldP1ChainScore = calculateChainScore(P1_CHAINS[chains.p1ChainIndex], P1_CHAIN_LENGTHS[chains.p1ChainIndex]);
    int oldP2ChainScore = calculateChainScore(P2_CHAINS[chains.p2ChainIndex], P2_CHAIN_LENGTHS[chains.p2ChainIndex]);

    // Place tile on board
    hexOccupied |= (1u << move.hexId);
    hexValues[move.hexId] = move.tileValue;

    // INCREMENTAL SCORING: Calculate new chain scores after placing tile
    int newP1ChainScore = calculateChainScore(P1_CHAINS[chains.p1ChainIndex], P1_CHAIN_LENGTHS[chains.p1ChainIndex]);
    int newP2ChainScore = calculateChainScore(P2_CHAINS[chains.p2ChainIndex], P2_CHAIN_LENGTHS[chains.p2ChainIndex]);

    // Update cached scores with delta (only affected chains changed)
    cachedP1Score += (newP1ChainScore - oldP1ChainScore);
    cachedP2Score += (newP2ChainScore - oldP2ChainScore);

    // Remove tile from current player's available tiles
    std::vector<int>& tiles = (currentPlayer == PLAYER_1) ? p1AvailableTiles : p2AvailableTiles;
    auto it = std::find(tiles.begin(), tiles.end(), move.tileValue);
    if (it != tiles.end()) {
        tiles.erase(it);  // Remove first occurrence
    }

    // BUGFIX: Symmetry tracking removed - was causing non-deterministic minimax results
    // The symmetryStillPossible flag was being modified here but NOT restored in unmakeMove,
    // causing board state corruption when move ordering called makeMove/unmakeMove repeatedly.
    // This led to different minimax scores for the same position (e.g., +265, +261, +275).

    // Update zobrist hash
    updateZobristHash(move);

    // Switch to next player
    currentPlayer = (currentPlayer == PLAYER_1) ? PLAYER_2 : PLAYER_1;
}

void HexukiBitboard::unmakeMove(const Move& move) {
    // Switch player back (undo the player switch from makeMove)
    currentPlayer = (currentPlayer == PLAYER_1) ? PLAYER_2 : PLAYER_1;

    // Reverse zobrist hash update (XOR is self-inverse)
    updateZobristHash(move);

    // Add tile back to player's available tiles
    std::vector<int>& tiles = (currentPlayer == PLAYER_1) ? p1AvailableTiles : p2AvailableTiles;
    tiles.push_back(move.tileValue);

    // INCREMENTAL SCORING: Calculate chain scores before removing tile
    const HexChains& chains = HEX_TO_CHAINS[move.hexId];
    int oldP1ChainScore = calculateChainScore(P1_CHAINS[chains.p1ChainIndex], P1_CHAIN_LENGTHS[chains.p1ChainIndex]);
    int oldP2ChainScore = calculateChainScore(P2_CHAINS[chains.p2ChainIndex], P2_CHAIN_LENGTHS[chains.p2ChainIndex]);

    // Clear tile from board
    hexOccupied &= ~(1u << move.hexId);
    hexValues[move.hexId] = 0;

    // INCREMENTAL SCORING: Calculate chain scores after removing tile
    int newP1ChainScore = calculateChainScore(P1_CHAINS[chains.p1ChainIndex], P1_CHAIN_LENGTHS[chains.p1ChainIndex]);
    int newP2ChainScore = calculateChainScore(P2_CHAINS[chains.p2ChainIndex], P2_CHAIN_LENGTHS[chains.p2ChainIndex]);

    // Update cached scores with delta
    cachedP1Score += (newP1ChainScore - oldP1ChainScore);
    cachedP2Score += (newP2ChainScore - oldP2ChainScore);

    // Note: symmetryStillPossible is not restored since symmetry checks are disabled
    // If symmetry is re-enabled later, this would need to track the previous state
}

// ============================================================================
// Scoring (REAL chain-based multiplication)
// ============================================================================

int HexukiBitboard::calculateChainScore(const int* chain, int chainLength) const {
    int product = 1;

    for (int i = 0; i < chainLength; i++) {
        int hexId = chain[i];
        if (hexId < 0) break;  // -1 padding in chain array

        if (isHexOccupied(hexId)) {
            product *= hexValues[hexId];
        }
    }

    return product;
}

int HexukiBitboard::calculatePlayerScore(int player) const {
    int totalScore = 0;

    if (player == PLAYER_1) {
        // P1 chains: down-right diagonals
        for (int i = 0; i < P1_CHAIN_COUNT; i++) {
            int chainScore = calculateChainScore(P1_CHAINS[i], P1_CHAIN_LENGTHS[i]);
            totalScore += chainScore;
        }
    } else {
        // P2 chains: down-left diagonals
        for (int i = 0; i < P2_CHAIN_COUNT; i++) {
            int chainScore = calculateChainScore(P2_CHAINS[i], P2_CHAIN_LENGTHS[i]);
            totalScore += chainScore;
        }
    }

    return totalScore;
}

int HexukiBitboard::getScore(int player) const {
    // INCREMENTAL SCORING: Return cached value instead of recalculating
    // This eliminates 26M score recalculations at depth 10
    return (player == PLAYER_1) ? cachedP1Score : cachedP2Score;
}

// ============================================================================
// Zobrist Hashing
// ============================================================================

void HexukiBitboard::updateZobristHash(const Move& move) {
    // XOR in the hash for this tile placement
    zobristHash ^= Zobrist::getTileHash(move.hexId, move.tileValue);

    // XOR in player-to-move hash
    zobristHash ^= Zobrist::getPlayerHash(currentPlayer);
}

// ============================================================================
// Debug & Utility
// ============================================================================

void HexukiBitboard::print() const {
    // Count occupied hexes for move count
    int occupiedCount = 0;
    for (int i = 0; i < NUM_HEXES; i++) {
        if (isHexOccupied(i)) occupiedCount++;
    }

    std::cout << "=== Hexuki Board State ===" << std::endl;
    std::cout << "Occupied: " << occupiedCount << "/" << NUM_HEXES << ", Player: P" << currentPlayer << std::endl;
    std::cout << "Scores: P1=" << getScore(PLAYER_1) << ", P2=" << getScore(PLAYER_2) << std::endl;
    std::cout << std::endl;

    std::cout << "Occupied hexes:" << std::endl;
    for (int hexId = 0; hexId < NUM_HEXES; hexId++) {
        if (!isHexOccupied(hexId)) continue;

        std::cout << "  Hex " << hexId << " (row=" << HEX_POSITIONS[hexId].row
                  << ", col=" << HEX_POSITIONS[hexId].col << "): "
                  << "value=" << static_cast<int>(hexValues[hexId]) << std::endl;
    }
    std::cout << std::endl;

    std::cout << "Available tiles:" << std::endl;
    auto p1Tiles = getAvailableTiles(PLAYER_1);
    auto p2Tiles = getAvailableTiles(PLAYER_2);

    std::cout << "  P1: [";
    for (size_t i = 0; i < p1Tiles.size(); i++) {
        std::cout << p1Tiles[i];
        if (i < p1Tiles.size() - 1) std::cout << ", ";
    }
    std::cout << "]" << std::endl;

    std::cout << "  P2: [";
    for (size_t i = 0; i < p2Tiles.size(); i++) {
        std::cout << p2Tiles[i];
        if (i < p2Tiles.size() - 1) std::cout << ", ";
    }
    std::cout << "]" << std::endl;

    std::cout << "=========================" << std::endl;
}

std::string HexukiBitboard::toNotation() const {
    // Note: Move history is no longer tracked for performance reasons
    // This function returns empty string. Use savePosition() for current state.
    return "";
}

// ============================================================================
// Puzzle Setup
// ============================================================================

void HexukiBitboard::setHexValue(int hexId, int tileValue) {
    if (hexId < 0 || hexId >= NUM_HEXES) return;

    // Place the tile
    hexOccupied |= (1u << hexId);
    hexValues[hexId] = tileValue;

    // BUGFIX: Recalculate cached scores (puzzle loading doesn't use makeMove)
    cachedP1Score = calculatePlayerScore(PLAYER_1);
    cachedP2Score = calculatePlayerScore(PLAYER_2);

    // Recalculate hash
    zobristHash = Zobrist::hash(*this);
}

void HexukiBitboard::removeHexValue(int hexId) {
    if (hexId < 0 || hexId >= NUM_HEXES) return;

    // Remove the tile
    hexOccupied &= ~(1u << hexId);
    hexValues[hexId] = 0;

    // BUGFIX: Recalculate cached scores
    cachedP1Score = calculatePlayerScore(PLAYER_1);
    cachedP2Score = calculatePlayerScore(PLAYER_2);

    // Recalculate hash
    zobristHash = Zobrist::hash(*this);
}

void HexukiBitboard::setAvailableTiles(int player, const std::vector<int>& tiles) {
    // Directly assign tile vector (supports duplicates like [1,1,1,1,1,1,1,1,1])
    if (player == PLAYER_1) {
        p1AvailableTiles = tiles;
    } else if (player == PLAYER_2) {
        p2AvailableTiles = tiles;
    }
}

void HexukiBitboard::clearBoard() {
    // Clear all tiles but keep player and move count
    hexOccupied = 0;
    std::memset(hexValues, 0, sizeof(hexValues));

    // BUGFIX: Reset cached scores to 0
    cachedP1Score = 0;
    cachedP2Score = 0;

    zobristHash = Zobrist::hash(*this);
}

void HexukiBitboard::loadPosition(const std::string& position) {
    // Clear everything first
    clearBoard();
    p1AvailableTiles = {1, 2, 3, 4, 5, 6, 7, 8, 9};  // Default: all tiles 1-9 available
    p2AvailableTiles = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    currentPlayer = PLAYER_1;

    // Parse format: "h0:1,h4:5,h9:1|p1:2,3,4|p2:6,7,8|turn:1"
    std::istringstream iss(position);
    std::string section;

    bool p1Specified = false;
    bool p2Specified = false;

    while (std::getline(iss, section, '|')) {
        if (section.empty()) continue;

        // Parse hex placements: h0:1,h4:5
        if (section[0] == 'h') {
            std::istringstream hexStream(section);
            std::string hexPair;
            while (std::getline(hexStream, hexPair, ',')) {
                if (hexPair.size() < 4) continue;

                // Parse "h6:5" → hex 6, tile 5
                size_t colonPos = hexPair.find(':');
                if (colonPos == std::string::npos) continue;

                int hexId = std::stoi(hexPair.substr(1, colonPos - 1));
                int tileVal = std::stoi(hexPair.substr(colonPos + 1));

                setHexValue(hexId, tileVal);
            }
        }
        // Parse player 1 tiles: p1:2,3,4
        else if (section.substr(0, 3) == "p1:") {
            p1Specified = true;
            std::istringstream tileStream(section.substr(3));
            std::vector<int> tiles;
            std::string tileStr;
            while (std::getline(tileStream, tileStr, ',')) {
                tiles.push_back(std::stoi(tileStr));
            }
            setAvailableTiles(PLAYER_1, tiles);
        }
        // Parse player 2 tiles: p2:6,7,8
        else if (section.substr(0, 3) == "p2:") {
            p2Specified = true;
            std::istringstream tileStream(section.substr(3));
            std::vector<int> tiles;
            std::string tileStr;
            while (std::getline(tileStream, tileStr, ',')) {
                tiles.push_back(std::stoi(tileStr));
            }
            setAvailableTiles(PLAYER_2, tiles);
        }
        // Parse turn: turn:1
        else if (section.substr(0, 5) == "turn:") {
            currentPlayer = std::stoi(section.substr(5));
        }
    }

    // Recalculate symmetryStillPossible based on current board state
    // Symmetry is impossible if any mirror pair has different values
    symmetryStillPossible = true;
    for (int hexId = 0; hexId < NUM_HEXES; hexId++) {
        // Skip center column hexes (they mirror to themselves)
        bool isCenterHex = false;
        for (int i = 0; i < 5; i++) {
            if (hexId == CENTER_COLUMN_HEXES[i]) {
                isCenterHex = true;
                break;
            }
        }
        if (isCenterHex) continue;

        int mirrorHexId = VERTICAL_MIRROR_PAIRS[hexId];
        int val1 = hexValues[hexId];
        int val2 = hexValues[mirrorHexId];

        // If both occupied but different values, symmetry is impossible
        if (val1 != 0 && val2 != 0 && val1 != val2) {
            symmetryStillPossible = false;
            break;
        }
    }

    // Check if both players have identical starting tiles
    tilesAreIdentical = tilesMatch(p1AvailableTiles, p2AvailableTiles);

    // Recalculate hash
    zobristHash = Zobrist::hash(*this);
}

std::string HexukiBitboard::savePosition() const {
    std::ostringstream oss;

    // Save hex placements
    bool firstHex = true;
    for (int hexId = 0; hexId < NUM_HEXES; hexId++) {
        if (isHexOccupied(hexId)) {
            if (!firstHex) oss << ",";
            oss << "h" << hexId << ":" << static_cast<int>(hexValues[hexId]);
            firstHex = false;
        }
    }

    // Save player 1 available tiles
    oss << "|p1:";
    auto p1Tiles = getAvailableTiles(PLAYER_1);
    for (size_t i = 0; i < p1Tiles.size(); i++) {
        if (i > 0) oss << ",";
        oss << p1Tiles[i];
    }

    // Save player 2 available tiles
    oss << "|p2:";
    auto p2Tiles = getAvailableTiles(PLAYER_2);
    for (size_t i = 0; i < p2Tiles.size(); i++) {
        if (i > 0) oss << ",";
        oss << p2Tiles[i];
    }

    // Save current player
    oss << "|turn:" << currentPlayer;

    return oss.str();
}

} // namespace hexuki
