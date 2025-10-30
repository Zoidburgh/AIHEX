# Hexuki C++ Engine
# High-performance game engine with bitboards for 50-200× speedup

cmake_minimum_required(VERSION 3.15)
project(HexukiEngine VERSION 1.0.0 LANGUAGES CXX)

# C++17 required for modern features
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build type: Release for maximum performance
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler optimizations
if(MSVC)
    # Visual Studio optimizations
    add_compile_options(/W4 /O2 /GL)  # Warning level 4, optimize for speed, whole program optimization
    add_link_options(/LTCG)  # Link-time code generation
else()
    # GCC/Clang optimizations
    add_compile_options(-Wall -Wextra -O3 -march=native)
endif()

# Include directories
include_directories(${PROJECT_SOURCE_DIR}/include)

# Core library (shared code)
set(CORE_SOURCES
    src/core/bitboard.cpp
    src/core/move.cpp
    src/core/zobrist.cpp
)

set(AI_SOURCES
    src/ai/mcts.cpp
    src/ai/mcts_node.cpp
    src/ai/minimax.cpp
    src/ai/evaluation.cpp
)

# Create static library
add_library(hexuki_core STATIC ${CORE_SOURCES} ${AI_SOURCES})

# Main executable (CLI tool)
add_executable(hexuki_engine src/main.cpp)
target_link_libraries(hexuki_engine hexuki_core)

# Tests (optional, we'll add Google Test later)
option(BUILD_TESTS "Build unit tests" ON)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Benchmarks
option(BUILD_BENCHMARKS "Build performance benchmarks" ON)
if(BUILD_BENCHMARKS)
    add_subdirectory(benchmarks)
endif()

# Installation
install(TARGETS hexuki_engine DESTINATION bin)

# Print configuration
message(STATUS "===========================================")
message(STATUS "Hexuki C++ Engine Configuration")
message(STATUS "===========================================")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Standard: C++${CMAKE_CXX_STANDARD}")
message(STATUS "Compiler: ${CMAKE_CXX_COMPILER_ID}")
message(STATUS "Build tests: ${BUILD_TESTS}")
message(STATUS "Build benchmarks: ${BUILD_BENCHMARKS}")
message(STATUS "===========================================")
