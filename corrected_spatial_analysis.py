import json

# Actual hex positions from hexuki_game_engine_v2.js
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

# Player chains (winning conditions)
player1_chains = [
    [0, 2, 5],           # AA - CC - FF (top diagonal)
    [1, 4, 7, 10],       # BB - EE - HH - KK
    [3, 6, 9, 12, 15],   # DD - GG - JJ - MM - PP (left to right diagonal)
    [8, 11, 14, 17],     # II - LL - OO - RR
    [13, 16, 18]         # NN - QQ - SS (bottom diagonal)
]

player2_chains = [
    [0, 1, 3],           # AA - BB - DD (top-left)
    [2, 4, 6, 8],        # CC - EE - GG - II
    [5, 7, 9, 11, 13],   # FF - HH - JJ - LL - NN (top-right to bottom-left diagonal)
    [12, 14, 16, 10],    # MM - OO - QQ - KK
    [15, 17, 18]         # PP - RR - SS (bottom)
]

# Load the policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760926723449.json') as f:
    data = json.load(f)

# Get opening state
first_state_key = list(data['database'].keys())[0]
opening_actions = data['database'][first_state_key]

print("=" * 80)
print("CORRECTED STRATEGIC ANALYSIS - MOVES 1 & 2")
print("=" * 80)

print("\nActual board layout (row, col):")
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

print(f"\nStarting position: Hex 9 (row 4, col 2) - TRUE CENTER")
print("\nPlayer 1 wins by completing one of these chains:")
for i, chain in enumerate(player1_chains, 1):
    print(f"  Chain {i}: {chain}")

print("\nPlayer 2 wins by completing one of these chains:")
for i, chain in enumerate(player2_chains, 1):
    print(f"  Chain {i}: {chain}")

# Parse move to hex mapping
def parse_move_to_hex(move_str):
    """Parse 't1h7' to get tile=1, hex=7"""
    parts = move_str.replace('t', '').split('h')
    return int(parts[0]), int(parts[1])

# Analyze opening moves
print("\n" + "=" * 80)
print("TOP 10 OPENING MOVES - WITH CORRECT HEX POSITIONS")
print("=" * 80)

moves_analysis = []
for move, stats in opening_actions.items():
    tile, hex_id = parse_move_to_hex(move)
    hex_pos = hex_positions[hex_id]
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0

    # Determine which chains this hex is part of
    p1_chains_involved = [i for i, chain in enumerate(player1_chains, 1) if hex_id in chain]
    p2_chains_involved = [i for i, chain in enumerate(player2_chains, 1) if hex_id in chain]

    moves_analysis.append({
        'move': move,
        'tile': tile,
        'hex_id': hex_id,
        'row': hex_pos['row'],
        'col': hex_pos['col'],
        'wr': wr,
        'games': stats['gamesPlayed'],
        'wins': stats['wins'],
        'losses': stats['losses'],
        'p1_chains': p1_chains_involved,
        'p2_chains': p2_chains_involved
    })

moves_analysis.sort(key=lambda x: x['wr'], reverse=True)

print(f"\n{'Rank':<5} {'Move':<10} {'Hex':<5} {'Row':<5} {'Col':<5} {'WR':<7} {'Games':<7} {'P1 Chains':<12} {'P2 Chains'}")
print("-" * 95)
for i, m in enumerate(moves_analysis[:10], 1):
    p1c = str(m['p1_chains']) if m['p1_chains'] else '-'
    p2c = str(m['p2_chains']) if m['p2_chains'] else '-'
    print(f"{i:<5} {m['move']:<10} {m['hex_id']:<5} {m['row']:<5} {m['col']:<5} {m['wr']:<7.3f} {m['games']:<7} {p1c:<12} {p2c}")

print("\n" + "=" * 80)
print("BOTTOM 10 OPENING MOVES")
print("=" * 80)
print(f"\n{'Rank':<5} {'Move':<10} {'Hex':<5} {'Row':<5} {'Col':<5} {'WR':<7} {'Games':<7} {'P1 Chains':<12} {'P2 Chains'}")
print("-" * 95)
for i, m in enumerate(moves_analysis[-10:], 1):
    p1c = str(m['p1_chains']) if m['p1_chains'] else '-'
    p2c = str(m['p2_chains']) if m['p2_chains'] else '-'
    print(f"{i:<5} {m['move']:<10} {m['hex_id']:<5} {m['row']:<5} {m['col']:<5} {m['wr']:<7.3f} {m['games']:<7} {p1c:<12} {p2c}")

# Analyze by chains
print("\n" + "=" * 80)
print("STRATEGIC PATTERNS BY CHAIN")
print("=" * 80)

# Determine adjacent hexes to starting position (hex 9)
starting_hex = 9
adjacent_to_start = [4, 6, 7, 11, 12, 14]  # From earlier analysis

print(f"\nHexes adjacent to starting position (hex 9): {adjacent_to_start}")

# Group by Player 1 chains
print("\nPlayer 1 Chain Analysis (Player 1's winning paths):")
for chain_idx, chain in enumerate(player1_chains, 1):
    chain_hexes = [h for h in adjacent_to_start if h in chain]
    if chain_hexes:
        # Get stats for moves on this chain
        chain_moves = [m for m in moves_analysis if m['hex_id'] in chain_hexes]
        if chain_moves:
            avg_wr = sum(m['wr'] for m in chain_moves) / len(chain_moves)
            total_games = sum(m['games'] for m in chain_moves)
            best = max(chain_moves, key=lambda x: x['wr'])
            print(f"  Chain {chain_idx} {chain}: Hexes {chain_hexes}")
            print(f"    Avg WR: {avg_wr:.3f}, Total games: {total_games}, Best: {best['move']} ({best['wr']:.3f})")

print("\nPlayer 2 Chain Analysis (Player 2's winning paths):")
for chain_idx, chain in enumerate(player2_chains, 1):
    chain_hexes = [h for h in adjacent_to_start if h in chain]
    if chain_hexes:
        # Get stats for moves on this chain
        chain_moves = [m for m in moves_analysis if m['hex_id'] in chain_hexes]
        if chain_moves:
            avg_wr = sum(m['wr'] for m in chain_moves) / len(chain_moves)
            total_games = sum(m['games'] for m in chain_moves)
            best = max(chain_moves, key=lambda x: x['wr'])
            print(f"  Chain {chain_idx} {chain}: Hexes {chain_hexes}")
            print(f"    Avg WR: {avg_wr:.3f}, Total games: {total_games}, Best: {best['move']} ({best['wr']:.3f})")

# Position analysis
print("\n" + "=" * 80)
print("SPATIAL ANALYSIS")
print("=" * 80)

# Group by row
print("\nPerformance by ROW:")
for row in range(9):
    row_moves = [m for m in moves_analysis if m['row'] == row]
    if row_moves:
        avg_wr = sum(m['wr'] for m in row_moves) / len(row_moves)
        total_games = sum(m['games'] for m in row_moves)
        best = max(row_moves, key=lambda x: x['wr'])
        print(f"  Row {row}: Avg WR={avg_wr:.3f}, Games={total_games:5d}, Best={best['move']} ({best['wr']:.3f})")

# Group by column
print("\nPerformance by COLUMN:")
for col in range(5):
    col_moves = [m for m in moves_analysis if m['col'] == col]
    if col_moves:
        avg_wr = sum(m['wr'] for m in col_moves) / len(col_moves)
        total_games = sum(m['games'] for m in col_moves)
        best = max(col_moves, key=lambda x: x['wr'])
        print(f"  Col {col}: Avg WR={avg_wr:.3f}, Games={total_games:5d}, Best={best['move']} ({best['wr']:.3f})")

print("\n" + "=" * 80)
