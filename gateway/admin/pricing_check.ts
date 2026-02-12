import { PricingManager } from '../src/core/economic/pricing_manager';
import { db } from '../src/adapters/database';

// Helper to init DB (since we are outside of server.ts execution)
// db adapter handles init on import, so we just need to ensure import runs.

const pricing = PricingManager.getInstance();

function check(name: string, context: any, expectedInputPrice?: number, expectedFee?: number) {
    console.log(`[TEST] ${name}`);
    const rate = pricing.getPrice(context);

    if (!rate) {
        if (expectedInputPrice === undefined) {
            console.log('✅ Correctly not found');
            return;
        }
        console.error('❌ Not found but expected result');
        process.exit(1);
    }

    if (expectedInputPrice !== undefined && rate.input_price !== expectedInputPrice) {
        console.error(`❌ Input Price Mismatch: Got ${rate.input_price}, Expected ${expectedInputPrice}`);
        process.exit(1);
    }

    if (expectedFee !== undefined && rate.flat_fee !== expectedFee) {
        console.error(`❌ Flat Fee Mismatch: Got ${rate.flat_fee}, Expected ${expectedFee}`);
        process.exit(1);
    }

    console.log(`✅ Found: ${rate.provider} / ${rate.model} / ${rate.endpoint} (In: ${rate.input_price}, Fee: ${rate.flat_fee})`);
}

async function run() {
    console.log('--- Pricing Verification ---');

    // 1. OpenAI GPT-4 (Exact Model, Wildcard Endpoint)
    check(
        'OpenAI GPT-4',
        { provider: 'openai', model: 'gpt-4', endpoint: 'any_tool' },
        0.03, // Input Price
        0.0   // Fee
    );

    // 2. Internal Search (Wildcard Model, Exact Endpoint)
    check(
        'Internal Search',
        { provider: 'internal', model: 'any_model', endpoint: 'search_op' },
        0.0,
        0.01 // Flat Fee
    );

    // 3. Internal Standard (Wildcard everything)
    check(
        'Internal Standard',
        { provider: 'internal', model: 'unknown_model', endpoint: 'some_random_tool' },
        0.0,
        0.0001 // Minimal Fee
    );

    // 4. Missing Provider
    check(
        'Missing Provider',
        { provider: 'unicorn_ai', model: 'gpt-99' },
        undefined
    );

    console.log('--- All Pricing Validation Checks Passed ---');
}

run();
