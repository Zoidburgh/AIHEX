import json

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
    {"id": 9, "row": 4, "col": 2},
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

def visualize_chain(chain, chain_name):
    print(f"\n{chain_name}: {chain}")

    # Get all positions in this chain
    chain_hexes = [hex_positions[h_id] for h_id in chain]

    # Print coordinates
    print("Coordinates:")
    for h in chain_hexes:
        print(f"  Hex {h['id']}: (row {h['row']}, col {h['col']})")

    # Check if it's a straight line
    if len(chain_hexes) >= 2:
        row_changes = [chain_hexes[i+1]['row'] - chain_hexes[i]['row'] for i in range(len(chain_hexes)-1)]
        col_changes = [chain_hexes[i+1]['col'] - chain_hexes[i]['col'] for i in range(len(chain_hexes)-1)]

        print(f"Row changes: {row_changes}")
        print(f"Col changes: {col_changes}")

        # Check if changes are consistent (straight diagonal)
        if len(set(row_changes)) == 1 and len(set(col_changes)) == 1:
            print("  -> STRAIGHT DIAGONAL")
        else:
            print("  -> BENT/IRREGULAR PATH")

    # Visualize on board
    board = [["  " for _ in range(5)] for _ in range(9)]
    for h in hex_positions:
        if h['id'] in chain:
            board[h['row']][h['col']] = f"{h['id']:2d}"
        else:
            board[h['row']][h['col']] = " ."

    print("\nVisualization:")
    print("      col: 0   1   2   3   4")
    print("    -------------------------")
    for row_idx in range(9):
        indent = " " * (4 - row_idx // 2)
        print(f"row {row_idx}: {indent}", end="")
        for col_idx in range(5):
            print(f"{board[row_idx][col_idx]}  ", end="")
        print()

print("=" * 80)
print("CHAIN SHAPE ANALYSIS")
print("=" * 80)

print("\n" + "=" * 80)
print("PLAYER 1 CHAINS")
print("=" * 80)

for i, chain in enumerate(player1_chains, 1):
    visualize_chain(chain, f"P1 Chain {i}")

print("\n" + "=" * 80)
print("PLAYER 2 CHAINS")
print("=" * 80)

for i, chain in enumerate(player2_chains, 1):
    visualize_chain(chain, f"P2 Chain {i}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

print("\nChecking if chains are straight or bent...")
