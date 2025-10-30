import json
import sys

if len(sys.argv) < 2:
    print("Usage: python analyze_policy.py <policy_file.json>")
    sys.exit(1)

# Load the policy
with open(sys.argv[1]) as f:
    data = json.load(f)

print("=" * 60)
print("POLICY ANALYSIS")
print("=" * 60)

# Basic stats
print(f"\nBasic Statistics:")
print(f"  Total states: {len(data['database']):,}")
print(f"  Total games: {data['totalGamesPlayed']:,}")

# Opening position analysis
first_state_key = list(data['database'].keys())[0]
opening_actions = data['database'][first_state_key]

print(f"\nOpening Position ({first_state_key[:50]}...):")
print(f"  Available moves: {len(opening_actions)}")

# Sort by win rate
sorted_moves = []
for move, stats in opening_actions.items():
    if stats['totalWeight'] > 0:
        win_rate = stats['wins'] / stats['totalWeight']
        sorted_moves.append((move, win_rate, stats))

sorted_moves.sort(key=lambda x: x[1], reverse=True)

print(f"\n  Top 10 opening moves by win rate:")
for i, (move, wr, stats) in enumerate(sorted_moves[:10], 1):
    print(f"    {i}. {move:8s}: WR={wr:.3f}, Games={stats['gamesPlayed']:4d}, W={stats['wins']:.1f}, L={stats['losses']:.1f}")

print(f"\n  Bottom 10 opening moves by win rate:")
for i, (move, wr, stats) in enumerate(sorted_moves[-10:], 1):
    print(f"    {i}. {move:8s}: WR={wr:.3f}, Games={stats['gamesPlayed']:4d}, W={stats['wins']:.1f}, L={stats['losses']:.1f}")

# Overall exploration analysis
total_state_action_pairs = 0
games_per_action = []
win_rates = []

for state_actions in data['database'].values():
    for action_stats in state_actions.values():
        total_state_action_pairs += 1
        games_per_action.append(action_stats['gamesPlayed'])
        if action_stats['totalWeight'] > 0:
            win_rates.append(action_stats['wins'] / action_stats['totalWeight'])

print(f"\nExploration Analysis:")
print(f"  Total state-action pairs: {total_state_action_pairs:,}")
print(f"  Avg games per action: {sum(games_per_action)/len(games_per_action):.1f}")
print(f"  Median games per action: {sorted(games_per_action)[len(games_per_action)//2]}")
print(f"  Max games per action: {max(games_per_action)}")
print(f"  Min games per action: {min(games_per_action)}")

# States with most/least exploration
states_by_actions = [(k, len(v)) for k, v in data['database'].items()]
states_by_actions.sort(key=lambda x: x[1], reverse=True)

print(f"\nStates with most actions explored:")
for state_key, action_count in states_by_actions[:5]:
    print(f"  {state_key[:80]}... : {action_count} actions")

print(f"\nStates with least actions explored:")
for state_key, action_count in states_by_actions[-5:]:
    print(f"  {state_key[:80]}... : {action_count} actions")

print(f"\nWin Rate Distribution:")
print(f"  Mean win rate: {sum(win_rates)/len(win_rates):.3f}")
print(f"  Median win rate: {sorted(win_rates)[len(win_rates)//2]:.3f}")

# Check for imbalance
high_wr = [wr for wr in win_rates if wr > 0.6]
low_wr = [wr for wr in win_rates if wr < 0.4]
print(f"  Actions with WR > 0.6: {len(high_wr):,} ({100*len(high_wr)/len(win_rates):.1f}%)")
print(f"  Actions with WR < 0.4: {len(low_wr):,} ({100*len(low_wr)/len(win_rates):.1f}%)")

print("\n" + "=" * 60)
