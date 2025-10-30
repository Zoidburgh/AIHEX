const fs = require('fs');

const policy = JSON.parse(fs.readFileSync('hexuki_policy_phase2_gen15_1760884573280.json', 'utf8'));
const db = policy.database || {};

console.log('='.repeat(70));
console.log('OPENING BOOK EXTRACTION - GEN30 POLICY (30,000 games)');
console.log('='.repeat(70));

// Find the starting position (most visited position)
let startingPosHash = null;
let maxVisits = 0;

for (const posHash in db) {
    const posData = db[posHash];
    let totalVisits = 0;
    for (const moveStr in posData) {
        totalVisits += posData[moveStr].gamesPlayed || 0;
    }
    if (totalVisits > maxVisits) {
        maxVisits = totalVisits;
        startingPosHash = posHash;
    }
}

console.log('\n📍 Starting Position Found:');
console.log('  Hash:', startingPosHash.substring(0, 40) + '...');
console.log('  Total visits:', maxVisits.toLocaleString());

// Extract best opening moves (Player 1's first move)
const startingMoves = db[startingPosHash];
const movesArray = [];

for (const moveStr in startingMoves) {
    const stats = startingMoves[moveStr];
    movesArray.push({
        move: moveStr,
        visits: stats.gamesPlayed || 0,
        wins: stats.wins || 0,
        winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0
    });
}

// Sort by visits (most explored)
movesArray.sort((a, b) => b.visits - a.visits);

console.log('\n🎯 BEST OPENING MOVES (Player 1\'s First Move):');
console.log('='.repeat(70));
console.log('Rank | Move      | Visits  | Win Rate | Confidence | Recommendation');
console.log('-----|-----------|---------|----------|------------|----------------');

const displayCount = Math.min(25, movesArray.length);
for (let i = 0; i < displayCount; i++) {
    const move = movesArray[i];
    const confidence = move.visits >= 1000 ? '⭐⭐⭐' :
                      move.visits >= 500 ? '⭐⭐' :
                      move.visits >= 100 ? '⭐' : '·';

    const rec = i === 0 ? 'MOST EXPLORED' :
                i < 3 ? 'Strong option' :
                i < 5 ? 'Good option' :
                i < 10 ? 'Viable' : '';

    console.log(
        `${String(i+1).padStart(4)} | ${move.move.padEnd(9)} | ` +
        `${String(move.visits).padStart(7)} | ${move.winRate.toFixed(1).padStart(7)}% | ` +
        `${confidence.padEnd(10)} | ${rec}`
    );
}

console.log('\n' + '='.repeat(70));

// Analyze by hex position
const hexStats = {};
for (const moveStr in startingMoves) {
    const stats = startingMoves[moveStr];
    const parts = moveStr.match(/t(\d+)h(\d+)/);
    if (parts) {
        const hex = parseInt(parts[2]);
        if (!hexStats[hex]) {
            hexStats[hex] = { totalVisits: 0, totalWins: 0, moves: [] };
        }
        hexStats[hex].totalVisits += stats.gamesPlayed || 0;
        hexStats[hex].totalWins += stats.wins || 0;
        hexStats[hex].moves.push({
            tile: parseInt(parts[1]),
            visits: stats.gamesPlayed || 0,
            wins: stats.wins || 0,
            winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0
        });
    }
}

console.log('\n📊 BEST OPENING HEXES (by total exploration):');
console.log('='.repeat(70));

const hexArray = [];
for (const hex in hexStats) {
    const hs = hexStats[hex];
    hexArray.push({
        hex: parseInt(hex),
        visits: hs.totalVisits,
        wins: hs.totalWins,
        winRate: hs.totalVisits > 0 ? (hs.totalWins / hs.totalVisits) * 100 : 0,
        moveCount: hs.moves.length
    });
}

hexArray.sort((a, b) => b.visits - a.visits);

console.log('Hex  | Total Visits | Win Rate | Moves Tried | Best Tile');
console.log('-----|--------------|----------|-------------|----------');

for (let i = 0; i < Math.min(15, hexArray.length); i++) {
    const hex = hexArray[i];
    const bestMove = hexStats[hex.hex].moves.sort((a, b) => b.visits - a.visits)[0];
    console.log(
        `${String(hex.hex).padStart(4)} | ${String(hex.visits).padStart(12)} | ` +
        `${hex.winRate.toFixed(1).padStart(7)}% | ${String(hex.moveCount).padStart(11)} | ` +
        `Tile ${bestMove.tile} (${bestMove.visits} visits, ${bestMove.winRate.toFixed(1)}% WR)`
    );
}

console.log('\n' + '='.repeat(70));

// Find positions with 0% or 100% win rates (interesting patterns)
console.log('\n💀 WORST OPENING MOVES (0% Win Rate):');
console.log('='.repeat(70));

const worstMoves = movesArray.filter(m => m.winRate === 0 && m.visits >= 50);
worstMoves.sort((a, b) => b.visits - a.visits);

if (worstMoves.length > 0) {
    console.log('Move      | Visits | Win Rate | WARNING');
    console.log('----------|--------|----------|----------');
    for (let i = 0; i < Math.min(10, worstMoves.length); i++) {
        const move = worstMoves[i];
        console.log(
            `${move.move.padEnd(9)} | ${String(move.visits).padStart(6)} | ` +
            `${move.winRate.toFixed(1).padStart(7)}% | 💀 AVOID!`
        );
    }
} else {
    console.log('  None found! (all moves have some wins)');
}

console.log('\n' + '='.repeat(70));
console.log('⭐ KILLER MOVES (>70% Win Rate):');
console.log('='.repeat(70));

const killerMoves = movesArray.filter(m => m.winRate >= 70 && m.visits >= 50);
killerMoves.sort((a, b) => b.winRate - a.winRate);

if (killerMoves.length > 0) {
    console.log('Move      | Visits | Win Rate | Status');
    console.log('----------|--------|----------|----------');
    for (let i = 0; i < Math.min(10, killerMoves.length); i++) {
        const move = killerMoves[i];
        const status = move.winRate >= 90 ? '🔥 KILLER!' :
                      move.winRate >= 80 ? '⭐ STRONG' :
                      '✅ Good';
        console.log(
            `${move.move.padEnd(9)} | ${String(move.visits).padStart(6)} | ` +
            `${move.winRate.toFixed(1).padStart(7)}% | ${status}`
        );
    }
} else {
    console.log('  None found (this is normal for balanced opening positions)');
}

console.log('\n' + '='.repeat(70));
console.log('📝 SUMMARY');
console.log('='.repeat(70));

const top3 = movesArray.slice(0, 3);
console.log('\nTop 3 Opening Moves:');
for (let i = 0; i < top3.length; i++) {
    console.log(`  ${i+1}. ${top3[i].move}: ${top3[i].visits.toLocaleString()} visits, ${top3[i].winRate.toFixed(1)}% WR`);
}

console.log('\nOpening Strategy:');
console.log('  • Most explored hex:', hexArray[0].hex, `(${hexArray[0].visits.toLocaleString()} visits)`);
console.log('  • Second best hex:', hexArray[1].hex, `(${hexArray[1].visits.toLocaleString()} visits)`);
console.log('  • Total unique opening moves explored:', movesArray.length);

const highConfidence = movesArray.filter(m => m.visits >= 500);
console.log('  • High confidence moves (500+ visits):', highConfidence.length);

console.log('\n' + '='.repeat(70));
console.log('✅ Opening book ready for use!');
console.log('='.repeat(70));
