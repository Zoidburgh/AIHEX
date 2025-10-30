import json
import sys

policy_file = sys.argv[1] if len(sys.argv) > 1 else 'hexuki_policy_v3_300games_1760934565545.json'

with open(policy_file) as f:
    policy = json.load(f)

# Find all states where P1 just moved (turn 2, P2 to move)
turn2_states = [s for s in policy['database'].keys() if s.startswith('2|')]

# Extract P1's opening move from each state
opening_positions = {}

for state in turn2_states:
    parts = state.split('|')
    board = parts[1].split(',')

    # Find where P1 placed their tile (skip hex 10 which is the neutral center)
    for hex_id, cell in enumerate(board):
        if 'p1' in cell and hex_id != 9:  # hex_id 9 is hex 10 (0-indexed)
            tile_value = cell.split('p')[0]
            hex_num = hex_id + 1  # Convert to 1-indexed hex number

            key = f't{tile_value}h{hex_num}'
            opening_positions[key] = opening_positions.get(key, 0) + 1

print(f"P1 Opening Move Diversity Analysis")
print("=" * 60)
print(f"Total turn-2 states: {len(turn2_states):,}")
print(f"Unique P1 opening moves: {len(opening_positions)}")
print()

# Sort by frequency
sorted_openings = sorted(opening_positions.items(), key=lambda x: x[1], reverse=True)

print("Top 20 most frequent P1 openings:")
for i, (opening, count) in enumerate(sorted_openings[:20], 1):
    pct = count / len(turn2_states) * 100
    print(f"  {i:2d}. {opening:8s}: {count:4d} times ({pct:5.1f}%)")

print()
print(f"Unique hex positions used:")
unique_hexes = set(opening.split('h')[1] for opening in opening_positions.keys())
print(f"  {sorted(unique_hexes, key=int)}")
print(f"  Total: {len(unique_hexes)} different hexes")
