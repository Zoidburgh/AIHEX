"""
Analyze the NEW policy trained with SYMMETRIC chains
"""
import json

# Load NEW policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760926957866.json') as f:
    data = json.load(f)

print("=" * 80)
print("NEW POLICY WITH SYMMETRIC CHAINS - ANALYSIS")
print("=" * 80)

print(f"\nPolicy created: {data.get('created')}")
print(f"Total games: {data['totalGamesPlayed']:,}")
print(f"Total states: {len(data['database']):,}")

# Get opening state
first_state_key = list(data['database'].keys())[0]
opening_actions = data['database'][first_state_key]

print(f"\nOpening moves available: {len(opening_actions)}")

# Parse moves
def parse_move(move_str):
    parts = move_str.replace('t', '').split('h')
    return int(parts[0]), int(parts[1])

# Group by hex
hex_stats = {}
for move, stats in opening_actions.items():
    tile, hex_id = parse_move(move)
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0

    if hex_id not in hex_stats:
        hex_stats[hex_id] = []
    hex_stats[hex_id].append({
        'move': move,
        'wr': wr,
        'games': stats['gamesPlayed']
    })

print("\n" + "=" * 80)
print("CRITICAL SYMMETRY TEST: HEX 7 vs HEX 11")
print("=" * 80)

# Hex 7 and 11 are symmetric opposites
hex7_moves = hex_stats.get(7, [])
hex11_moves = hex_stats.get(11, [])

if hex7_moves and hex11_moves:
    hex7_avg_wr = sum(m['wr'] for m in hex7_moves) / len(hex7_moves)
    hex7_total_games = sum(m['games'] for m in hex7_moves)

    hex11_avg_wr = sum(m['wr'] for m in hex11_moves) / len(hex11_moves)
    hex11_total_games = sum(m['games'] for m in hex11_moves)

    difference = abs(hex7_avg_wr - hex11_avg_wr)

    print(f"\nHex 7 (row 3, col 3):")
    print(f"  Average WR: {hex7_avg_wr:.3f}")
    print(f"  Total games: {hex7_total_games:,}")
    print(f"  Move count: {len(hex7_moves)}")

    print(f"\nHex 11 (row 5, col 1):")
    print(f"  Average WR: {hex11_avg_wr:.3f}")
    print(f"  Total games: {hex11_total_games:,}")
    print(f"  Move count: {len(hex11_moves)}")

    print(f"\nDifference: {difference:.3f} ({difference * 100:.1f} percentage points)")

    if difference < 0.05:  # Less than 5% difference
        print("  CHECK MARK SYMMETRIC! (< 5% difference)")
    elif difference < 0.10:
        print("  ~ MOSTLY SYMMETRIC (5-10% difference)")
    else:
        print("  X STILL ASYMMETRIC (> 10% difference)")

print("\n" + "=" * 80)
print("OTHER SYMMETRIC PAIRS")
print("=" * 80)

symmetric_pairs = [
    (4, 14, "Hex 4 (row 2, col 2) vs Hex 14 (row 6, col 2)"),
    (6, 12, "Hex 6 (row 3, col 1) vs Hex 12 (row 5, col 3)"),
    (7, 11, "Hex 7 (row 3, col 3) vs Hex 11 (row 5, col 1)")
]

for hex1, hex2, description in symmetric_pairs:
    h1_moves = hex_stats.get(hex1, [])
    h2_moves = hex_stats.get(hex2, [])

    if h1_moves and h2_moves:
        h1_avg = sum(m['wr'] for m in h1_moves) / len(h1_moves)
        h2_avg = sum(m['wr'] for m in h2_moves) / len(h2_moves)
        diff = abs(h1_avg - h2_avg)

        print(f"\n{description}:")
        print(f"  Hex {hex1}: {h1_avg:.3f} avg WR")
        print(f"  Hex {hex2}: {h2_avg:.3f} avg WR")
        print(f"  Difference: {diff:.3f} ({diff * 100:.1f}%)")

        if diff < 0.05:
            status = "CHECK SYMMETRIC"
        elif diff < 0.10:
            status = "~ MOSTLY SYMMETRIC"
        else:
            status = "X ASYMMETRIC"
        print(f"  {status}")

print("\n" + "=" * 80)
print("COLUMN BALANCE CHECK")
print("=" * 80)

# Hex to column mapping
hex_to_col = {
    0: 2,
    1: 1, 2: 3,
    3: 0, 4: 2, 5: 4,
    6: 1, 7: 3,
    8: 0, 9: 2, 10: 4,
    11: 1, 12: 3,
    13: 0, 14: 2, 15: 4,
    16: 1, 17: 3,
    18: 2
}

col_stats = {}
for hex_id, moves in hex_stats.items():
    col = hex_to_col[hex_id]
    if col not in col_stats:
        col_stats[col] = []
    col_stats[col].extend(moves)

print(f"\nColumn performance (Col 1 vs Col 3 should be equal with symmetric chains):")
for col in sorted(col_stats.keys()):
    moves = col_stats[col]
    avg_wr = sum(m['wr'] for m in moves) / len(moves)
    total_games = sum(m['games'] for m in moves)
    print(f"  Column {col}: Avg WR = {avg_wr:.3f}, Total games = {total_games:,}")

if 1 in col_stats and 3 in col_stats:
    col1_avg = sum(m['wr'] for m in col_stats[1]) / len(col_stats[1])
    col3_avg = sum(m['wr'] for m in col_stats[3]) / len(col_stats[3])
    col_diff = abs(col1_avg - col3_avg)

    print(f"\nColumn 1 vs Column 3:")
    print(f"  Difference: {col_diff:.3f} ({col_diff * 100:.1f}%)")

    if col_diff < 0.05:
        print("  CHECK BALANCED!")
    elif col_diff < 0.10:
        print("  ~ MOSTLY BALANCED")
    else:
        print("  X STILL IMBALANCED")

print("\n" + "=" * 80)
print("TOP 10 OPENING MOVES")
print("=" * 80)

all_moves = []
for move, stats in opening_actions.items():
    tile, hex_id = parse_move(move)
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0
    all_moves.append({
        'move': move,
        'hex': hex_id,
        'wr': wr,
        'games': stats['gamesPlayed']
    })

all_moves.sort(key=lambda x: x['wr'], reverse=True)

print(f"\n{'Rank':<6} {'Move':<10} {'Hex':<5} {'WR':<8} {'Games':<8}")
print("-" * 45)
for i, m in enumerate(all_moves[:10], 1):
    print(f"{i:<6} {m['move']:<10} {m['hex']:<5} {m['wr']:<8.3f} {m['games']:<8}")

print("\n" + "=" * 80)
print("VERDICT")
print("=" * 80)

# Calculate overall symmetry score
if hex7_moves and hex11_moves:
    h7_avg = sum(m['wr'] for m in hex7_moves) / len(hex7_moves)
    h11_avg = sum(m['wr'] for m in hex11_moves) / len(hex11_moves)
    main_diff = abs(h7_avg - h11_avg)

    print(f"\nHex 7 vs Hex 11 difference: {main_diff * 100:.1f}%")

    if main_diff < 0.03:
        print("CHECK CHECK CHECK EXCELLENT! Chains are now symmetric!")
        print("The bent chain fix worked perfectly.")
    elif main_diff < 0.05:
        print("CHECK CHECK VERY GOOD! Nearly symmetric.")
        print("Small differences are expected with limited games.")
    elif main_diff < 0.10:
        print("CHECK IMPROVED! Much better than before.")
        print(f"Old difference was 14.0%, now {main_diff * 100:.1f}%")
    else:
        print("X STILL ASYMMETRIC")
        print("Something else may be causing the imbalance.")
        print("Possible causes:")
        print("  1. Training artifact (needs more games)")
        print("  2. True strategic asymmetry (first-move advantage)")
        print("  3. Chain fix didn't apply (check engine version)")

print("\n" + "=" * 80)
