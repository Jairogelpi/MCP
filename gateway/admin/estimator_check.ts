import { CostEstimator } from '../src/core/economic/cost_estimator';
import { db } from '../src/adapters/database';

// Ensure DB is initialized (handled by import)

const estimator = CostEstimator.getInstance();

function check(name: string, context: any, args: any, expectedCost: number | 'fail') {
    console.log(`[TEST] ${name}`);
    const result = estimator.estimate(context, args);

    if (expectedCost === 'fail') {
        if (result.estimated_cost === -1) {
            console.log('✅ Correctly failed (Pricing Not Found)');
            return;
        } else {
            console.error(`❌ Expected fail (-1) but got ${result.estimated_cost}`);
            process.exit(1);
        }
    }

    if (Math.abs(result.estimated_cost - expectedCost) > 0.0001) {
        console.error(`❌ Cost Mismatch: Got ${result.estimated_cost}, Expected ${expectedCost}`);
        process.exit(1);
    }

    // Check tokens (heuristic: length/4)
    const jsonLen = JSON.stringify(args).length;
    const tokens = Math.ceil(jsonLen / 4);
    if (result.estimated_tokens_in !== tokens) {
        console.error(`❌ Token Mismatch: Got ${result.estimated_tokens_in}, Expected ${tokens}`);
    }

    console.log(`✅ Success: ${result.estimated_cost.toFixed(4)} ${result.currency} (In: ${result.estimated_tokens_in})`);
}

async function run() {
    console.log('--- Cost Estimator Verification ---');

    // 1. OpenAI GPT-4 (Cost = Tokens * Price)
    // Input: {"q":"hello"} -> len 13 -> 4 tokens
    // Price: In 0.03, Out 0.06, Fee 0.0
    // Cost: (4/1000)*0.03 + (500/1000)*0.06 = 0.00012 + 0.03 = 0.03012
    check(
        'OpenAI GPT-4 Standard',
        { provider: 'openai', model: 'gpt-4', endpoint: 'chat' },
        { q: "hello" },
        0.03012
    );

    // 2. Internal Search (Flat Fee only)
    // Price: In 0, Out 0, Fee 0.01
    check(
        'Internal Search',
        { provider: 'internal', model: 'any', endpoint: 'search_op' },
        { query: "test" },
        0.01
    );

    // 3. Unknown Tool (Fail-Safe)
    check(
        'Unknown Tool',
        { provider: 'alien_tech', model: 'ufo' },
        {},
        'fail'
    );

    console.log('--- All Estimator Checks Passed ---');
}

run();
