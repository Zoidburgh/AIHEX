import json
import sys

# Load policy
policy_path = r'C:\Users\Michael\Desktop\hextest\hexuki_policy_random_minimax_5500games_1760930350516.json'
with open(policy_path, 'r') as f:
    policy = json.load(f)

print("=" * 80)
print("MINIMAX TRAINING STRATEGY ANALYSIS")
print("=" * 80)
print(f"Training Method: {policy['trainingMethod']}")
print(f"Total Games: {policy['totalGamesPlayed']}")
print(f"Total States: {len(policy['database'])}")
print(f"Created: {policy['created']}")
print()

# Analyze move weights
print("=" * 80)
print("MOVE WEIGHT ANALYSIS")
print("=" * 80)
print("Moves with weight = 1.0 were RANDOM (opening/midgame)")
print("Moves with weight = 2.0+ were MINIMAX (perfect endgame)")
print()

# Count moves by weight
weight_distribution = {}
minimax_moves = 0
random_moves = 0

for state_key, moves in policy['database'].items():
    for move_key, move_data in moves.items():
        games = move_data['gamesPlayed']
        total_weight = move_data['totalWeight']

        # Average weight per game
        avg_weight = total_weight / games if games > 0 else 0

        # Categorize
        if avg_weight >= 1.9:  # Close to 2.0 = minimax
            minimax_moves += games
        else:  # Close to 1.0 = random
            random_moves += games

total_moves = minimax_moves + random_moves

print(f"Total move instances: {total_moves:,}")
print(f"Random moves: {random_moves:,} ({random_moves/total_moves*100:.1f}%)")
print(f"Minimax moves: {minimax_moves:,} ({minimax_moves/total_moves*100:.1f}%)")
print()

# Expected: ~12 random + ~6 minimax per game = 18 total
# For 100 games: ~1200 random + ~600 minimax = 1800 total
expected_random = 100 * 12
expected_minimax = 100 * 6
print(f"Expected random moves (~12 per game): {expected_random:,}")
print(f"Actual random moves: {random_moves:,} (diff: {random_moves - expected_random:+,})")
print()
print(f"Expected minimax moves (~6 per game): {expected_minimax:,}")
print(f"Actual minimax moves: {minimax_moves:,} (diff: {minimax_moves - expected_minimax:+,})")
print()

# Verify perfect endgames
print("=" * 80)
print("ENDGAME QUALITY CHECK")
print("=" * 80)

# Look at states with low empty positions (endgame states)
endgame_states = []
for state_key in policy['database'].keys():
    # Count 'null' in board state to estimate empty positions
    # State format: "turn|boardState|p1a:tiles|p2a:tiles|p1u:used|p2u:used"
    parts = state_key.split('|')
    if len(parts) >= 2:
        board_state = parts[1]
        empty_count = board_state.count('null')

        if empty_count <= 6:
            endgame_states.append((state_key, empty_count))

print(f"States with <=6 empty positions: {len(endgame_states)}")
print(f"These are endgame positions where minimax was used")
print()

# Sample a few endgame states
if endgame_states:
    print("Sample endgame states:")
    endgame_states.sort(key=lambda x: x[1])  # Sort by empty count

    for i, (state_key, empty_count) in enumerate(endgame_states[:5]):
        moves = policy['database'][state_key]
        print(f"\n  Endgame state {i+1}: {empty_count} empty positions, {len(moves)} moves explored")

        # Show move weights
        for move_key, move_data in list(moves.items())[:3]:
            games = move_data['gamesPlayed']
            total_weight = move_data['totalWeight']
            avg_weight = total_weight / games if games > 0 else 0
            wins = move_data['wins']
            losses = move_data['losses']
            wr = wins / total_weight if total_weight > 0 else 0
            print(f"    {move_key}: {games} games, weight={avg_weight:.1f}, WR={wr:.1%}")

print()
print("=" * 80)
print("TRAINING STRATEGY VALIDATION")
print("=" * 80)

if random_moves >= 1000 and minimax_moves >= 500:
    print("CHECK MARK Training structure looks correct!")
    print("CHECK MARK Good mix of random exploration + minimax endgames")
else:
    print("WARNING: Unexpected move distribution")

avg_states_per_game = len(policy['database']) / policy['totalGamesPlayed']
print(f"\nAverage unique states per game: {avg_states_per_game:.1f}")
print(f"Expected: ~16-18 (18 moves - some duplicates)")

print()
print("=" * 80)
print("READY FOR LARGER TRAINING RUN")
print("=" * 80)
print("Recommendation: Run 10,000 games for full policy training")
print("Expected results:")
print("  - ~160,000 state-action pairs")
print("  - ~120,000 random moves (diverse opening exploration)")
print("  - ~60,000 minimax moves (perfect endgame examples)")
print("  - Policy size: ~15-20 MB")
print("=" * 80)
