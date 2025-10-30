# Tests - Placeholder for Phase 1-2
# Will add Google Test unit tests here

# Basic functionality tests
add_executable(test_basic test_basic.cpp)
target_link_libraries(test_basic hexuki_core)
add_test(NAME BasicTest COMMAND test_basic)

# Puzzle loading tests
add_executable(test_puzzle test_puzzle.cpp)
target_link_libraries(test_puzzle hexuki_core)
add_test(NAME PuzzleTest COMMAND test_puzzle)

# Validation test (cross-check with JavaScript)
add_executable(test_validation test_validation.cpp)
target_link_libraries(test_validation hexuki_core)
add_test(NAME ValidationTest COMMAND test_validation)

# Detailed validation test (full move lists)
add_executable(test_validation_detailed test_validation_detailed.cpp)
target_link_libraries(test_validation_detailed hexuki_core)

# Minimax AI test
add_executable(test_minimax test_minimax.cpp)
target_link_libraries(test_minimax hexuki_core)

# MCTS AI test
add_executable(test_mcts test_mcts.cpp)
target_link_libraries(test_mcts hexuki_core)

# MCTS 50k test (for comparison with JavaScript)
add_executable(test_mcts_50k test_mcts_50k.cpp)
target_link_libraries(test_mcts_50k hexuki_core)
