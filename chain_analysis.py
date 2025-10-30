import json

print("=" * 80)
print("WHY HEX 7 BEATS HEX 11: CHAIN ASYMMETRY EXPLANATION")
print("=" * 80)

player1_chains = [
    [0, 2, 5],           # Chain 1
    [1, 4, 7, 10],       # Chain 2 - INCLUDES HEX 7
    [3, 6, 9, 12, 15],   # Chain 3 - center diagonal
    [8, 11, 14, 17],     # Chain 4 - INCLUDES HEX 11
    [13, 16, 18]         # Chain 5
]

player2_chains = [
    [0, 1, 3],           # Chain 1
    [2, 4, 6, 8],        # Chain 2
    [5, 7, 9, 11, 13],   # Chain 3 - INCLUDES BOTH HEX 7 AND HEX 11
    [12, 14, 16, 10],    # Chain 4
    [15, 17, 18]         # Chain 5
]

print("\nKey observation:")
print("- Hex 7 is in P1 Chain 2: [1, 4, 7, 10]")
print("- Hex 11 is in P1 Chain 4: [8, 11, 14, 17]")
print("- BOTH hex 7 and 11 are in P2 Chain 3: [5, 7, 9, 11, 13]")

print("\nAnalyzing the chains that include starting position (hex 9):")
print()

# Find chains containing hex 9
print("Chains containing hex 9 (starting position):")
for i, chain in enumerate(player1_chains, 1):
    if 9 in chain:
        print(f"  P1 Chain {i}: {chain}")
        print(f"    Length: {len(chain)}")
        print(f"    Adjacent to hex 9: {[h for h in chain if abs(h - 9) <= 5 and h != 9]}")

for i, chain in enumerate(player2_chains, 1):
    if 9 in chain:
        print(f"  P2 Chain {i}: {chain}")
        print(f"    Length: {len(chain)}")
        # Check which adjacent hexes are in this chain
        adjacent_to_9 = [4, 6, 7, 11, 12, 14]
        in_chain = [h for h in adjacent_to_9 if h in chain]
        print(f"    Adjacent hexes in this chain: {in_chain}")

print("\n" + "=" * 80)
print("CRITICAL INSIGHT")
print("=" * 80)

print("\nP1 Chain 3 (center diagonal): [3, 6, 9, 12, 15]")
print("  Adjacent to hex 9: 6, 12")
print("  Length: 5 hexes")
print()
print("P2 Chain 3 (long diagonal): [5, 7, 9, 11, 13]")
print("  Adjacent to hex 9: 7, 11")
print("  Length: 5 hexes")
print()

print("When Player 1 takes hex 7:")
print("  ✓ Advances P1's Chain 2 [1, 4, 7, 10] (4-hex chain)")
print("  ✓ BLOCKS P2's Chain 3 [5, 7, 9, 11, 13] (5-hex chain!)")
print("  → Hex 7 is valuable because it's part of P1's 4-chain AND blocks P2's LONGEST chain")
print()

print("When Player 1 takes hex 11:")
print("  ✓ Advances P1's Chain 4 [8, 11, 14, 17] (4-hex chain)")
print("  ✓ BLOCKS P2's Chain 3 [5, 7, 9, 11, 13] (5-hex chain)")
print("  → Hex 11 has similar properties to hex 7...")
print()

print("BUT WAIT - there's more!")
print()

# Check connectivity
print("P1 Chain 2: [1, 4, 7, 10]")
print("  Starting from hex 9, to reach hex 1 or 10:")
print("  - Path to 10: 9 → 7 → 10 (2 steps, hex 7 already adjacent!)")
print("  - Path to 1: Need to go through 4, then 1 (longer)")
print()

print("P1 Chain 4: [8, 11, 14, 17]")
print("  Starting from hex 9, to reach hex 8 or 17:")
print("  - Path to 14: 9 → 11 → 14 (2 steps)")
print("  - Path to 8: 9 → 11 → 8 (2 steps)")
print()

# The real difference
print("=" * 80)
print("THE REAL ASYMMETRY")
print("=" * 80)

print("\nLet's look at what happens AFTER the opening move:")
print()

print("After P1 plays hex 7:")
print("  P1's Chain 2 [1, 4, 7, 10] now has:")
print("    - Hex 7 occupied by P1")
print("    - Hex 10 is adjacent to hex 7 (can be reached next turn)")
print("    - Hex 4 is adjacent to hex 9 (starting position)")
print("  → P1 can potentially get 3/4 of this chain quickly!")
print()

print("After P1 plays hex 11:")
print("  P1's Chain 4 [8, 11, 14, 17] now has:")
print("    - Hex 11 occupied by P1")
print("    - Hex 14 is adjacent to hex 9 (starting position)")
print("    - Hex 8 is adjacent to hex 11")
print("  → Similar structure...")
print()

# Check the actual chains more carefully
print("=" * 80)
print("EXAMINING CHAIN COMPLETION POTENTIAL")
print("=" * 80)

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

print("\nP1 Chain 2: [1, 4, 7, 10]")
for h_id in [1, 4, 7, 10]:
    h = hex_positions[h_id]
    print(f"  Hex {h_id}: row {h['row']}, col {h['col']}")
print("  → Forms a diagonal: (1,1) → (2,2) → (3,3) → (4,4)")
print("  → Upper-right diagonal, easier to complete from the right side?")
print()

print("P1 Chain 4: [8, 11, 14, 17]")
for h_id in [8, 11, 14, 17]:
    h = hex_positions[h_id]
    print(f"  Hex {h_id}: row {h['row']}, col {h['col']}")
print("  → Forms a diagonal: (4,0) → (5,1) → (6,2) → (7,3)")
print("  → Lower-left to upper-right diagonal")
print()

print("HYPOTHESIS:")
print("The chains are oriented differently!")
print("- P1 Chain 2 (with hex 7) runs upper-right")
print("- P1 Chain 4 (with hex 11) runs from lower-left")
print()
print("Chain 2 may be 'easier' to complete because:")
print("1. It's oriented toward the upper-right (away from Player 2's typical expansion)")
print("2. Or there's an interaction with Player 2's chains that favors this direction")
print()

# Check Player 2's chains for blocking potential
print("=" * 80)
print("PLAYER 2 COUNTER-PLAY ANALYSIS")
print("=" * 80)

print("\nWhen P1 takes hex 7, what can P2 do?")
print("P2's best response was hex 10 (74.4% WR)")
print()
print("Hex 10 is in:")
for i, chain in enumerate(player1_chains, 1):
    if 10 in chain:
        print(f"  P1 Chain {i}: {chain}")
for i, chain in enumerate(player2_chains, 1):
    if 10 in chain:
        print(f"  P2 Chain {i}: {chain}")

print("\nBy taking hex 10, P2:")
print("  - Blocks P1's Chain 2 [1, 4, 7, 10] immediately!")
print("  - Advances P2's Chain 4 [12, 14, 16, 10]")
print()

print("When P1 takes hex 11, what would P2's best response be?")
print("Hex 11 is already on P1 Chain 4: [8, 11, 14, 17]")
print("P2 would want to block by taking hex 8, 14, or 17")
print()
print("Hex 14 is adjacent to starting position (hex 9)!")
print("So P2 could immediately block at hex 14.")
print()

print("CONCLUSION:")
print("Hex 7 might perform better because the resulting position after P1's")
print("first move gives P1 better control - P2's counter-move (hex 10) is")
print("further away and requires more commitment, whereas P2's counter to")
print("hex 11 (taking hex 14) is immediately adjacent to the starting position,")
print("making it easier for P2 to block effectively.")
