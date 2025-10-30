import json

# Load the policy
policy_file = r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760926723449.json'
print(f"Loading {policy_file}...")
with open(policy_file) as f:
    data = json.load(f)

print("=" * 80)
print("OPENING ANALYSIS - FIRST 4 MOVES")
print("=" * 80)

# Basic stats
print(f"\nPolicy Overview:")
print(f"  Total states: {len(data['database']):,}")
print(f"  Total games: {data['totalGamesPlayed']:,}")
print(f"  Generation: {policy_file.split('gen')[1].split('_')[0]}")

# Function to count pieces in state
def count_pieces(state_key):
    board_part = state_key.split('|')[1]
    pieces = [p for p in board_part.split(',') if p != 'null']
    return len(pieces)

# Organize states by move depth
states_by_depth = {}
for state_key in data['database'].keys():
    depth = count_pieces(state_key)
    if depth not in states_by_depth:
        states_by_depth[depth] = []
    states_by_depth[depth].append(state_key)

print(f"\nStates by move depth:")
for depth in sorted(states_by_depth.keys())[:10]:
    print(f"  Move {depth}: {len(states_by_depth[depth]):,} states")

# Analyze first 4 move depths
print("\n" + "=" * 80)
print("MOVE-BY-MOVE ANALYSIS")
print("=" * 80)

for move_num in range(1, 5):
    if move_num not in states_by_depth:
        print(f"\nMove {move_num}: No data")
        continue

    print(f"\n{'='*80}")
    print(f"MOVE {move_num} (after {move_num} pieces on board)")
    print(f"{'='*80}")

    states_at_depth = states_by_depth[move_num]
    print(f"Total states at this depth: {len(states_at_depth):,}")

    # Get the most explored state at this depth
    states_with_exploration = []
    for state_key in states_at_depth:
        actions = data['database'][state_key]
        total_games = sum(a['gamesPlayed'] for a in actions.values())
        states_with_exploration.append((state_key, total_games, actions))

    states_with_exploration.sort(key=lambda x: x[1], reverse=True)

    # Analyze top 3 most explored states at this depth
    for rank, (state_key, total_games, actions) in enumerate(states_with_exploration[:3], 1):
        print(f"\n  State #{rank} (Total games: {total_games:,}):")
        print(f"    State: {state_key[:100]}...")
        print(f"    Available actions: {len(actions)}")

        # Sort actions by games played
        sorted_actions = sorted(actions.items(), key=lambda x: x[1]['gamesPlayed'], reverse=True)

        print(f"\n    Top 10 most explored moves:")
        for i, (move, stats) in enumerate(sorted_actions[:10], 1):
            wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0
            print(f"      {i:2d}. {move:10s}: Games={stats['gamesPlayed']:6d}, WR={wr:.3f}, W={stats['wins']:8.1f}, L={stats['losses']:8.1f}")

        # Check for exploration imbalance
        games_played = [a['gamesPlayed'] for a in actions.values()]
        max_games = max(games_played)
        min_games = min(games_played)
        avg_games = sum(games_played) / len(games_played)

        print(f"\n    Exploration distribution:")
        print(f"      Max games on one move: {max_games:,}")
        print(f"      Min games on one move: {min_games:,}")
        print(f"      Avg games per move: {avg_games:.1f}")
        print(f"      Exploration ratio (max/min): {max_games/min_games if min_games > 0 else 'inf':.1f}x")

        # Calculate entropy/diversity
        total = sum(games_played)
        if total > 0:
            import math
            probs = [g/total for g in games_played]
            entropy = -sum(p * math.log2(p) for p in probs if p > 0)
            max_entropy = math.log2(len(games_played))
            normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
            print(f"      Exploration diversity: {normalized_entropy:.3f} (1.0 = perfectly uniform)")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

# Overall exploration stats for first 4 moves
first_4_moves_states = []
for depth in range(1, 5):
    if depth in states_by_depth:
        first_4_moves_states.extend(states_by_depth[depth])

total_actions_first_4 = 0
all_games_first_4 = []
for state_key in first_4_moves_states:
    for action_stats in data['database'][state_key].values():
        total_actions_first_4 += 1
        all_games_first_4.append(action_stats['gamesPlayed'])

if all_games_first_4:
    print(f"\nFirst 4 moves statistics:")
    print(f"  Total state-action pairs: {total_actions_first_4:,}")
    print(f"  Average games per action: {sum(all_games_first_4)/len(all_games_first_4):.1f}")
    print(f"  Median games per action: {sorted(all_games_first_4)[len(all_games_first_4)//2]}")
    print(f"  Max games per action: {max(all_games_first_4):,}")
    print(f"  Min games per action: {min(all_games_first_4)}")

print("\n" + "=" * 80)
