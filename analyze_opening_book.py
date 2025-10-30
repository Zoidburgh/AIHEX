import json

# Load opening book
with open(r'C:\Users\Michael\Desktop\hextest\hexuki_opening_book_2700games_1760931833677.json', 'r') as f:
    data = json.load(f)

print("=" * 80)
print("OPENING BOOK ANALYSIS")
print("=" * 80)
print(f"Total Games: {data['totalGames']:,}")
print(f"Games per Opening: {data['gamesPerOpening']}")
print(f"Openings Tested: {len(data['openings'])}")
print(f"Minimax Threshold: {data['minimaxThreshold']} empty positions")
print()

# Calculate win rates
openings = []
for move_key, stats in data['openings'].items():
    games = stats['games']
    wins = stats['wins']
    losses = stats['losses']
    ties = stats['ties']

    win_rate = wins / games if games > 0 else 0

    openings.append({
        'move': move_key,
        'tile': stats['tile'],
        'hexId': stats['hexId'],
        'games': games,
        'wins': wins,
        'losses': losses,
        'ties': ties,
        'win_rate': win_rate
    })

# Sort by win rate
openings.sort(key=lambda x: x['win_rate'], reverse=True)

print("=" * 80)
print("TOP 15 OPENING MOVES")
print("=" * 80)
print()

for i, opening in enumerate(openings[:15]):
    wr = opening['win_rate'] * 100
    move = opening['move']
    record = f"{opening['wins']}W-{opening['losses']}L-{opening['ties']}T"

    print(f"{i+1:2}. {move:6} (hex {opening['hexId']:2}): {wr:5.1f}% ({record})")

print()
print("=" * 80)
print("WORST 15 OPENING MOVES")
print("=" * 80)
print()

for i, opening in enumerate(openings[-15:]):
    wr = opening['win_rate'] * 100
    move = opening['move']
    record = f"{opening['wins']}W-{opening['losses']}L-{opening['ties']}T"

    print(f"{i+1:2}. {move:6} (hex {opening['hexId']:2}): {wr:5.1f}% ({record})")

print()
print("=" * 80)
print("STATISTICAL ANALYSIS")
print("=" * 80)
print()

win_rates = [o['win_rate'] for o in openings]
avg_wr = sum(win_rates) / len(win_rates)
max_wr = max(win_rates)
min_wr = min(win_rates)
spread = max_wr - min_wr

print(f"Average Win Rate: {avg_wr*100:.1f}%")
print(f"Best Win Rate: {max_wr*100:.1f}%")
print(f"Worst Win Rate: {min_wr*100:.1f}%")
print(f"Spread: {spread*100:.1f} percentage points")
print()

# Analyze by hex position
print("=" * 80)
print("WIN RATE BY HEX POSITION")
print("=" * 80)
print()

hex_stats = {}
for opening in openings:
    hex_id = opening['hexId']
    if hex_id not in hex_stats:
        hex_stats[hex_id] = {
            'total_games': 0,
            'total_wins': 0,
            'count': 0,
            'win_rates': []
        }

    hex_stats[hex_id]['total_games'] += opening['games']
    hex_stats[hex_id]['total_wins'] += opening['wins']
    hex_stats[hex_id]['count'] += 1
    hex_stats[hex_id]['win_rates'].append(opening['win_rate'])

# Sort by average win rate
hex_sorted = sorted(hex_stats.items(),
                    key=lambda x: sum(x[1]['win_rates'])/len(x[1]['win_rates']),
                    reverse=True)

print("Top 10 hex positions (average across all tiles):")
for i, (hex_id, stats) in enumerate(hex_sorted[:10]):
    avg_wr = sum(stats['win_rates']) / len(stats['win_rates']) * 100
    total_wr = stats['total_wins'] / stats['total_games'] * 100
    tiles_tested = stats['count']

    print(f"  {i+1:2}. Hex {hex_id:2}: Avg WR={avg_wr:5.1f}% ({tiles_tested} tiles tested)")

print()

# Analyze by tile value
print("=" * 80)
print("WIN RATE BY TILE VALUE")
print("=" * 80)
print()

tile_stats = {}
for opening in openings:
    tile = opening['tile']
    if tile not in tile_stats:
        tile_stats[tile] = {
            'total_games': 0,
            'total_wins': 0,
            'count': 0,
            'win_rates': []
        }

    tile_stats[tile]['total_games'] += opening['games']
    tile_stats[tile]['total_wins'] += opening['wins']
    tile_stats[tile]['count'] += 1
    tile_stats[tile]['win_rates'].append(opening['win_rate'])

# Sort by average win rate
tile_sorted = sorted(tile_stats.items(),
                     key=lambda x: sum(x[1]['win_rates'])/len(x[1]['win_rates']),
                     reverse=True)

print("Tile values ranked by average win rate:")
for i, (tile, stats) in enumerate(tile_sorted):
    avg_wr = sum(stats['win_rates']) / len(stats['win_rates']) * 100
    total_wr = stats['total_wins'] / stats['total_games'] * 100
    hexes_tested = stats['count']

    print(f"  {i+1}. Tile {tile}: Avg WR={avg_wr:5.1f}% ({hexes_tested} positions tested)")

print()
print("=" * 80)
print("RECOMMENDATIONS")
print("=" * 80)
print()

# Top tier openings (>= top 10%)
top_threshold = openings[5]['win_rate']  # Top ~10%
top_tier = [o for o in openings if o['win_rate'] >= top_threshold]

print(f"TOP TIER OPENINGS (>= {top_threshold*100:.1f}% WR):")
for opening in top_tier:
    wr = opening['win_rate'] * 100
    print(f"  {opening['move']}: {wr:.1f}%")

print()
print("STRATEGIC INSIGHTS:")

# Check if position matters more than tile
hex_wr_spread = max([sum(s['win_rates'])/len(s['win_rates']) for s in hex_stats.values()]) - \
                min([sum(s['win_rates'])/len(s['win_rates']) for s in hex_stats.values()])
tile_wr_spread = max([sum(s['win_rates'])/len(s['win_rates']) for s in tile_stats.values()]) - \
                 min([sum(s['win_rates'])/len(s['win_rates']) for s in tile_stats.values()])

print(f"  Position (hex) impact: {hex_wr_spread*100:.1f} percentage point spread")
print(f"  Tile value impact: {tile_wr_spread*100:.1f} percentage point spread")

if hex_wr_spread > tile_wr_spread:
    print("  -> POSITION matters more than TILE VALUE")
else:
    print("  -> TILE VALUE matters more than POSITION")

print()
print("RECOMMENDED OPENING STRATEGY:")
print(f"  1. Always play one of: {', '.join([o['move'] for o in top_tier[:3]])}")
print(f"  2. Expected win rate vs random: ~{top_tier[0]['win_rate']*100:.0f}%")
print(f"  3. Avoid bottom tier moves (< {openings[-5]['win_rate']*100:.1f}% WR)")
print()
print("=" * 80)
