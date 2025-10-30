import json
import sys

p300_file = 'hexuki_policy_v3_300games_1760934565545.json'
p1300_file = 'hexuki_policy_v3_1300games_1760935317588.json'

with open(p300_file) as f:
    p300 = json.load(f)

with open(p1300_file) as f:
    p1300 = json.load(f)

print("=" * 80)
print("POLICY COMPARISON: 300 vs 1300 Games")
print("=" * 80)
print()

# Find P2's first response state (after P1 opens with neutral tile on hex 10)
opening_state = '1|null,null,null,null,null,null,null,null,null,1p0,null,null,null,null,null,null,null,null,null|p1a:123456789|p2a:123456789|p1u:|p2u:'

if opening_state not in p300['database'] or opening_state not in p1300['database']:
    print("ERROR: Opening state not found in both policies")
    sys.exit(1)

moves300 = p300['database'][opening_state]
moves1300 = p1300['database'][opening_state]

print("P2 Opening Response Analysis (after P1 places neutral tile):")
print()
print(f"{'Move':8s}  {'300g WR':>8s}  {'1300g WR':>9s}  {'Change':>8s}  {'Samples':>12s}")
print("-" * 80)

changes = []
for move in sorted(moves300.keys()):
    m300 = moves300[move]
    m1300 = moves1300[move]

    wr300 = m300['wins'] / m300['totalWeight'] if m300['totalWeight'] > 0 else 0
    wr1300 = m1300['wins'] / m1300['totalWeight'] if m1300['totalWeight'] > 0 else 0
    change = wr1300 - wr300

    changes.append({
        'move': move,
        'wr300': wr300,
        'wr1300': wr1300,
        'change': change,
        'games300': m300['gamesPlayed'],
        'games1300': m1300['gamesPlayed']
    })

# Sort by absolute change (biggest swings)
changes.sort(key=lambda x: abs(x['change']), reverse=True)

print("\nBiggest Win Rate Changes (Top 20):")
for i, c in enumerate(changes[:20], 1):
    print(f"{c['move']:8s}  {c['wr300']:7.1%}  {c['wr1300']:9.1%}  {c['change']:+7.1%}  {c['games300']:3d} -> {c['games1300']:3d}")

print()
print("-" * 80)
print("\nMoves that got WORSE with more data:")
worse = [c for c in changes if c['change'] < -0.1]
print(f"Count: {len(worse)}")
for c in sorted(worse, key=lambda x: x['change'])[:10]:
    print(f"  {c['move']:8s}: {c['wr300']:.1%} -> {c['wr1300']:.1%} ({c['change']:+.1%}) [{c['games300']}->{c['games1300']} games]")

print()
print("Moves that got BETTER with more data:")
better = [c for c in changes if c['change'] > 0.1]
print(f"Count: {len(better)}")
for c in sorted(better, key=lambda x: x['change'], reverse=True)[:10]:
    print(f"  {c['move']:8s}: {c['wr300']:.1%} -> {c['wr1300']:.1%} ({c['change']:+.1%}) [{c['games300']}->{c['games1300']} games]")

print()
print("=" * 80)
print("\nHYPOTHESIS: 300-game policy benefited from VARIANCE (lucky streaks)")
print("1300-game policy shows REGRESSION TO MEAN (true ~50% self-play WR)")
print()
print("This explains why 300-game plays better - it's overconfident from lucky data!")
print("=" * 80)
