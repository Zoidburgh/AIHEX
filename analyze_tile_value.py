"""
Analyze if TILE VALUE matters for opening moves
Does placing a 5 vs a 9 make a difference?
"""
import json

# Load the policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760926957866.json') as f:
    data = json.load(f)

print("=" * 80)
print("TILE VALUE ANALYSIS - Does tile number matter?")
print("=" * 80)

# Get opening state
first_state_key = list(data['database'].keys())[0]
opening_actions = data['database'][first_state_key]

print(f"\nTotal games: {data['totalGamesPlayed']:,}")
print(f"Opening moves available: {len(opening_actions)}")

# Parse moves
def parse_move(move_str):
    """Parse 't1h7' into tile=1, hex=7"""
    parts = move_str.replace('t', '').split('h')
    return int(parts[0]), int(parts[1])

# Group by tile value
tile_stats = {}
for move, stats in opening_actions.items():
    tile, hex_id = parse_move(move)
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0

    if tile not in tile_stats:
        tile_stats[tile] = []

    tile_stats[tile].append({
        'move': move,
        'hex': hex_id,
        'wr': wr,
        'games': stats['gamesPlayed'],
        'wins': stats['wins'],
        'losses': stats['losses']
    })

print("\n" + "=" * 80)
print("TILE VALUE PERFORMANCE (Tiles 1-9)")
print("=" * 80)

print(f"\n{'Tile':<6} {'Avg WR':<10} {'Total Games':<15} {'Positions':<12} {'Best WR':<10} {'Worst WR'}")
print("-" * 75)

tile_summary = []
for tile in sorted(tile_stats.keys()):
    moves = tile_stats[tile]
    avg_wr = sum(m['wr'] for m in moves) / len(moves)
    total_games = sum(m['games'] for m in moves)
    best_wr = max(m['wr'] for m in moves)
    worst_wr = min(m['wr'] for m in moves)

    tile_summary.append({
        'tile': tile,
        'avg_wr': avg_wr,
        'games': total_games,
        'count': len(moves),
        'best': best_wr,
        'worst': worst_wr
    })

    print(f"{tile:<6} {avg_wr:<10.3f} {total_games:<15,} {len(moves):<12} {best_wr:<10.3f} {worst_wr:.3f}")

# Statistical analysis
avg_wrs = [t['avg_wr'] for t in tile_summary]
mean_wr = sum(avg_wrs) / len(avg_wrs)
variance = sum((wr - mean_wr)**2 for wr in avg_wrs) / len(avg_wrs)
std_dev = variance ** 0.5

print(f"\nStatistical Summary:")
print(f"  Mean tile WR: {mean_wr:.3f}")
print(f"  Std deviation: {std_dev:.3f}")
print(f"  Range: {min(avg_wrs):.3f} - {max(avg_wrs):.3f} ({max(avg_wrs) - min(avg_wrs):.3f} spread)")

print("\n" + "=" * 80)
print("TILE VALUE RANKING")
print("=" * 80)

tile_summary.sort(key=lambda x: x['avg_wr'], reverse=True)

print(f"\nBest to Worst tiles by average win rate:")
print(f"{'Rank':<6} {'Tile':<6} {'Avg WR':<10} {'Total Games':<15} {'Verdict'}")
print("-" * 60)

for i, t in enumerate(tile_summary, 1):
    deviation = abs(t['avg_wr'] - mean_wr)
    if deviation < std_dev * 0.5:
        verdict = "Average"
    elif t['avg_wr'] > mean_wr:
        verdict = "Above Average"
    else:
        verdict = "Below Average"

    print(f"{i:<6} {t['tile']:<6} {t['avg_wr']:<10.3f} {t['games']:<15,} {verdict}")

print("\n" + "=" * 80)
print("SPECIFIC TILE COMPARISONS")
print("=" * 80)

# Compare high vs low tiles
high_tiles = [t for t in tile_summary if t['tile'] >= 7]  # Tiles 7, 8, 9
low_tiles = [t for t in tile_summary if t['tile'] <= 3]   # Tiles 1, 2, 3
mid_tiles = [t for t in tile_summary if 4 <= t['tile'] <= 6]  # Tiles 4, 5, 6

high_avg = sum(t['avg_wr'] for t in high_tiles) / len(high_tiles) if high_tiles else 0
low_avg = sum(t['avg_wr'] for t in low_tiles) / len(low_tiles) if low_tiles else 0
mid_avg = sum(t['avg_wr'] for t in mid_tiles) / len(mid_tiles) if mid_tiles else 0

print(f"\nHigh tiles (7-9): Avg WR = {high_avg:.3f}")
print(f"Mid tiles (4-6):  Avg WR = {mid_avg:.3f}")
print(f"Low tiles (1-3):  Avg WR = {low_avg:.3f}")

print(f"\nDifference (High vs Low): {abs(high_avg - low_avg):.3f} ({abs(high_avg - low_avg) * 100:.1f}%)")

if abs(high_avg - low_avg) < 0.03:
    print("  -> Tile value does NOT significantly matter!")
elif abs(high_avg - low_avg) < 0.05:
    print("  -> Tile value has MINOR effect")
else:
    print("  -> Tile value MATTERS!")

print("\n" + "=" * 80)
print("BEST TILE FOR EACH HEX POSITION")
print("=" * 80)

# For each hex, find which tile performs best
hex_best_tiles = {}
for tile, moves in tile_stats.items():
    for m in moves:
        hex_id = m['hex']
        if hex_id not in hex_best_tiles:
            hex_best_tiles[hex_id] = []
        hex_best_tiles[hex_id].append({
            'tile': tile,
            'wr': m['wr'],
            'games': m['games']
        })

print(f"\nFor the 6 hexes adjacent to starting position:")
adjacent_hexes = [4, 6, 7, 11, 12, 14]

print(f"\n{'Hex':<6} {'Best Tile':<12} {'WR':<10} {'Worst Tile':<12} {'WR':<10} {'Range'}")
print("-" * 65)

for hex_id in sorted(adjacent_hexes):
    if hex_id in hex_best_tiles:
        tiles = hex_best_tiles[hex_id]
        tiles.sort(key=lambda x: x['wr'], reverse=True)

        best = tiles[0]
        worst = tiles[-1]
        tile_range = best['wr'] - worst['wr']

        print(f"{hex_id:<6} Tile {best['tile']:<8} {best['wr']:<10.3f} Tile {worst['tile']:<8} {worst['wr']:<10.3f} {tile_range:.3f}")

print("\n" + "=" * 80)
print("EXAMPLE: SPECIFIC TILE ANALYSIS")
print("=" * 80)

# Compare tile 1 vs tile 9 specifically
print(f"\nTile 1 (lowest value) vs Tile 9 (highest value):")

tile1_moves = tile_stats[1]
tile9_moves = tile_stats[9]

tile1_avg = sum(m['wr'] for m in tile1_moves) / len(tile1_moves)
tile9_avg = sum(m['wr'] for m in tile9_moves) / len(tile9_moves)

print(f"\nTile 1:")
print(f"  Average WR: {tile1_avg:.3f}")
print(f"  Total games: {sum(m['games'] for m in tile1_moves):,}")
print(f"  Best position: {max(tile1_moves, key=lambda x: x['wr'])['move']} (WR={max(m['wr'] for m in tile1_moves):.3f})")
print(f"  Worst position: {min(tile1_moves, key=lambda x: x['wr'])['move']} (WR={min(m['wr'] for m in tile1_moves):.3f})")

print(f"\nTile 9:")
print(f"  Average WR: {tile9_avg:.3f}")
print(f"  Total games: {sum(m['games'] for m in tile9_moves):,}")
print(f"  Best position: {max(tile9_moves, key=lambda x: x['wr'])['move']} (WR={max(m['wr'] for m in tile9_moves):.3f})")
print(f"  Worst position: {min(tile9_moves, key=lambda x: x['wr'])['move']} (WR={min(m['wr'] for m in tile9_moves):.3f})")

diff_1_9 = abs(tile1_avg - tile9_avg)
print(f"\nDifference: {diff_1_9:.3f} ({diff_1_9 * 100:.1f}%)")

print("\n" + "=" * 80)
print("CONCLUSION")
print("=" * 80)

max_tile_diff = max(avg_wrs) - min(avg_wrs)
print(f"\nLargest tile difference: {max_tile_diff:.3f} ({max_tile_diff * 100:.1f}%)")

if max_tile_diff < 0.03:
    print("\nCONCLUSION: Tile value does NOT matter significantly.")
    print("Position (hex) is much more important than tile number.")
elif max_tile_diff < 0.05:
    print("\nCONCLUSION: Tile value has a SMALL effect.")
    print("Position still matters more, but tile choice has minor impact.")
else:
    print("\nCONCLUSION: Tile value MATTERS!")
    print("Choosing the right tile can give you an advantage.")

best_tile = tile_summary[0]
worst_tile = tile_summary[-1]
print(f"\nBest tile overall: Tile {best_tile['tile']} ({best_tile['avg_wr']:.3f} avg WR)")
print(f"Worst tile overall: Tile {worst_tile['tile']} ({worst_tile['avg_wr']:.3f} avg WR)")

print("\n" + "=" * 80)
