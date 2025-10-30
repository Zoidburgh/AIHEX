/**
 * WebAssembly Interface for Hexuki C++ Engine
 *
 * This file provides C-style functions that can be called from JavaScript
 * Emscripten will compile these to WebAssembly and generate JS bindings
 */

#include "core/bitboard.h"
#include "core/zobrist.h"
#include "core/move.h"
#include "ai/mcts.h"
#include "ai/minimax.h"
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <string>
#include <vector>

using namespace hexuki;
using namespace emscripten;

// ============================================================================
// Global State (one game instance for simplicity)
// ============================================================================

static HexukiBitboard* g_board = nullptr;
static mcts::MCTS* g_mcts = nullptr;
static bool g_initialized = false;
static Move g_lastMove(-1, 0);  // Track last move for unmake

// ============================================================================
// Initialization
// ============================================================================

EMSCRIPTEN_KEEPALIVE
extern "C" void wasmInitialize() {
    if (!g_initialized) {
        Zobrist::initialize();
        g_board = new HexukiBitboard();
        g_mcts = new mcts::MCTS();
        g_initialized = true;
    }
}

EMSCRIPTEN_KEEPALIVE
extern "C" void wasmReset() {
    if (g_board) {
        g_board->reset();
    }
}

// ============================================================================
// Game State Management
// ============================================================================

EMSCRIPTEN_KEEPALIVE
extern "C" void wasmLoadPosition(const char* position) {
    if (g_board) {
        g_board->loadPosition(std::string(position));
    }
}

EMSCRIPTEN_KEEPALIVE
extern "C" const char* wasmSavePosition() {
    static std::string result;
    if (g_board) {
        result = g_board->savePosition();
        return result.c_str();
    }
    return "";
}

EMSCRIPTEN_KEEPALIVE
extern "C" int wasmGetCurrentPlayer() {
    return g_board ? g_board->getCurrentPlayer() : 1;
}

EMSCRIPTEN_KEEPALIVE
extern "C" int wasmGetScoreP1() {
    return g_board ? g_board->getScore(PLAYER_1) : 0;
}

EMSCRIPTEN_KEEPALIVE
extern "C" int wasmGetScoreP2() {
    return g_board ? g_board->getScore(PLAYER_2) : 0;
}

EMSCRIPTEN_KEEPALIVE
extern "C" bool wasmIsGameOver() {
    return g_board ? g_board->isGameOver() : false;
}

EMSCRIPTEN_KEEPALIVE
extern "C" int wasmGetTileValue(int hexId) {
    return g_board ? g_board->getTileValue(hexId) : 0;
}

// ============================================================================
// Move Operations
// ============================================================================

EMSCRIPTEN_KEEPALIVE
extern "C" bool wasmMakeMove(int hexId, int tileValue) {
    if (!g_board) return false;

    Move move(hexId, tileValue);
    if (g_board->isValidMove(move)) {
        g_lastMove = move;  // Track for unmake
        g_board->makeMove(move);
        return true;
    }
    return false;
}

EMSCRIPTEN_KEEPALIVE
extern "C" void wasmUnmakeMove() {
    if (g_board && g_lastMove.hexId != -1) {
        g_board->unmakeMove(g_lastMove);
        g_lastMove = Move(-1, 0);  // Reset
    }
}

EMSCRIPTEN_KEEPALIVE
extern "C" int wasmGetValidMovesCount() {
    if (!g_board) return 0;
    return g_board->getValidMoves().size();
}

// Returns valid moves as a JSON string: "[{h:6,t:5},{h:7,t:4},...]"
EMSCRIPTEN_KEEPALIVE
extern "C" const char* wasmGetValidMoves() {
    static std::string result;
    if (!g_board) {
        result = "[]";
        return result.c_str();
    }

    auto moves = g_board->getValidMoves();
    result = "[";
    for (size_t i = 0; i < moves.size(); i++) {
        result += "{\"h\":" + std::to_string(moves[i].hexId) +
                  ",\"t\":" + std::to_string(moves[i].tileValue) + "}";
        if (i < moves.size() - 1) result += ",";
    }
    result += "]";
    return result.c_str();
}

// ============================================================================
// MCTS AI
// ============================================================================

// Returns best move as JSON: {hexId:6, tileValue:5, visits:1234, winRate:0.6, simulations:10000, timeMs:500}
EMSCRIPTEN_KEEPALIVE
extern "C" const char* wasmMCTSFindBestMove(int simulations, int timeLimitMs, bool useTimeLimit, bool useMinimaxRollouts, int minimaxThreshold) {
    static std::string result;

    if (!g_board || !g_mcts) {
        result = "{\"error\":\"Not initialized\"}";
        return result.c_str();
    }

    mcts::MCTSConfig config;
    config.numSimulations = simulations;
    config.timeLimitMs = timeLimitMs;
    config.useTimeLimit = useTimeLimit;
    config.verbose = false;
    config.useMinimaxRollouts = useMinimaxRollouts;
    config.minimaxThreshold = minimaxThreshold;

    auto searchResult = g_mcts->findBestMove(*g_board, config);

    // Build JSON response with topMoves
    result = "{";
    result += "\"hexId\":" + std::to_string(searchResult.bestMove.hexId) + ",";
    result += "\"tileValue\":" + std::to_string(searchResult.bestMove.tileValue) + ",";
    result += "\"visits\":" + std::to_string(searchResult.visits) + ",";
    result += "\"winRate\":" + std::to_string(searchResult.winRate) + ",";
    result += "\"simulations\":" + std::to_string(searchResult.simulations) + ",";
    result += "\"timeMs\":" + std::to_string(searchResult.timeMs) + ",";

    // Add topMoves array
    result += "\"topMoves\":[";
    for (size_t i = 0; i < searchResult.topMoves.size(); i++) {
        result += "{";
        result += "\"hexId\":" + std::to_string(searchResult.topMoves[i].move.hexId) + ",";
        result += "\"tileValue\":" + std::to_string(searchResult.topMoves[i].move.tileValue) + ",";
        result += "\"visits\":" + std::to_string(searchResult.topMoves[i].visits) + ",";
        result += "\"winRate\":" + std::to_string(searchResult.topMoves[i].winRate);
        result += "}";
        if (i < searchResult.topMoves.size() - 1) result += ",";
    }
    result += "]}";

    return result.c_str();
}

// ============================================================================
// Minimax AI
// ============================================================================

// Returns best move as JSON: {hexId:6, tileValue:5, score:100, depth:8, nodes:50000, timeMs:200}
EMSCRIPTEN_KEEPALIVE
extern "C" const char* wasmMinimaxFindBestMove(int depth, int timeLimitMs) {
    static std::string result;

    if (!g_board) {
        result = "{\"error\":\"Not initialized\"}";
        return result.c_str();
    }

    auto searchResult = minimax::findBestMove(*g_board, depth, timeLimitMs);

    // Build JSON response
    result = "{";
    result += "\"hexId\":" + std::to_string(searchResult.bestMove.hexId) + ",";
    result += "\"tileValue\":" + std::to_string(searchResult.bestMove.tileValue) + ",";
    result += "\"score\":" + std::to_string(searchResult.score) + ",";
    result += "\"depth\":" + std::to_string(searchResult.depth) + ",";
    result += "\"nodes\":" + std::to_string(searchResult.nodesSearched) + ",";
    result += "\"timeMs\":" + std::to_string(searchResult.timeMs);
    result += "}";

    return result.c_str();
}

// ============================================================================
// Cleanup
// ============================================================================

EMSCRIPTEN_KEEPALIVE
extern "C" void wasmCleanup() {
    delete g_board;
    delete g_mcts;
    g_board = nullptr;
    g_mcts = nullptr;
    g_initialized = false;
}

// ============================================================================
// Wrapper functions using std::string (no raw pointers needed)
// ============================================================================

void wasmLoadPositionStr(std::string position) {
    wasmLoadPosition(position.c_str());
}

std::string wasmSavePositionStr() {
    return std::string(wasmSavePosition());
}

std::string wasmGetValidMovesStr() {
    return std::string(wasmGetValidMoves());
}

std::string wasmMCTSFindBestMoveStr(int simulations, int timeLimitMs, bool useTimeLimit, bool useMinimaxRollouts, int minimaxThreshold) {
    return std::string(wasmMCTSFindBestMove(simulations, timeLimitMs, useTimeLimit, useMinimaxRollouts, minimaxThreshold));
}

std::string wasmMinimaxFindBestMoveStr(int depth, int timeLimitMs) {
    return std::string(wasmMinimaxFindBestMove(depth, timeLimitMs));
}

// ============================================================================
// Emscripten Bindings (using std::string - no raw pointers)
// ============================================================================

EMSCRIPTEN_BINDINGS(hexuki_module) {
    function("initialize", &wasmInitialize);
    function("reset", &wasmReset);
    function("loadPosition", &wasmLoadPositionStr);
    function("savePosition", &wasmSavePositionStr);
    function("getCurrentPlayer", &wasmGetCurrentPlayer);
    function("getScoreP1", &wasmGetScoreP1);
    function("getScoreP2", &wasmGetScoreP2);
    function("isGameOver", &wasmIsGameOver);
    function("getTileValue", &wasmGetTileValue);
    function("makeMove", &wasmMakeMove);
    function("unmakeMove", &wasmUnmakeMove);
    function("getValidMovesCount", &wasmGetValidMovesCount);
    function("getValidMoves", &wasmGetValidMovesStr);
    function("mctsFindBestMove", &wasmMCTSFindBestMoveStr);
    function("minimaxFindBestMove", &wasmMinimaxFindBestMoveStr);
    function("cleanup", &wasmCleanup);
}
