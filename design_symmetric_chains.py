"""
Design symmetric straight diagonal chains for Hexuki
Player 1: down-right diagonals
Player 2: down-left diagonals
"""

hex_positions = [
    {"id": 0, "row": 0, "col": 2},
    {"id": 1, "row": 1, "col": 1},
    {"id": 2, "row": 1, "col": 3},
    {"id": 3, "row": 2, "col": 0},
    {"id": 4, "row": 2, "col": 2},
    {"id": 5, "row": 2, "col": 4},
    {"id": 6, "row": 3, "col": 1},
    {"id": 7, "row": 3, "col": 3},
    {"id": 8, "row": 4, "col": 0},
    {"id": 9, "row": 4, "col": 2},  # Starting position (center)
    {"id": 10, "row": 4, "col": 4},
    {"id": 11, "row": 5, "col": 1},
    {"id": 12, "row": 5, "col": 3},
    {"id": 13, "row": 6, "col": 0},
    {"id": 14, "row": 6, "col": 2},
    {"id": 15, "row": 6, "col": 4},
    {"id": 16, "row": 7, "col": 1},
    {"id": 17, "row": 7, "col": 3},
    {"id": 18, "row": 8, "col": 2}
]

print("=" * 80)
print("DESIGNING SYMMETRIC CHAINS")
print("=" * 80)

print("\nBoard layout:")
print("      col: 0   1   2   3   4")
print("    -------------------------")
for row in range(9):
    hexes_in_row = [h for h in hex_positions if h['row'] == row]
    if hexes_in_row:
        indent = " " * (4 - row // 2)
        print(f"row {row}: {indent}", end="")
        for col in range(5):
            hex = next((h for h in hexes_in_row if h['col'] == col), None)
            if hex:
                print(f"{hex['id']:2d}  ", end="")
            else:
                print("    ", end="")
        print()

print("\n" + "=" * 80)
print("PLAYER 1 CHAINS (DOWN-RIGHT diagonals)")
print("Row increases by +1, Col increases by +1")
print("=" * 80)

# Find all down-right diagonals
player1_chains = []

# Strategy: For each starting position, follow down-right as far as possible
def find_down_right_chain(start_id):
    """Follow down-right diagonal from a starting hex"""
    chain = [start_id]
    current = hex_positions[start_id]

    while True:
        # Look for hex at row+1, col+1
        next_hex = next((h for h in hex_positions if h['row'] == current['row'] + 1 and h['col'] == current['col'] + 1), None)
        if next_hex:
            chain.append(next_hex['id'])
            current = next_hex
        else:
            break

    return chain

# Find all possible down-right chains (starting from top/left edges)
used_hexes = set()
for start_hex in hex_positions:
    # Only start from hexes that aren't already in a chain
    if start_hex['id'] not in used_hexes:
        # Only start from left edge (col 0) or top edge (row 0-2)
        if start_hex['col'] <= 1 or start_hex['row'] <= 1:
            chain = find_down_right_chain(start_hex['id'])
            if len(chain) >= 3:  # Only chains of length 3+
                player1_chains.append(chain)
                used_hexes.update(chain)

print("\nPlayer 1 chains found:")
for i, chain in enumerate(player1_chains, 1):
    print(f"Chain {i}: {chain}")
    coords = [(hex_positions[h]['row'], hex_positions[h]['col']) for h in chain]
    print(f"  Coords: {coords}")

print("\n" + "=" * 80)
print("PLAYER 2 CHAINS (DOWN-LEFT diagonals)")
print("Row increases by +1, Col decreases by -1")
print("=" * 80)

def find_down_left_chain(start_id):
    """Follow down-left diagonal from a starting hex"""
    chain = [start_id]
    current = hex_positions[start_id]

    while True:
        # Look for hex at row+1, col-1
        next_hex = next((h for h in hex_positions if h['row'] == current['row'] + 1 and h['col'] == current['col'] - 1), None)
        if next_hex:
            chain.append(next_hex['id'])
            current = next_hex
        else:
            break

    return chain

# Find all possible down-left chains
used_hexes2 = set()
player2_chains = []

for start_hex in hex_positions:
    if start_hex['id'] not in used_hexes2:
        # Only start from right edge (col 4-3) or top edge (row 0-2)
        if start_hex['col'] >= 3 or start_hex['row'] <= 1:
            chain = find_down_left_chain(start_hex['id'])
            if len(chain) >= 3:
                player2_chains.append(chain)
                used_hexes2.update(chain)

print("\nPlayer 2 chains found:")
for i, chain in enumerate(player2_chains, 1):
    print(f"Chain {i}: {chain}")
    coords = [(hex_positions[h]['row'], hex_positions[h]['col']) for h in chain]
    print(f"  Coords: {coords}")

# Sort chains by starting position for consistency
player1_chains.sort(key=lambda c: (hex_positions[c[0]]['row'], hex_positions[c[0]]['col']))
player2_chains.sort(key=lambda c: (hex_positions[c[0]]['row'], -hex_positions[c[0]]['col']))

print("\n" + "=" * 80)
print("FINAL SYMMETRIC CHAIN DESIGN")
print("=" * 80)

print("\nPlayer 1 Chains (down-right \\):")
for i, chain in enumerate(player1_chains, 1):
    print(f"  Chain {i}: {chain}")

print("\nPlayer 2 Chains (down-left /):")
for i, chain in enumerate(player2_chains, 1):
    print(f"  Chain {i}: {chain}")

# Visualize each chain
def visualize_chain(chain, name):
    board = [["  " for _ in range(5)] for _ in range(9)]
    for h in hex_positions:
        if h['id'] in chain:
            board[h['row']][h['col']] = f"{h['id']:2d}"
        else:
            board[h['row']][h['col']] = " ."

    print(f"\n{name}: {chain}")
    print("      col: 0   1   2   3   4")
    print("    -------------------------")
    for row_idx in range(9):
        indent = " " * (4 - row_idx // 2)
        print(f"row {row_idx}: {indent}", end="")
        for col_idx in range(5):
            print(f"{board[row_idx][col_idx]}  ", end="")
        print()

print("\n" + "=" * 80)
print("VISUALIZATIONS")
print("=" * 80)

for i, chain in enumerate(player1_chains, 1):
    visualize_chain(chain, f"P1 Chain {i}")

for i, chain in enumerate(player2_chains, 1):
    visualize_chain(chain, f"P2 Chain {i}")

# Generate code for JavaScript
print("\n" + "=" * 80)
print("JAVASCRIPT CODE")
print("=" * 80)

print("\n// Player 1 chains (down-right diagonals)")
print("this.player1Chains = [")
for chain in player1_chains:
    print(f"    {chain},")
print("];")

print("\n// Player 2 chains (down-left diagonals)")
print("this.player2Chains = [")
for chain in player2_chains:
    print(f"    {chain},")
print("];")

# Verify symmetry
print("\n" + "=" * 80)
print("SYMMETRY VERIFICATION")
print("=" * 80)

print(f"\nPlayer 1 has {len(player1_chains)} chains")
print(f"Player 2 has {len(player2_chains)} chains")

p1_lengths = [len(c) for c in player1_chains]
p2_lengths = [len(c) for c in player2_chains]

print(f"\nPlayer 1 chain lengths: {p1_lengths}")
print(f"Player 2 chain lengths: {p2_lengths}")

if sorted(p1_lengths) == sorted(p2_lengths):
    print("✓ Chain lengths are symmetric!")
else:
    print("✗ Chain lengths differ")

# Check if all chains are straight
print("\nVerifying all chains are straight diagonals...")
all_straight = True

for i, chain in enumerate(player1_chains, 1):
    chain_hexes = [hex_positions[h] for h in chain]
    if len(chain_hexes) >= 2:
        row_changes = [chain_hexes[j+1]['row'] - chain_hexes[j]['row'] for j in range(len(chain_hexes)-1)]
        col_changes = [chain_hexes[j+1]['col'] - chain_hexes[j]['col'] for j in range(len(chain_hexes)-1)]
        if len(set(row_changes)) != 1 or len(set(col_changes)) != 1:
            print(f"  P1 Chain {i} is NOT straight: {chain}")
            all_straight = False

for i, chain in enumerate(player2_chains, 1):
    chain_hexes = [hex_positions[h] for h in chain]
    if len(chain_hexes) >= 2:
        row_changes = [chain_hexes[j+1]['row'] - chain_hexes[j]['row'] for j in range(len(chain_hexes)-1)]
        col_changes = [chain_hexes[j+1]['col'] - chain_hexes[j]['col'] for j in range(len(chain_hexes)-1)]
        if len(set(row_changes)) != 1 or len(set(col_changes)) != 1:
            print(f"  P2 Chain {i} is NOT straight: {chain}")
            all_straight = False

if all_straight:
    print("✓ All chains are straight diagonals!")

print("\n" + "=" * 80)
