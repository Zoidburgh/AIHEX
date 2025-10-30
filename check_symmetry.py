import json

# Load the policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760924716749.json') as f:
    data = json.load(f)

# Hex positions
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
    {"id": 9, "row": 4, "col": 2},  # Starting position
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
print("BOARD SYMMETRY CHECK")
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

# Hex 9 is the center
center = hex_positions[9]
print(f"\nCenter hex: {center['id']} at row {center['row']}, col {center['col']}")

# Adjacent to center (from earlier analysis)
adjacent = [4, 6, 7, 11, 12, 14]
print(f"\nAdjacent hexes to center: {adjacent}")

# Find symmetric pairs
print("\nSymmetric pairs relative to center (row 4, col 2):")
for hex_id in adjacent:
    h = hex_positions[hex_id]
    row_offset = h['row'] - center['row']
    col_offset = h['col'] - center['col']

    # Mirror position
    mirror_row = center['row'] - row_offset
    mirror_col = center['col'] - col_offset

    # Find the hex at mirror position
    mirror_hex = next((h2 for h2 in hex_positions if h2['row'] == mirror_row and h2['col'] == mirror_col), None)

    if mirror_hex:
        print(f"  Hex {hex_id} (row {h['row']}, col {h['col']}) <--> Hex {mirror_hex['id']} (row {mirror_hex['row']}, col {mirror_hex['col']})")
    else:
        print(f"  Hex {hex_id} (row {h['row']}, col {h['col']}) <--> NO MIRROR (would be row {mirror_row}, col {mirror_col})")

# Now check performance of symmetric pairs
print("\n" + "=" * 80)
print("PERFORMANCE OF SYMMETRIC PAIRS")
print("=" * 80)

first_state_key = list(data['database'].keys())[0]
opening_actions = data['database'][first_state_key]

def parse_move(move_str):
    parts = move_str.replace('t', '').split('h')
    return int(parts[0]), int(parts[1])

# Group by hex position
hexes_stats = {}
for move, stats in opening_actions.items():
    tile, hex_id = parse_move(move)
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0

    if hex_id not in hexes_stats:
        hexes_stats[hex_id] = []
    hexes_stats[hex_id].append({
        'move': move,
        'tile': tile,
        'wr': wr,
        'games': stats['gamesPlayed']
    })

# Check symmetric pairs
symmetric_pairs = [
    (4, 14),   # row 2 col 2 <-> row 6 col 2 (vertical symmetry)
    (6, 12),   # row 3 col 1 <-> row 5 col 3 (diagonal)
    (7, 11),   # row 3 col 3 <-> row 5 col 1 (diagonal)
]

print("\nComparing symmetric hex pairs:")
for hex1, hex2 in symmetric_pairs:
    h1 = hex_positions[hex1]
    h2 = hex_positions[hex2]

    stats1 = hexes_stats.get(hex1, [])
    stats2 = hexes_stats.get(hex2, [])

    if stats1 and stats2:
        avg_wr1 = sum(s['wr'] for s in stats1) / len(stats1)
        avg_wr2 = sum(s['wr'] for s in stats2) / len(stats2)
        games1 = sum(s['games'] for s in stats1)
        games2 = sum(s['games'] for s in stats2)

        print(f"\nHex {hex1} (row {h1['row']}, col {h1['col']}) vs Hex {hex2} (row {h2['row']}, col {h2['col']}):")
        print(f"  Hex {hex1}: Avg WR = {avg_wr1:.3f}, Total games = {games1}")
        print(f"  Hex {hex2}: Avg WR = {avg_wr2:.3f}, Total games = {games2}")
        print(f"  Difference: {abs(avg_wr1 - avg_wr2):.3f} ({(avg_wr1 - avg_wr2) * 100:.1f} percentage points)")

# Most important: hex 7 vs hex 11
print("\n" + "=" * 80)
print("HEX 7 vs HEX 11 DETAILED COMPARISON")
print("=" * 80)

hex7_stats = hexes_stats[7]
hex11_stats = hexes_stats[11]

print(f"\nHex 7 (row 3, col 3) - {len(hex7_stats)} tile options:")
hex7_stats.sort(key=lambda x: x['wr'], reverse=True)
for s in hex7_stats:
    print(f"  {s['move']}: WR={s['wr']:.3f}, Games={s['games']}")

print(f"\nHex 11 (row 5, col 1) - {len(hex11_stats)} tile options:")
hex11_stats.sort(key=lambda x: x['wr'], reverse=True)
for s in hex11_stats:
    print(f"  {s['move']}: WR={s['wr']:.3f}, Games={s['games']}")

# Check if this is a chain structure issue
print("\n" + "=" * 80)
print("CHECKING CHAIN ASYMMETRY")
print("=" * 80)

player1_chains = [
    [0, 2, 5],
    [1, 4, 7, 10],
    [3, 6, 9, 12, 15],
    [8, 11, 14, 17],
    [13, 16, 18]
]

player2_chains = [
    [0, 1, 3],
    [2, 4, 6, 8],
    [5, 7, 9, 11, 13],
    [12, 14, 16, 10],
    [15, 17, 18]
]

print("\nHex 7 is in:")
for i, chain in enumerate(player1_chains, 1):
    if 7 in chain:
        print(f"  P1 Chain {i}: {chain}")
for i, chain in enumerate(player2_chains, 1):
    if 7 in chain:
        print(f"  P2 Chain {i}: {chain}")

print("\nHex 11 is in:")
for i, chain in enumerate(player1_chains, 1):
    if 11 in chain:
        print(f"  P1 Chain {i}: {chain}")
for i, chain in enumerate(player2_chains, 1):
    if 11 in chain:
        print(f"  P2 Chain {i}: {chain}")

print("\n" + "=" * 80)
print("HYPOTHESIS: Why might hex 7 perform better?")
print("=" * 80)

print("\nPossible explanations:")
print("1. Chain structure asymmetry - chains are NOT symmetric")
print("2. Player turn advantage - Player 1 moves first, creates bias")
print("3. Training artifact - early random variation got amplified")
print("4. Actual game mechanic difference we haven't identified")

# Check if the chains themselves are symmetric
print("\nChecking if chains are symmetric...")
print("\nPlayer 1 chains (P1 tries to complete these):")
for i, chain in enumerate(player1_chains, 1):
    print(f"  Chain {i}: {chain}")

print("\nPlayer 2 chains (P2 tries to complete these):")
for i, chain in enumerate(player2_chains, 1):
    print(f"  Chain {i}: {chain}")

print("\nNOTE: The chains are NOT mirror images!")
print("This could explain the positional asymmetry.")
