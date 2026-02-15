import { db } from '../adapters/database';
import { BillingManager } from './billing_manager';

async function verifyBillingLogic() {
    console.log('\n🧪 Isolated Billing Logic Verification (Phase 8.6)...');

    const tenantId = 'iso-tenant-1';
    const month = '2024-03';
    const periodId = `${tenantId}:${month}`;

    try {
        // 1. Ensure tables exist (Minimal)
        db.raw.query('SELECT 1 FROM billing_periods LIMIT 1');
        console.log('   ✅ Database schema ready.');

        // 2. Clear old test data
        db.raw.run('DELETE FROM ledger_entries WHERE tenant_id = ?', [tenantId]);
        db.raw.run('DELETE FROM billing_periods WHERE tenant_id = ?', [tenantId]);

        // 3. Setup Period
        const start = Date.now() - 10000;
        const end = Date.now() + 10000;
        db.raw.run('INSERT INTO billing_periods (period_id, tenant_id, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, "OPEN", ?)',
            [periodId, tenantId, start, end, Date.now()]);

        // 4. Seed Settlements
        db.raw.run('INSERT INTO ledger_entries (request_id, tenant_id, type, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['iso_req_1', tenantId, 'SETTLEMENT', 100.0, 'EUR', 'SETTLED', start + 1000]);
        db.raw.run('INSERT INTO ledger_entries (request_id, tenant_id, type, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['iso_req_2', tenantId, 'SETTLEMENT', 50.0, 'EUR', 'SETTLED', start + 2000]);

        // 5. Run Billing Engine
        console.log('   [1] Closing period...');
        const invId = await BillingManager.closePeriod(tenantId, month);
        console.log(`   ✅ Invoice generated: ${invId}`);

        // 6. Verify Consistency
        console.log('   [2] Running consistency audit...');
        const consistent = await BillingManager.verifyConsistency(invId!);
        if (consistent) {
            console.log('   ✅ MATCH: sum(lines) == invoice.total == sum(ledger).');
        } else {
            console.error('   ❌ MISMATCH detected in billing totals.');
        }

    } catch (e: any) {
        console.error('   ❌ ERROR during verification:', e.message);
    }
}

verifyBillingLogic().catch(console.error);
