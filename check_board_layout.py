import json

# Load the policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760924716749.json') as f:
    data = json.load(f)

first_state = list(data['database'].keys())[0]
print('First state key:')
print(first_state)
print()

# Parse the state
parts = first_state.split('|')
turn = parts[0]
board = parts[1]
pieces = board.split(',')

print(f"Turn: {turn}")
print(f"\nBoard pieces array (19 hexes, index 0-18):")
for i, p in enumerate(pieces):
    print(f"  Hex {i}: {p}")

print(f"\nStarting piece location:")
for i, p in enumerate(pieces):
    if p != 'null':
        print(f"  Hex {i} contains: {p}")

# Now let's look at what t1h7 actually means
print(f"\n{'='*80}")
print("Analyzing the winning opening move: t1h7")
print(f"{'='*80}")

# Find states after t1h7 was played
states_after_t1h7 = []
for state_key in list(data['database'].keys())[:100]:  # Check first 100 states
    parts = state_key.split('|')
    board = parts[1]
    pieces = board.split(',')

    # Count total pieces
    piece_count = sum(1 for p in pieces if p != 'null')

    # Look for states with exactly 2 pieces (after move 1)
    if piece_count == 2:
        # Check if it has the starting piece (1p2 at some position)
        # and a Player 1 piece with tile 1 (1p1)
        has_1p2 = '1p2' in pieces
        has_1p1 = '1p1' in pieces

        if has_1p2 and has_1p1:
            # Find where each is
            p2_hex = pieces.index('1p2')
            p1_hex = pieces.index('1p1')
            states_after_t1h7.append({
                'state': state_key[:100] + '...',
                'p1_hex': p1_hex,
                'p2_hex': p2_hex
            })

if states_after_t1h7:
    print(f"\nFound {len(states_after_t1h7)} states with Player 2's starting piece (1p2) and Player 1's tile 1 (1p1):")
    for s in states_after_t1h7[:5]:
        print(f"  P1 tile 1 at hex {s['p1_hex']}, P2 starting piece at hex {s['p2_hex']}")
        print(f"    State: {s['state']}")

print(f"\n{'='*80}")
print("ADJACENCY RULES CHECK")
print(f"{'='*80}")

# The starting piece is at hex 9 (index 9)
starting_hex = None
for i, p in enumerate(pieces):
    if p == '1p2':
        starting_hex = i
        break

print(f"\nStarting piece is at hex index: {starting_hex}")
print(f"\nFor move t1h7, the 'h7' means hex index 7")
print(f"Player 1 must place tile 1 adjacent to hex {starting_hex}")
print(f"\nLet me check what positions are actually adjacent to hex {starting_hex}...")

# We need to understand the actual adjacency rules
# Let's look at actual game states to reverse-engineer adjacency
print(f"\n{'='*80}")
print("REVERSE-ENGINEERING ADJACENCY FROM ACTUAL GAME STATES")
print(f"{'='*80}")

# Look at all Move 1 states (2 pieces total) to see which hexes Player 1 used
move1_p1_positions = set()
for state_key in data['database'].keys():
    parts = state_key.split('|')
    board = parts[1]
    pieces = board.split(',')

    piece_count = sum(1 for p in pieces if p != 'null')
    if piece_count == 2:
        # Find p1 and p2 positions
        p1_pos = None
        p2_pos = None
        for i, p in enumerate(pieces):
            if 'p1' in p:
                p1_pos = i
            elif 'p2' in p:
                p2_pos = i

        if p1_pos is not None and p2_pos is not None:
            move1_p1_positions.add(p1_pos)

print(f"\nHexes where Player 1 placed pieces on Move 1 (must be adjacent to starting hex):")
print(f"Adjacent hexes: {sorted(move1_p1_positions)}")
print(f"Total adjacent positions: {len(move1_p1_positions)}")

if starting_hex is not None:
    print(f"\nStarting hex: {starting_hex}")
    print(f"Adjacent hexes: {sorted(move1_p1_positions)}")
