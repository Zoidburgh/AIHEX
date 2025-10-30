import json
import sys

policy_file = sys.argv[1] if len(sys.argv) > 1 else 'hexuki_policy_v3_350games_1760935890481.json'

with open(policy_file) as f:
    policy = json.load(f)

# Find states where only P1's opening move has been made (turn 2, exactly 1 P1 tile)
turn2_states = [s for s in policy['database'].keys() if s.startswith('2|')]
opening_only_states = [s for s in turn2_states if s.split('|')[1].count('p1') == 1]

print(f"Total turn-2 states: {len(turn2_states):,}")
print(f"States with ONLY P1 opening: {len(opening_only_states)}")
print()

# Extract the actual opening moves
openings_found = set()

for state in opening_only_states:
    board = state.split('|')[1].split(',')
    for i, cell in enumerate(board):
        if 'p1' in cell and i != 9:  # Skip hex 10 (neutral center)
            tile_value = cell.split('p')[0]
            hex_num = i + 1
            opening = f't{tile_value}h{hex_num}'
            openings_found.add(opening)

print("P1 Opening Moves Actually Used:")
for opening in sorted(openings_found):
    print(f"  {opening}")

print()
print("Expected (hardcoded best 5):")
print("  t2h6, t3h14, t4h7, t1h12, t3h12")
print()

if len(openings_found) == 5:
    print("✓ Correct! Using exactly 5 openings")
else:
    print(f"✗ Problem! Using {len(openings_found)} openings instead of 5")
