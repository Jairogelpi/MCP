import { db } from '../src/adapters/database';

async function seedBudgets() {
    console.log('[SEED] Seeding Budgets...');

    // Clear existing
    // db.budgets.clear(); // Optional: keeps idempotent if upsert used

    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const budgets = [
        {
            id: 'tenant:acme',
            scope_type: 'tenant',
            scope_id: 'acme',
            period: 'monthly',
            hard_limit: 100.00,
            soft_limit: 80.00,
            currency: 'EUR',
            active_from: now,
            active_to: now + oneMonth,
            created_at: now
        },
        {
            id: 'project:alpha',
            scope_type: 'project',
            scope_id: 'alpha',
            period: 'monthly',
            hard_limit: 10.00,
            soft_limit: 5.00,
            currency: 'EUR',
            active_from: now,
            active_to: now + oneMonth,
            created_at: now
        },
        {
            id: 'project:poor',
            scope_type: 'project',
            scope_id: 'poor',
            period: 'monthly',
            hard_limit: 0.000001, // Instant fail
            soft_limit: 0.00,
            currency: 'EUR',
            active_from: now,
            active_to: now + oneMonth,
            created_at: now
        },
        {
            id: 'agent:zero',
            scope_type: 'agent',
            scope_id: 'zero',
            period: 'monthly',
            hard_limit: 1.00,
            soft_limit: 0.50,
            currency: 'EUR',
            active_from: now,
            active_to: now + oneMonth,
            created_at: now
        }
    ];

    for (const b of budgets) {
        db.budgets.upsert(b);
        if (b.id === 'project:alpha') {
            // Pre-fill spend to trigger Soft Limit
            db.budgets.incrementSpend(b.id, 6.00);
        }
        console.log(`[SEED] Upserted budget: ${b.id}`);
    }

    console.log('[SEED] Budget seeding complete.');
}

seedBudgets().catch(console.error);
