#include "core/bitboard.h"
#include "core/move.h"
#include "core/zobrist.h"
#include <iostream>
#include <chrono>

using namespace hexuki;

void benchmarkMoveGeneration() {
    HexukiBitboard board;

    auto start = std::chrono::high_resolution_clock::now();

    int iterations = 100000;
    for (int i = 0; i < iterations; i++) {
        auto moves = board.getValidMoves();
        (void)moves;  // Prevent optimization
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    double movesPerSec = (iterations * 1000.0) / duration.count();

    std::cout << "Move generation benchmark:\n";
    std::cout << "  Iterations: " << iterations << "\n";
    std::cout << "  Time: " << duration.count() << " ms\n";
    std::cout << "  Rate: " << (int)movesPerSec << " generations/sec\n\n";
}

void benchmarkMakingMoves() {
    auto start = std::chrono::high_resolution_clock::now();

    int iterations = 10000;
    for (int i = 0; i < iterations; i++) {
        HexukiBitboard board;
        auto moves = board.getValidMoves();

        // Make 5 moves
        for (int j = 0; j < 5 && j < moves.size(); j++) {
            board.makeMove(moves[j]);
        }
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    double gamesPerSec = (iterations * 1000.0) / duration.count();

    std::cout << "Making moves benchmark (5 moves each):\n";
    std::cout << "  Iterations: " << iterations << "\n";
    std::cout << "  Time: " << duration.count() << " ms\n";
    std::cout << "  Rate: " << (int)gamesPerSec << " sequences/sec\n\n";
}

int main() {
    std::cout << "===========================================\n";
    std::cout << "HEXUKI C++ ENGINE - Performance Benchmarks\n";
    std::cout << "===========================================\n\n";

    Zobrist::initialize();

    benchmarkMoveGeneration();
    benchmarkMakingMoves();

    std::cout << "===========================================\n";
    std::cout << "Benchmarks complete\n";
    std::cout << "===========================================\n";

    return 0;
}
