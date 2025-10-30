"""
Show the bottom chains clearly
"""

print("=" * 80)
print("BOTTOM CHAINS VISUALIZATION")
print("=" * 80)

print("\nHex positions on the board:")
print()
print("      col: 0   1   2   3   4")
print("    -------------------------")
print("row 0:              0          ")
print("row 1:          1       2      ")
print("row 2:     3       4       5   ")
print("row 3:         6       7       ")
print("row 4:    8       9      10    ")
print("row 5:       11      12        ")
print("row 6:  13      14      15     ")
print("row 7:      16      17         ")
print("row 8:         18              ")

print("\n" + "=" * 80)
print("PLAYER 1 Chain 5: [13, 16, 18] - Bottom LEFT diagonal")
print("=" * 80)

print("\nCoordinates:")
print("  Hex 13: row 6, col 0")
print("  Hex 16: row 7, col 1")
print("  Hex 18: row 8, col 2")

print("\nDirection: DOWN-RIGHT diagonal (\\)")
print("  Row increases: +1, +1")
print("  Col increases: +1, +1")

print("\nVisualization:")
print("      col: 0   1   2   3   4")
print("    -------------------------")
print("row 6:  13      .       .     ")
print("row 7:      16      .         ")
print("row 8:         18              ")
print("                \\")
print("          Diagonal goes down-right")

print("\n" + "=" * 80)
print("PLAYER 2 Chain 5: [15, 17, 18] - Bottom RIGHT diagonal")
print("=" * 80)

print("\nCoordinates:")
print("  Hex 15: row 6, col 4")
print("  Hex 17: row 7, col 3")
print("  Hex 18: row 8, col 2")

print("\nDirection: DOWN-LEFT diagonal (/)")
print("  Row increases: +1, +1")
print("  Col decreases: -1, -1")

print("\nVisualization:")
print("      col: 0   1   2   3   4")
print("    -------------------------")
print("row 6:  .       .      15     ")
print("row 7:      .      17         ")
print("row 8:         18              ")
print("                /")
print("          Diagonal goes down-left")

print("\n" + "=" * 80)
print("BOTH CHAINS TOGETHER")
print("=" * 80)

print("\nBoth chains MEET at hex 18 (the bottom center)!")
print()
print("      col: 0   1   2   3   4")
print("    -------------------------")
print("row 6:  P1      .      P2     ")
print("row 7:      P1     P2         ")
print("row 8:         18*             ")
print()
print("           \\   /")
print("            \\ /")
print("             X")
print("            / \\")
print("  P1 Chain 5   P2 Chain 5")

print("\n" + "=" * 80)
print("SYMMETRY CHECK")
print("=" * 80)

print("\nP1 Chain 5: [13, 16, 18]")
print("  - Starts at hex 13 (row 6, col 0) - BOTTOM LEFT")
print("  - Goes down-right (\\)")
print("  - Ends at hex 18 (row 8, col 2) - BOTTOM CENTER")
print("  - Length: 3 hexes")

print("\nP2 Chain 5: [15, 17, 18]")
print("  - Starts at hex 15 (row 6, col 4) - BOTTOM RIGHT")
print("  - Goes down-left (/)")
print("  - Ends at hex 18 (row 8, col 2) - BOTTOM CENTER")
print("  - Length: 3 hexes")

print("\nPERFECT MIRROR SYMMETRY!")
print("  - Both start at row 6 (same row)")
print("  - Both end at row 8, col 2 (same hex: 18)")
print("  - Both are 3 hexes long")
print("  - Mirror images across the center column")

print("\n" + "=" * 80)
print("ALL 5 CHAIN PAIRS")
print("=" * 80)

p1_chains = [
    ([0, 2, 5], "Top"),
    ([1, 4, 7, 10], "Upper-middle"),
    ([3, 6, 9, 12, 15], "Center (through starting hex 9)"),
    ([8, 11, 14, 17], "Lower-middle"),
    ([13, 16, 18], "Bottom")
]

p2_chains = [
    ([0, 1, 3], "Top"),
    ([2, 4, 6, 8], "Upper-middle"),
    ([5, 7, 9, 11, 13], "Center (through starting hex 9)"),
    ([10, 12, 14, 16], "Lower-middle"),
    ([15, 17, 18], "Bottom")
]

for i in range(5):
    p1_chain, p1_desc = p1_chains[i]
    p2_chain, p2_desc = p2_chains[i]

    print(f"\nPair {i+1}:")
    print(f"  P1: {p1_chain} - {p1_desc} - {len(p1_chain)} hexes - goes \\")
    print(f"  P2: {p2_chain} - {p2_desc} - {len(p2_chain)} hexes - goes /")

    # Check if they share hexes
    shared = set(p1_chain) & set(p2_chain)
    if shared:
        print(f"      SHARED HEXES: {sorted(shared)}")

print("\n" + "=" * 80)
