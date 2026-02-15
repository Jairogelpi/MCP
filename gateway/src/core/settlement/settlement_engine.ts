import { db } from '../../adapters/database';
import { randomUUID } from 'crypto';
import { BankingAdapter } from '../../adapters/banking_interface';
import { MockBankingAdapter } from '../../adapters/banking_mock';
import { IdentityAdapter } from '../../adapters/identity_interface';
import { MockIdentityAdapter } from '../../adapters/identity_mock';

// In prod, this would be dependency injected or factory-created.
// For now, we default to Mock, but the interface allows swapping.
const banking: BankingAdapter = new MockBankingAdapter();
const identity: IdentityAdapter = new MockIdentityAdapter();

export class SettlementEngine {

    // Simulate aggregating "Invoices" (Ledger periods) into a Settlement Batch
    static async createBatch(tenantId: string, periodId: string) {
        console.log(`[Settlement] Creating batch for ${tenantId} / ${periodId}`);

        // 1. Calculate Total from Ledger (Simulated here as a query)
        // In reality, this sums up all 'SETTLED' entries for the period
        const ledgerTotal = 150000; // $0.15 mock

        const batchId = randomUUID();
        const now = Date.now();

        await db.raw.run(`
            INSERT INTO settlement_batches (batch_id, tenant_id, period_id, status, total_amount, currency, created_at)
            VALUES (?, ?, ?, 'OPEN', ?, 'USD', ?)
        `, [batchId, tenantId, periodId, ledgerTotal, now]);

        return batchId;
    }

    static async processPayouts(batchId: string) {
        console.log(`[Settlement] Processing payouts for batch ${batchId}`);

        // Mock Payees
        const payees = [
            { id: 'did:mcp:provider:openai', share: 0.7 },
            { id: 'did:mcp:provider:anthropic', share: 0.3 }
        ];

        const batchRows = await db.raw.query('SELECT * FROM settlement_batches WHERE batch_id = ?', [batchId]);
        const batch = batchRows[0] as any;
        if (!batch) throw new Error('Batch not found');

        const now = Date.now();

        // Generate Payouts
        for (const p of payees) {
            // 1. KYC Check
            const kyc = await identity.verifyEntity(p.id);
            if (kyc.status !== 'VERIFIED') {
                console.error(`[Settlement] Payout BLOCKED for ${p.id} (KYC: ${kyc.status})`);
                continue; // Skip this payout
            }

            const amount = Math.floor(batch.total_amount * p.share);

            // Use Adapter to execute payout
            // The adapter handles the external API call (Mock or Real)
            const result = await banking.payout(p.id, amount, 'USD', `batch_${batchId}_payee_${p.id}`);

            await db.raw.run(`
                INSERT INTO payouts (payout_id, batch_id, payee_id, amount, currency, status, created_at)
                VALUES (?, ?, ?, ?, 'USD', ?, ?)
            `, [result.payoutId || randomUUID(), batchId, p.id, amount, result.status, now]);
        }

        // Close Batch
        await db.raw.run("UPDATE settlement_batches SET status = 'SETTLED', settled_at = ? WHERE batch_id = ?", [now, batchId]);

        return true;
    }

    // Check: Sum(Payouts) <= Batch Total (allowing for fees/margin)
    static async reconcile(batchId: string) {
        const batchRows = await db.raw.query('SELECT * FROM settlement_batches WHERE batch_id = ?', [batchId]);
        const batch = batchRows[0] as any;

        const payoutRows = await db.raw.query('SELECT SUM(amount) as total FROM payouts WHERE batch_id = ?', [batchId]);
        const payoutTotal = payoutRows[0].total || 0;

        const diff = batch.total_amount - payoutTotal;

        console.log(`[Reconciliation] Batch: ${batch.total_amount}, Payouts: ${payoutTotal}, Diff: ${diff}`);

        if (diff < 0) {
            console.error('❌ Mismatch: Payouts exceed Batch Total!');
            return false;
        }

        console.log('✅ Reconciliation OK.');
        return true;
    }
}
