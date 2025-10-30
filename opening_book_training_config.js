/**
 * OPTIMAL OPENING BOOK TRAINING CONFIGURATION
 *
 * Goal: Learn first 6 moves deeply with minimal position explosion
 * Strategy: Rapid exploration decay to focus on mastering proven openings
 */

const OPENING_BOOK_CONFIG = {
    // Phase 1: Discovery (Gen 1-3) - Find good opening moves
    phase1: {
        generations: 3,
        gamesPerGen: 1000,
        startExploration: 0.02,
        endExploration: 0.001,
        opponentMix: { self: 0.6, random: 0.4 },
        maxMoveToLearn: 6,
        description: "Discovery phase - explore opening variations"
    },

    // Phase 2: Deep Learning (Gen 4-15) - Master the best openings
    phase2: {
        generations: 12,
        gamesPerGen: 1000,
        exploration: 0.0001,  // Fixed very low exploration
        opponentMix: { self: 0.6, random: 0.4 },
        maxMoveToLearn: 6,
        description: "Exploitation phase - deeply learn best moves"
    },

    // Alternative: Aggressive single-phase approach
    aggressive: {
        generations: 15,
        gamesPerGen: 1000,
        exploration: 0.0001,  // Pure exploitation from start
        opponentMix: { self: 0.5, random: 0.5 },
        maxMoveToLearn: 6,
        description: "Aggressive exploitation - assumes some prior knowledge"
    }
};

/**
 * Generate training schedule for run_phase2.html
 *
 * @param {string} strategy - 'two-phase', 'aggressive', or 'custom'
 * @returns {Array} Configuration array for Phase2Runner
 */
function generateTrainingSchedule(strategy = 'two-phase') {
    const schedule = [];

    if (strategy === 'two-phase') {
        // Phase 1: Discovery with rapid decay
        const phase1Config = OPENING_BOOK_CONFIG.phase1;
        const decayRate = Math.pow(
            phase1Config.endExploration / phase1Config.startExploration,
            1 / (phase1Config.generations - 1)
        );

        console.log('═══════════════════════════════════════');
        console.log('📚 OPENING BOOK TRAINING: TWO-PHASE APPROACH');
        console.log('═══════════════════════════════════════');
        console.log(`Phase 1: Discovery (Gen 1-${phase1Config.generations})`);
        console.log(`  Exploration: ${phase1Config.startExploration} → ${phase1Config.endExploration}`);
        console.log(`  Expected positions: 2,000-4,000`);
        console.log('');
        console.log(`Phase 2: Deep Learning (Gen ${phase1Config.generations + 1}-15)`);
        console.log(`  Exploration: ${OPENING_BOOK_CONFIG.phase2.exploration} (fixed)`);
        console.log(`  Expected: Deep mastery of discovered openings`);
        console.log('═══════════════════════════════════════\n');

        for (let i = 0; i < phase1Config.generations; i++) {
            const exploration = phase1Config.startExploration * Math.pow(decayRate, i);
            schedule.push({
                games: phase1Config.gamesPerGen,
                exploration: exploration,
                mode: phase1Config.opponentMix,
                adaptive: false
            });
        }

        // Phase 2: Pure exploitation
        const phase2Config = OPENING_BOOK_CONFIG.phase2;
        for (let i = 0; i < phase2Config.generations; i++) {
            schedule.push({
                games: phase2Config.gamesPerGen,
                exploration: phase2Config.exploration,
                mode: phase2Config.opponentMix,
                adaptive: false
            });
        }

    } else if (strategy === 'aggressive') {
        // Aggressive: Pure exploitation from start
        const config = OPENING_BOOK_CONFIG.aggressive;

        console.log('═══════════════════════════════════════');
        console.log('📚 OPENING BOOK TRAINING: AGGRESSIVE APPROACH');
        console.log('═══════════════════════════════════════');
        console.log(`Generations: ${config.generations}`);
        console.log(`Exploration: ${config.exploration} (pure exploitation)`);
        console.log(`Strategy: Master random openings through repetition`);
        console.log('═══════════════════════════════════════\n');

        for (let i = 0; i < config.generations; i++) {
            schedule.push({
                games: config.gamesPerGen,
                exploration: config.exploration,
                mode: config.opponentMix,
                adaptive: false
            });
        }
    }

    return schedule;
}

/**
 * Expected outcomes for each strategy
 */
const EXPECTED_OUTCOMES = {
    'two-phase': {
        positions: '3,000-5,000',
        avgVisits: '3-5',
        confidence: '10-15%',
        winRateVsRandom: '55-60%',
        trainingTime: '75 seconds (15K games)',
        bestFor: 'Balanced learning - discover then master'
    },
    'aggressive': {
        positions: '2,000-3,000',
        avgVisits: '5-8',
        confidence: '15-20%',
        winRateVsRandom: '52-58%',
        trainingTime: '75 seconds (15K games)',
        bestFor: 'Deep mastery of random openings'
    }
};

/**
 * Print expected outcomes
 */
function printExpectedOutcomes(strategy) {
    const outcomes = EXPECTED_OUTCOMES[strategy];
    console.log('Expected Outcomes:');
    console.log(`  Positions: ${outcomes.positions}`);
    console.log(`  Avg Visits: ${outcomes.avgVisits}`);
    console.log(`  Confidence: ${outcomes.confidence}`);
    console.log(`  Win Rate vs Random: ${outcomes.winRateVsRandom}`);
    console.log(`  Training Time: ${outcomes.trainingTime}`);
    console.log(`  Best For: ${outcomes.bestFor}`);
    console.log('');
}

/**
 * USAGE INSTRUCTIONS
 *
 * Copy one of these schedules into run_phase2.html:
 */

// TWO-PHASE SCHEDULE (RECOMMENDED)
const TWO_PHASE_SCHEDULE = generateTrainingSchedule('two-phase');
printExpectedOutcomes('two-phase');

// AGGRESSIVE SCHEDULE (ALTERNATIVE)
const AGGRESSIVE_SCHEDULE = generateTrainingSchedule('aggressive');
printExpectedOutcomes('aggressive');

/**
 * To use in run_phase2.html:
 *
 * 1. Open run_phase2.html
 * 2. Find the training configuration section
 * 3. Replace the schedule with one of the above
 * 4. Set maxMoveToLearn = 6
 * 5. Enable Opening Book Mode
 *
 * Example:
 *
 * const schedule = [
 *   { games: 1000, exploration: 0.02, mode: {self: 0.6, random: 0.4} },
 *   { games: 1000, exploration: 0.006, mode: {self: 0.6, random: 0.4} },
 *   { games: 1000, exploration: 0.001, mode: {self: 0.6, random: 0.4} },
 *   { games: 1000, exploration: 0.0001, mode: {self: 0.6, random: 0.4} },
 *   ... (repeat 0.0001 for Gen 4-15)
 * ];
 */

console.log('═══════════════════════════════════════');
console.log('COPY THIS SCHEDULE TO run_phase2.html:');
console.log('═══════════════════════════════════════\n');
console.log('// TWO-PHASE APPROACH (RECOMMENDED)');
console.log('const schedule = [');
TWO_PHASE_SCHEDULE.forEach((gen, i) => {
    const comma = i < TWO_PHASE_SCHEDULE.length - 1 ? ',' : '';
    console.log(`  { games: ${gen.games}, exploration: ${gen.exploration}, mode: ${JSON.stringify(gen.mode)} }${comma}`);
});
console.log('];\n');

// Export for use in browser
if (typeof window !== 'undefined') {
    window.OpeningBookConfig = {
        generateTrainingSchedule,
        TWO_PHASE_SCHEDULE,
        AGGRESSIVE_SCHEDULE,
        EXPECTED_OUTCOMES
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateTrainingSchedule,
        TWO_PHASE_SCHEDULE,
        AGGRESSIVE_SCHEDULE,
        EXPECTED_OUTCOMES
    };
}
