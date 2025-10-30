import json

# Load the policy
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen20_1760924716749.json') as f:
    data = json.load(f)

# Parse move notation: t{tile}h{hex}
def parse_move(move_str):
    """Parse move like 't1h7' into tile=1, hex=7"""
    parts = move_str.replace('t', '').split('h')
    return int(parts[0]), int(parts[1])

# Hex grid layout (19 hexes):
# Layout based on typical hex grid numbering
# We'll map hex positions to approximate (x, y) coordinates
def hex_to_coords(hex_num):
    """Map hex number to approximate grid coordinates"""
    # Typical 19-hex board layout (hexagonal shape)
    # Row-based layout:
    #     0  1  2
    #   3  4  5  6
    # 7  8  9 10 11
    #  12 13 14 15
    #    16 17 18

    hex_coords = {
        0: (1, 0), 1: (2, 0), 2: (3, 0),
        3: (0, 1), 4: (1, 1), 5: (2, 1), 6: (3, 1),
        7: (0, 2), 8: (1, 2), 9: (2, 2), 10: (3, 2), 11: (4, 2),
        12: (1, 3), 13: (2, 3), 14: (3, 3), 15: (4, 3),
        16: (2, 4), 17: (3, 4), 18: (4, 4)
    }
    return hex_coords.get(hex_num, (0, 0))

def distance(hex1, hex2):
    """Calculate approximate distance between two hexes"""
    x1, y1 = hex_to_coords(hex1)
    x2, y2 = hex_to_coords(hex2)
    return ((x1 - x2)**2 + (y1 - y2)**2)**0.5

# Analyze opening position (Move 1)
first_state_key = list(data['database'].keys())[0]
opening_actions = data['database'][first_state_key]

print("=" * 80)
print("MOVE 1 (OPENING) - SPATIAL AND STRATEGIC ANALYSIS")
print("=" * 80)

# The starting piece is at position 9 (center of board, based on state key)
starting_hex = 9  # From state: "1p2" at position 9

print(f"\nStarting position: Hex {starting_hex} (center of board)")
print("\nBoard layout reference:")
print("     0  1  2")
print("   3  4  5  6")
print(" 7  8  9 10 11")
print("  12 13 14 15")
print("    16 17 18")
print(f"\nPlayer 2 starts with a piece at hex {starting_hex}")

# Analyze all opening moves
move_analysis = []
for move, stats in opening_actions.items():
    tile, hex_pos = parse_move(move)
    wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0
    dist = distance(hex_pos, starting_hex)
    move_analysis.append({
        'move': move,
        'tile': tile,
        'hex': hex_pos,
        'wr': wr,
        'games': stats['gamesPlayed'],
        'wins': stats['wins'],
        'losses': stats['losses'],
        'distance': dist
    })

# Sort by win rate
move_analysis.sort(key=lambda x: x['wr'], reverse=True)

print(f"\n{'='*80}")
print("TOP 15 OPENING MOVES (by win rate)")
print(f"{'='*80}")
print(f"{'Rank':<5} {'Move':<10} {'Tile':<5} {'Hex':<5} {'Dist':<6} {'WR':<7} {'Games':<7} {'W':<9} {'L':<9}")
print("-" * 80)

for i, m in enumerate(move_analysis[:15], 1):
    print(f"{i:<5} {m['move']:<10} {m['tile']:<5} {m['hex']:<5} {m['distance']:<6.1f} {m['wr']:<7.3f} {m['games']:<7} {m['wins']:<9.1f} {m['losses']:<9.1f}")

print(f"\n{'='*80}")
print("BOTTOM 15 OPENING MOVES (by win rate)")
print(f"{'='*80}")
print(f"{'Rank':<5} {'Move':<10} {'Tile':<5} {'Hex':<5} {'Dist':<6} {'WR':<7} {'Games':<7} {'W':<9} {'L':<9}")
print("-" * 80)

for i, m in enumerate(move_analysis[-15:], 1):
    print(f"{i:<5} {m['move']:<10} {m['tile']:<5} {m['hex']:<5} {m['distance']:<6.1f} {m['wr']:<7.3f} {m['games']:<7} {m['wins']:<9.1f} {m['losses']:<9.1f}")

# Analyze patterns
print(f"\n{'='*80}")
print("STRATEGIC PATTERNS - MOVE 1")
print(f"{'='*80}")

# Group by tile number
tiles_stats = {}
for m in move_analysis:
    if m['tile'] not in tiles_stats:
        tiles_stats[m['tile']] = []
    tiles_stats[m['tile']].append(m)

print(f"\nPerformance by TILE number (1-9):")
print(f"{'Tile':<6} {'Avg WR':<10} {'Games':<10} {'Best Hex':<12} {'Worst Hex'}")
for tile in sorted(tiles_stats.keys()):
    tile_moves = tiles_stats[tile]
    avg_wr = sum(m['wr'] for m in tile_moves) / len(tile_moves)
    total_games = sum(m['games'] for m in tile_moves)
    best = max(tile_moves, key=lambda x: x['wr'])
    worst = min(tile_moves, key=lambda x: x['wr'])
    print(f"  {tile:<6} {avg_wr:<10.3f} {total_games:<10} h{best['hex']} ({best['wr']:.3f})  h{worst['hex']} ({worst['wr']:.3f})")

# Group by hex position
hexes_stats = {}
for m in move_analysis:
    if m['hex'] not in hexes_stats:
        hexes_stats[m['hex']] = []
    hexes_stats[m['hex']].append(m)

print(f"\nPerformance by HEX position (0-18):")
print(f"{'Hex':<6} {'Avg WR':<10} {'Games':<10} {'Distance':<10} {'Best Tile':<12}")
for hex_pos in sorted(hexes_stats.keys()):
    hex_moves = hexes_stats[hex_pos]
    avg_wr = sum(m['wr'] for m in hex_moves) / len(hex_moves)
    total_games = sum(m['games'] for m in hex_moves)
    dist = hex_moves[0]['distance']
    best = max(hex_moves, key=lambda x: x['wr'])
    print(f"  {hex_pos:<6} {avg_wr:<10.3f} {total_games:<10} {dist:<10.1f} t{best['tile']} ({best['wr']:.3f})")

# Distance analysis
print(f"\nPerformance by DISTANCE from starting position:")
# Group by distance ranges
close = [m for m in move_analysis if m['distance'] <= 1.5]
medium = [m for m in move_analysis if 1.5 < m['distance'] <= 3.0]
far = [m for m in move_analysis if m['distance'] > 3.0]

for label, moves in [("Adjacent (<= 1.5)", close), ("Medium (1.5-3.0)", medium), ("Far (> 3.0)", far)]:
    if moves:
        avg_wr = sum(m['wr'] for m in moves) / len(moves)
        total_games = sum(m['games'] for m in moves)
        print(f"  {label:<20}: Avg WR={avg_wr:.3f}, Total games={total_games:,}, Count={len(moves)}")

print(f"\n{'='*80}")
print("MOVE 2 ANALYSIS - Response to t1h7 (best opening)")
print(f"{'='*80}")

# Find the state after t1h7
# State should have pieces at hex 9 (1p2) and hex 7 (1p1)
move2_state = None
for state_key in data['database'].keys():
    if '1p1' in state_key and '1p2' in state_key:
        board = state_key.split('|')[1]
        pieces = board.split(',')
        # Check if hex 7 has 1p1 and hex 9 has 1p2
        if pieces[7] == '1p1' and pieces[9] == '1p2':
            move2_state = state_key
            break

if move2_state:
    move2_actions = data['database'][move2_state]
    print(f"\nAfter t1h7 opening, Player 2 responds:")
    print(f"Board: Player 1 (tile 1) at hex 7, Player 2 (starting piece) at hex 9")
    print(f"Available responses: {len(move2_actions)}")

    # Analyze responses
    responses = []
    for move, stats in move2_actions.items():
        tile, hex_pos = parse_move(move)
        wr = stats['wins'] / stats['totalWeight'] if stats['totalWeight'] > 0 else 0
        dist_from_p1 = distance(hex_pos, 7)
        dist_from_p2 = distance(hex_pos, 9)
        responses.append({
            'move': move,
            'tile': tile,
            'hex': hex_pos,
            'wr': wr,
            'games': stats['gamesPlayed'],
            'dist_p1': dist_from_p1,
            'dist_p2': dist_from_p2
        })

    responses.sort(key=lambda x: x['wr'], reverse=True)

    print(f"\n{'Move':<10} {'Tile':<5} {'Hex':<5} {'WR':<7} {'Games':<7} {'Dist P1':<9} {'Dist P2':<9}")
    print("-" * 70)
    for r in responses[:15]:
        print(f"{r['move']:<10} {r['tile']:<5} {r['hex']:<5} {r['wr']:<7.3f} {r['games']:<7} {r['dist_p1']:<9.1f} {r['dist_p2']:<9.1f}")

    # Strategic patterns for Move 2
    print(f"\nMove 2 Strategic Patterns:")
    attacking = [r for r in responses if r['dist_p1'] <= 1.5]  # Close to P1
    defensive = [r for r in responses if r['dist_p2'] <= 1.5]  # Close to P2
    neutral = [r for r in responses if r['dist_p1'] > 1.5 and r['dist_p2'] > 1.5]

    for label, moves in [("Attacking P1 piece", attacking), ("Defending P2 piece", defensive), ("Neutral positions", neutral)]:
        if moves:
            avg_wr = sum(m['wr'] for m in moves) / len(moves)
            total_games = sum(m['games'] for m in moves)
            print(f"  {label:<25}: Avg WR={avg_wr:.3f}, Total games={total_games:,}, Count={len(moves)}")

print("\n" + "=" * 80)
