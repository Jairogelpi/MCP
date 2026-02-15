import { db } from './adapters/database';
import { seedEnterpriseIAM } from './seed_iam';

export async function seedData() {
    console.log('[SEED] Seeding Initial Data...');
    seedEnterpriseIAM();

    // Clear ledger tables for a fresh demo
    await db.raw.run('DELETE FROM ledger_entries');
    await db.raw.run('DELETE FROM ledger_reservations');
    await db.raw.run('DELETE FROM budget_spending');

    // Budgets
    const budgets = [
        // Tenant ACME
        {
            id: 'tenant:acme',
            scope_type: 'tenant',
            scope_id: 'acme',
            period: 'monthly',
            hard_limit: 100.00,
            soft_limit: 80.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Tenant Demo Client
        {
            id: 'tenant:demo-client',
            scope_type: 'tenant',
            scope_id: 'demo-client',
            period: 'monthly',
            hard_limit: 1000.00,
            soft_limit: 800.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Default Project
        {
            id: 'project:default',
            scope_type: 'project',
            scope_id: 'default',
            period: 'monthly',
            hard_limit: 100.00,
            soft_limit: 80.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Alpha Project (Limited)
        {
            id: 'project:alpha',
            scope_type: 'project',
            scope_id: 'alpha',
            period: 'monthly',
            hard_limit: 100.00,
            soft_limit: 5.00, // Trigger degrade test
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Poor Project (Very Limited)
        {
            id: 'project:poor',
            scope_type: 'project',
            scope_id: 'poor',
            period: 'monthly',
            hard_limit: 1.00, // Fail quickly
            soft_limit: 0.50,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Stress Test Project (Concurrency)
        {
            id: 'project:concurrency',
            scope_type: 'project',
            scope_id: 'concurrency',
            period: 'monthly',
            hard_limit: 0.20, // Allow 20 reqs @ 0.01
            soft_limit: 0.15,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Stress Test Project (Strict)
        {
            id: 'project:stress_test',
            scope_type: 'project',
            scope_id: 'stress_test',
            period: 'monthly',
            hard_limit: 20.00,
            soft_limit: 15.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        }
    ];

    for (const b of budgets) {
        await db.budgets.upsert(b);
        await db.ledger.upsertAccount({
            id: b.id, scope_type: b.scope_type, scope_id: b.scope_id,
            currency: b.currency, hard_limit: b.hard_limit, soft_limit: b.soft_limit
        });
    }

    // Pricing
    await db.raw.run(`
        INSERT OR IGNORE INTO pricing_tiers (provider, model, endpoint, region, tier, input_price, output_price, flat_fee, effective_from, created_at)
        VALUES ('internal', '*', '*', 'global', 'standard', 0.001, 0.001, 0.01, 0, ?)
    `, [Date.now()]);

    await db.raw.run(`
        INSERT OR IGNORE INTO pricing_tiers (provider, model, endpoint, region, tier, input_price, output_price, flat_fee, effective_from, created_at)
        VALUES ('internal', '*', 'expensive_op', 'global', 'standard', 0.0, 0.0, 1.0, 0, ?)
    `, [Date.now()]);

    // ENSURE key_registry (Safe for all environments)
    await db.raw.run(`
        INSERT INTO key_registry (key_id, public_key, status, created_at)
        VALUES ('gateway-key-v1', 'MCowBQYDK2VwAyEAixt6mRBe1N4vNIn6e9sR5f2D6Z0pExE2oF3U/9p79Xo=', 'active', ?)
        ON CONFLICT(key_id) DO NOTHING
    `, [Date.now()]);

    console.log(`[SEED] Seeded key_registry, pricing and ${budgets.length} budgets.`);
}
