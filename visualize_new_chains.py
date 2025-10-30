"""
Visualize the NEW symmetric chains
"""

# Updated symmetric chains
player1_chains = [
    [0, 2, 5],           # 3-hex chain
    [1, 4, 7, 10],       # 4-hex chain
    [3, 6, 9, 12, 15],   # 5-hex chain (center diagonal, includes starting hex 9)
    [8, 11, 14, 17],     # 4-hex chain
    [13, 16, 18]         # 3-hex chain
]

player2_chains = [
    [0, 1, 3],           # 3-hex chain
    [2, 4, 6, 8],        # 4-hex chain
    [5, 7, 9, 11, 13],   # 5-hex chain (center diagonal, includes starting hex 9)
    [10, 12, 14, 16],    # 4-hex chain (FIXED!)
    [15, 17, 18]         # 3-hex chain
]

def visualize_hex_layout(chains, player_name, symbol):
    """Visualize chains on the hex board"""

    print("=" * 80)
    print(f"{player_name} CHAINS - All Straight Diagonals!")
    print("=" * 80)

    for chain_idx, chain in enumerate(chains, 1):
        # Create empty board
        layout = [
            "          {}    ",       # row 0: hex 0
            "       {}     {}  ",     # row 1: hex 1, 2
            "    {}     {}     {}",   # row 2: hex 3, 4, 5
            "       {}     {}  ",     # row 3: hex 6, 7
            "    {}     {}    {}",    # row 4: hex 8, 9, 10
            "      {}    {}  ",       # row 5: hex 11, 12
            "   {}    {}    {}",      # row 6: hex 13, 14, 15
            "      {}    {}  ",       # row 7: hex 16, 17
            "         {}     "        # row 8: hex 18
        ]

        # Map hex IDs to their position in layout format strings
        hex_to_position = {
            0: (0, 0),
            1: (1, 0), 2: (1, 1),
            3: (2, 0), 4: (2, 1), 5: (2, 2),
            6: (3, 0), 7: (3, 1),
            8: (4, 0), 9: (4, 1), 10: (4, 2),
            11: (5, 0), 12: (5, 1),
            13: (6, 0), 14: (6, 1), 15: (6, 2),
            16: (7, 0), 17: (7, 1),
            18: (8, 0)
        }

        # Fill in the board
        display_values = []
        for row_idx, row_template in enumerate(layout):
            row_hexes = [h for h, (r, p) in hex_to_position.items() if r == row_idx]
            row_vals = []
            for hex_id in sorted(row_hexes):
                if hex_id in chain:
                    if hex_id == 9:  # Starting position
                        row_vals.append(f"{symbol}*")
                    else:
                        row_vals.append(f"{symbol}{symbol}")
                else:
                    row_vals.append(" .")
            display_values.append(row_vals)

        # Print the chain
        print(f"\nChain {chain_idx}: {chain} ({len(chain)} hexes)")
        for row_idx, row_template in enumerate(layout):
            if row_idx < len(display_values):
                print(row_template.format(*display_values[row_idx]))

# Visualize both players
visualize_hex_layout(player1_chains, "PLAYER 1 (Down-Right \\)", "P1")
print("\n")
visualize_hex_layout(player2_chains, "PLAYER 2 (Down-Left /)", "P2")

# Show all chains together
print("\n" + "=" * 80)
print("COMBINED VIEW - ALL CHAINS")
print("=" * 80)

print("\nPlayer 1 (P1) vs Player 2 (P2) chains:")
print("  * = Starting position (hex 9)")
print()

# Combined visualization
hex_to_position = {
    0: (0, 0),
    1: (1, 0), 2: (1, 1),
    3: (2, 0), 4: (2, 1), 5: (2, 2),
    6: (3, 0), 7: (3, 1),
    8: (4, 0), 9: (4, 1), 10: (4, 2),
    11: (5, 0), 12: (5, 1),
    13: (6, 0), 14: (6, 1), 15: (6, 2),
    16: (7, 0), 17: (7, 1),
    18: (8, 0)
}

layout = [
    "          {}    ",
    "       {}     {}  ",
    "    {}     {}     {}",
    "       {}     {}  ",
    "    {}     {}    {}",
    "      {}    {}  ",
    "   {}    {}    {}",
    "      {}    {}  ",
    "         {}     "
]

# Determine what to show for each hex
p1_hexes = set()
p2_hexes = set()
both_hexes = set()

for chain in player1_chains:
    for h in chain:
        p1_hexes.add(h)

for chain in player2_chains:
    for h in chain:
        if h in p1_hexes:
            both_hexes.add(h)
        else:
            p2_hexes.add(h)

# Remove both from individual sets
p1_hexes -= both_hexes
p2_hexes -= both_hexes

display_values = []
for row_idx, row_template in enumerate(layout):
    row_hexes = [h for h, (r, p) in hex_to_position.items() if r == row_idx]
    row_vals = []
    for hex_id in sorted(row_hexes):
        if hex_id in both_hexes:
            if hex_id == 9:
                row_vals.append("**")  # Starting position in both
            else:
                row_vals.append("AB")  # Both players
        elif hex_id in p1_hexes:
            row_vals.append("P1")
        elif hex_id in p2_hexes:
            row_vals.append("P2")
        else:
            row_vals.append(" .")
    display_values.append(row_vals)

for row_idx, row_template in enumerate(layout):
    if row_idx < len(display_values):
        print(row_template.format(*display_values[row_idx]))

print("\nLegend:")
print("  P1 = Player 1 only chain")
print("  P2 = Player 2 only chain")
print("  AB = Both players have chains through this hex")
print("  ** = Starting position (hex 9, both players)")

# Summary
print("\n" + "=" * 80)
print("CHAIN SUMMARY")
print("=" * 80)

print("\nPlayer 1 Chains (down-right diagonals \\):")
for i, chain in enumerate(player1_chains, 1):
    adjacent_to_9 = [h for h in chain if h in [4, 6, 7, 11, 12, 14]]
    print(f"  Chain {i}: {chain}")
    if 9 in chain:
        print(f"    -> Includes starting hex 9, adjacent hexes: {adjacent_to_9}")

print("\nPlayer 2 Chains (down-left diagonals /):")
for i, chain in enumerate(player2_chains, 1):
    adjacent_to_9 = [h for h in chain if h in [4, 6, 7, 11, 12, 14]]
    if i == 4:
        print(f"  Chain {i}: {chain} <- FIXED for symmetry!")
    else:
        print(f"  Chain {i}: {chain}")
    if 9 in chain:
        print(f"    -> Includes starting hex 9, adjacent hexes: {adjacent_to_9}")

print("\n" + "=" * 80)
