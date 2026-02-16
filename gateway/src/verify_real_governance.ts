import { db } from './adapters/database';
import { EconomicDecider } from './core/economic/decider';
import { PricingManager } from './core/economic/pricing_manager';

async function verifyRealGovernance() {
    console.log('🚀 Starting Real Governance Verification...\n');

    const decider = new EconomicDecider();
    const pricing = PricingManager.getInstance();

    // 1. Verify Dynamic Context Resolution
    console.log('--- 1. Testing Dynamic Tool Mapping ---');

    // Inject a new fake tool into DB
    const fakeTool = 'custom_ai_task';
    await db.raw.run(`
        INSERT INTO tool_settings (tool_name, provider, model, tier, estimated_tokens_out, created_at)
        VALUES (?, 'anthropic', 'claude-3', 'standard', 1500, ?)
    `, [fakeTool, Date.now()]);

    const resolved = await pricing.resolveContext(fakeTool);
    console.log(`Tool: ${fakeTool}`);
    console.log(`Resolved Provider: ${resolved.provider} (Expected: anthropic)`);
    console.log(`Resolved Tokens Out: ${resolved.estimated_tokens_out} (Expected: 1500)`);

    if (resolved.provider === 'anthropic' && resolved.estimated_tokens_out === 1500) {
        console.log('✅ Dynamic Tool Mapping Passed');
    } else {
        console.error('❌ Dynamic Tool Mapping Failed');
    }

    // 2. Verify Budget Period Calculation
    console.log('\n--- 2. Testing Real Budget Periods ---');
    const budgetManager = require('./core/economic/budget_manager').BudgetManager.getInstance();
    const budget = await budgetManager.getBudget('tenant:acme');

    const now = new Date();
    const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    console.log(`Period Start: ${new Date(budget.period_start).toISOString()}`);
    console.log(`Expected Start: ${new Date(expectedStart).toISOString()}`);

    if (Math.abs(budget.period_start - expectedStart) < 1000) {
        console.log('✅ Budget Period Calculation Passed');
    } else {
        console.error('❌ Budget Period Calculation Failed');
    }

    // 3. Verify Decider correctly uses Dynamic Context
    console.log('\n--- 3. Testing Decider with Dynamic Input ---');
    const decision = await decider.evaluate({
        tenant_id: 'acme',
        budget_scopes: ['tenant:acme'],
        tool_name: fakeTool,
        args: { prompt: 'hello' },
        pricing_context: { provider: 'dynamic' }
    });

    console.log(`Decision Outcome: ${decision.outcome}`);
    console.log(`Estimated Cost: ${decision.estimated_cost}`);

    // Cost calculation: 
    // input tokens: "{"prompt":"hello"}".length / 4 = 18 / 4 = 5 tokens
    // output tokens: 1500 (from DB)
    // rate for internal/standard (default fallback if anthropic not in pricing_tiers yet): 0.001 input, 0.001 output, 0.01 flat
    // cost = (5/1000 * 0.001) + (1500/1000 * 0.001) + 0.01 = 0.000005 + 0.0015 + 0.01 = 0.0115

    if (decision.estimated_cost > 0.01 && decision.estimated_cost < 0.02) {
        console.log('✅ Decider Dynamic Evaluation Passed (Cost is realistic)');
    } else {
        console.error(`❌ Decider Cost Calculation seems wrong: ${decision.estimated_cost}`);
    }

    console.log('\n🏁 Real Governance Verification Complete.');
}

verifyRealGovernance().catch(console.error);
