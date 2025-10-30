import json

# Load the policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760924716749.json') as f:
    data = json.load(f)

# Get the opening state
first_state_key = list(data['database'].keys())[0]
print("Opening state:")
print(first_state_key)
print()

board = first_state_key.split('|')[1]
pieces = board.split(',')

print("Starting position:")
for i, p in enumerate(pieces):
    if p != 'null':
        print(f"  Hex array index {i}: {p}")

# The opening position shows where the starting piece actually is
starting_hex_index = [i for i, p in enumerate(pieces) if p == '1p2'][0]
print(f"\nStarting piece (1p2) is at array index: {starting_hex_index}")

# Now let's decode what "t1h7" actually means by looking at move 2 states
print("\n" + "="*80)
print("DECODING MOVE NOTATION")
print("="*80)

# Get all possible moves from opening
opening_actions = data['database'][first_state_key]
print(f"\nAll possible opening moves: {len(opening_actions)}")
print("Sample moves:", list(opening_actions.keys())[:10])

# Now find states after specific moves
print("\n" + "="*80)
print("Finding the state after 't1h7' was played:")
print("="*80)

# We need to find a state where:
# - It's move 2 (Player 2's turn)
# - Has the original piece at index 9
# - Has Player 1's tile 1 somewhere

move2_states = {}
for state_key in data['database'].keys():
    parts = state_key.split('|')
    turn = parts[0]
    board = parts[1]
    pieces = board.split(',')

    # Count pieces
    piece_count = sum(1 for p in pieces if p != 'null')

    if piece_count == 2 and turn == '2':  # After Player 1's first move
        # Find positions
        positions = {}
        for i, p in enumerate(pieces):
            if p != 'null':
                positions[i] = p

        # Check if this could be after t1h7
        if 9 in positions and '1p2' in positions[9]:
            # Find where Player 1's piece is
            for hex_idx, piece in positions.items():
                if 'p1' in piece and '1p1' in piece:
                    if hex_idx not in move2_states:
                        move2_states[hex_idx] = []
                    move2_states[hex_idx].append(state_key)

print("\nStates where Player 1 played tile 1 (after starting from hex 9):")
for hex_idx in sorted(move2_states.keys()):
    print(f"  Hex {hex_idx}: {len(move2_states[hex_idx])} state(s)")
    if len(move2_states[hex_idx]) <= 2:
        for state in move2_states[hex_idx]:
            print(f"    {state[:100]}...")

# Now check which of these corresponds to the high win-rate from our analysis
print("\n" + "="*80)
print("CORRELATING WITH WIN RATES")
print("="*80)

# From our earlier analysis, t1h7 had the highest win rate
# Let's check the opening actions statistics
print("\nOpening move 't1h7' statistics:")
if 't1h7' in opening_actions:
    stats = opening_actions['t1h7']
    print(f"  Games played: {stats['gamesPlayed']}")
    print(f"  Wins: {stats['wins']:.1f}")
    print(f"  Losses: {stats['losses']:.1f}")
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0
    print(f"  Win rate: {wr:.3f}")
else:
    print("  't1h7' not found in opening actions!")

# Let's list the actual top moves by games played
print("\nTop 5 moves by games played:")
sorted_moves = sorted(opening_actions.items(), key=lambda x: x[1]['gamesPlayed'], reverse=True)
for move, stats in sorted_moves[:5]:
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0
    print(f"  {move}: {stats['gamesPlayed']} games, WR={wr:.3f}")

# Now let's figure out the mapping
print("\n" + "="*80)
print("UNDERSTANDING THE 'h' NUMBER IN MOVE NOTATION")
print("="*80)

# The move is "t{tile}h{hex}"
# Let's check if 'h7' means hex array index 7, or some other numbering

# Get move t1h4 and see where it places the piece
test_moves = ['t1h4', 't1h6', 't1h7', 't1h11', 't1h12', 't1h14']
for test_move in test_moves:
    if test_move in opening_actions:
        # Find resulting state
        for state_key in data['database'].keys():
            parts = state_key.split('|')
            turn = parts[0]
            board = parts[1]
            pieces = board.split(',')

            piece_count = sum(1 for p in pieces if p != 'null')
            if piece_count == 2 and turn == '2':
                if pieces[9] == '1p2':  # Starting piece still at 9
                    # Find where 1p1 is
                    for i, p in enumerate(pieces):
                        if p == '1p1':
                            print(f"  Move '{test_move}' appears to place piece at hex array index {i}")
                            break
                    break

print("\n" + "="*80)
print("CONCLUSION")
print("="*80)
print("The 'h' number in the move notation (e.g., 't1h7') refers to a HEX ID,")
print("which may NOT directly correspond to the array index in the state string.")
print("\nWe need to find the actual hex ID to array index mapping from your game code.")
