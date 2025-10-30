import json

# Load both policies
minimax_policy_path = r'C:\Users\Michael\Desktop\hextest\hexuki_policy_random_minimax_5500games_1760930350516.json'
phase2_policy_path = r'C:\Users\Michael\Desktop\hextest\hexuki_policy_phase2_gen10_1760930616249.json'

print("Loading policies...")
with open(minimax_policy_path, 'r') as f:
    minimax_policy = json.load(f)

with open(phase2_policy_path, 'r') as f:
    phase2_policy = json.load(f)

print()
print("=" * 80)
print("PHASE 2 TRAINING IMPROVEMENT ANALYSIS")
print("=" * 80)
print()

print("BEFORE (Minimax Bootstrap):")
print(f"  Games: {minimax_policy['totalGamesPlayed']:,}")
print(f"  States: {len(minimax_policy['database']):,}")
print()

print("AFTER (Phase 2 Gen 10):")
print(f"  Games: {phase2_policy['totalGamesPlayed']:,}")
print(f"  States: {len(phase2_policy['database']):,}")
print(f"  New games added: {phase2_policy['totalGamesPlayed'] - minimax_policy['totalGamesPlayed']:,}")
print(f"  New states added: {len(phase2_policy['database']) - len(minimax_policy['database']):,}")
print()

# Analyze opening move preferences (first move from starting position)
print("=" * 80)
print("OPENING MOVE ANALYSIS (Move 1)")
print("=" * 80)
print()

def get_opening_moves(policy):
    """Extract first move statistics"""
    opening_moves = {}

    for state_key, moves in policy['database'].items():
        parts = state_key.split('|')
        if len(parts) >= 2:
            board_state = parts[1]
            # First move = only 1 occupied position
            occupied = board_state.count('p1') + board_state.count('p2')

            if occupied == 1:
                for move_key, move_data in moves.items():
                    if move_key not in opening_moves:
                        opening_moves[move_key] = {
                            'games': 0,
                            'wins': 0,
                            'losses': 0,
                            'ties': 0,
                            'total_weight': 0
                        }

                    opening_moves[move_key]['games'] += move_data['gamesPlayed']
                    opening_moves[move_key]['wins'] += move_data['wins']
                    opening_moves[move_key]['losses'] += move_data['losses']
                    opening_moves[move_key]['ties'] += move_data['ties']
                    opening_moves[move_key]['total_weight'] += move_data['totalWeight']

    # Calculate win rates
    for move_key in opening_moves:
        stats = opening_moves[move_key]
        if stats['total_weight'] > 0:
            stats['win_rate'] = stats['wins'] / stats['total_weight']
        else:
            stats['win_rate'] = 0

    return opening_moves

minimax_openings = get_opening_moves(minimax_policy)
phase2_openings = get_opening_moves(phase2_policy)

print("BEFORE (Random + Minimax):")
print(f"  Unique openings: {len(minimax_openings)}")
print(f"  Total games: {sum(m['games'] for m in minimax_openings.values()):,}")
print()

# Top 5 before
sorted_minimax = sorted(minimax_openings.items(), key=lambda x: x[1]['win_rate'], reverse=True)
print("  Top 5 by win rate:")
for i, (move, stats) in enumerate(sorted_minimax[:5]):
    print(f"    {i+1}. {move}: WR={stats['win_rate']:.1%} ({stats['games']} games)")
print()

print("AFTER (Phase 2 Self-Play):")
print(f"  Unique openings: {len(phase2_openings)}")
print(f"  Total games: {sum(m['games'] for m in phase2_openings.values()):,}")
print()

# Top 5 after
sorted_phase2 = sorted(phase2_openings.items(), key=lambda x: x[1]['win_rate'], reverse=True)
print("  Top 5 by win rate:")
for i, (move, stats) in enumerate(sorted_phase2[:5]):
    # Find change from before
    before_stats = minimax_openings.get(move, {'win_rate': 0, 'games': 0})
    wr_change = stats['win_rate'] - before_stats['win_rate']
    games_change = stats['games'] - before_stats['games']

    print(f"    {i+1}. {move}: WR={stats['win_rate']:.1%} ({stats['games']} games, +{games_change} games, WR change: {wr_change:+.1%})")
print()

# Check if policy is exploiting good moves
print("=" * 80)
print("EXPLOITATION ANALYSIS")
print("=" * 80)
print()

# Calculate concentration (how much the top move dominates)
if sorted_phase2:
    top_move_games = sorted_phase2[0][1]['games']
    total_opening_games = sum(m['games'] for m in phase2_openings.values())
    concentration = top_move_games / total_opening_games * 100

    print(f"Top move concentration: {concentration:.1f}%")

    if concentration < 5:
        print("  -> Excellent: Still exploring broadly")
    elif concentration < 10:
        print("  -> Good: Balanced exploration/exploitation")
    elif concentration < 20:
        print("  -> Moderate: Starting to exploit good moves")
    else:
        print("  -> High: Heavily exploiting one move")
    print()

# Win rate spread
win_rates = [m['win_rate'] for m in phase2_openings.values() if m['games'] >= 10]
if win_rates:
    avg_wr = sum(win_rates) / len(win_rates)
    max_wr = max(win_rates)
    min_wr = min(win_rates)
    spread = max_wr - min_wr

    print(f"Win rate spread (moves with 10+ games):")
    print(f"  Average: {avg_wr:.1%}")
    print(f"  Best: {max_wr:.1%}")
    print(f"  Worst: {min_wr:.1%}")
    print(f"  Spread: {spread:.1%}")
    print()

# Check for strategic learning
print("=" * 80)
print("STRATEGIC LEARNING CHECK")
print("=" * 80)
print()

# Compare top moves before and after
print("Did the best moves from Phase 2 get more play?")
top_5_phase2_moves = [move for move, _ in sorted_phase2[:5]]

for move in top_5_phase2_moves:
    before = minimax_openings.get(move, {'games': 0, 'win_rate': 0})
    after = phase2_openings[move]

    games_increase = after['games'] - before['games']
    games_increase_pct = (games_increase / before['games'] * 100) if before['games'] > 0 else float('inf')

    print(f"{move}:")
    print(f"  Before: {before['games']} games, WR={before['win_rate']:.1%}")
    print(f"  After:  {after['games']} games, WR={after['win_rate']:.1%}")
    print(f"  Growth: +{games_increase} games ({games_increase_pct:.0f}% increase)")
    print()

# Overall assessment
print("=" * 80)
print("OVERALL ASSESSMENT")
print("=" * 80)
print()

games_added = phase2_policy['totalGamesPlayed'] - minimax_policy['totalGamesPlayed']
states_added = len(phase2_policy['database']) - len(minimax_policy['database'])

print(f"Training progress:")
print(f"  Added {games_added:,} self-play games to {minimax_policy['totalGamesPlayed']:,} minimax games")
print(f"  Added {states_added:,} new states")
print(f"  States per game: {states_added / games_added:.1f}")
print()

if concentration < 10 and spread > 0.1:
    print("CHECK MARK Policy is learning strategy while maintaining exploration")
    print("CHECK MARK Good balance for continued training")
elif concentration < 20:
    print("CHECK MARK Policy is identifying strong moves")
    print("  -> Consider a few more generations for convergence")
else:
    print("WARNING: Policy may be converging to local optimum")
    print("  -> Consider increasing exploration (epsilon)")

print()
print("=" * 80)
