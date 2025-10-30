const fs = require('fs');

const policy = JSON.parse(fs.readFileSync('hexuki_policy_phase2_gen15_1760884573280.json', 'utf8'));

console.log('='.repeat(60));
console.log('GEN15 POLICY ANALYSIS');
console.log('='.repeat(60));

// Check policy structure
console.log('\nPolicy Structure:');
console.log('  Keys:', Object.keys(policy));

const stats = policy.database || policy.stats || policy.positions || {};
const posCount = Object.keys(stats).length;
const totalGames = policy.totalGamesPlayed || 0;

console.log('\n📊 Position Statistics:');
console.log('  Total games played:', totalGames.toLocaleString());
console.log('  Total positions:', posCount.toLocaleString());

if (posCount === 0) {
    console.log('\n⚠️ WARNING: Policy has no position data!');
    process.exit(0);
}

// Analyze move statistics
let totalMoves = 0;
let totalVisits = 0;
let totalWins = 0;
const visitDistribution = {};
const moveDepthCounts = {};

for (const posHash in stats) {
    const posData = stats[posHash];

    for (const moveStr in posData) {
        const moveStats = posData[moveStr];
        const visits = moveStats.gamesPlayed || 0;
        const wins = moveStats.wins || 0;

        totalMoves++;
        totalVisits += visits;
        totalWins += wins;

        // Track visit distribution
        visitDistribution[visits] = (visitDistribution[visits] || 0) + 1;
    }
}

const avgVisitsPerPosition = totalVisits / posCount;
const avgMovesPerPosition = totalMoves / posCount;
const overallWinRate = totalVisits > 0 ? (totalWins / totalVisits) * 100 : 0;

console.log('  Total moves tracked:', totalMoves.toLocaleString());
console.log('  Avg moves per position:', avgMovesPerPosition.toFixed(2));
console.log('  Avg visits per position:', avgVisitsPerPosition.toFixed(2));
console.log('  Overall win rate:', overallWinRate.toFixed(1) + '%');

// Visit distribution
console.log('\n📈 Visit Distribution:');
const sortedVisits = Object.keys(visitDistribution).map(Number).sort((a, b) => a - b);
const displayLimit = Math.min(20, sortedVisits.length);

for (let i = 0; i < displayLimit; i++) {
    const visits = sortedVisits[i];
    const count = visitDistribution[visits];
    const bar = '█'.repeat(Math.min(50, Math.floor(count / 100)));
    console.log(`  ${String(visits).padStart(4)} visits: ${String(count).padStart(6)} moves ${bar}`);
}

if (sortedVisits.length > displayLimit) {
    console.log(`  ... (${sortedVisits.length - displayLimit} more visit levels)`);
}

// Top visited positions
console.log('\n⭐ Most Visited Positions:');
const positionsWithVisits = [];
for (const posHash in stats) {
    const posData = stats[posHash];
    let totalPosVisits = 0;
    for (const moveStr in posData) {
        totalPosVisits += posData[moveStr].gamesPlayed || 0;
    }
    positionsWithVisits.push({ hash: posHash, visits: totalPosVisits });
}

positionsWithVisits.sort((a, b) => b.visits - a.visits);

for (let i = 0; i < Math.min(10, positionsWithVisits.length); i++) {
    const pos = positionsWithVisits[i];
    const moveCount = Object.keys(stats[pos.hash]).length;
    console.log(`  #${i+1}: ${pos.visits.toLocaleString()} visits, ${moveCount} moves explored`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ READY FOR CONTINUATION TRAINING');
console.log('='.repeat(60));
console.log('\nRecommendation:');
console.log('  • Continue training for 15 more generations (Gen 16-30)');
console.log('  • Keep exploration at 0.0001 (pure exploitation)');
console.log('  • Expected result: ~32K positions with 3-4 avg visits');
console.log('  • This will create a strong opening book!');
console.log('='.repeat(60));
