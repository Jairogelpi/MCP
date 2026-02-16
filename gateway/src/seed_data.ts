import { db } from './adapters/database';
import { seedEnterpriseIAM } from './seed_iam';

export async function seedData() {
    console.log('[SEED] Seeding Initial Data...');
    seedEnterpriseIAM();

    // Clear ledger tables for a fresh demo
    await db.raw.run('DELETE FROM ledger_entries');
    await db.raw.run('DELETE FROM ledger_reservations');
    await db.raw.run('DELETE FROM budget_spending');

    // Hierarchical Governance Examples (Fase 2)
    const budgets = [
        // 1. Tool-specific limit (e.g. expensive_op is capped for everyone)
        {
            id: 'tool:expensive_op',
            scope_type: 'tool',
            scope_id: 'expensive_op',
            period: 'monthly',
            hard_limit: 50.00,
            soft_limit: 40.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // 2. Department-specific limit (e.g. Engineering dept)
        {
            id: 'dept:engineering',
            scope_type: 'department',
            scope_id: 'engineering',
            period: 'monthly',
            hard_limit: 500.00,
            soft_limit: 400.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // 3. User-specific limit (e.g. specific agent budget)
        {
            id: 'user:u_demo_agent',
            scope_type: 'user',
            scope_id: 'u_demo_agent',
            period: 'monthly',
            hard_limit: 10.00,
            soft_limit: 8.00,
            currency: 'EUR',
            active_from: Date.now(),
            active_to: null,
            created_at: Date.now()
        },
        // Standard Tenants
        {
            id: 'tenant:acme',
            scope_type: 'tenant',
            scope_id: 'acme',
            period: 'monthly',
            hard_limit: 1000.00,
            soft_limit: 800.00,
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
