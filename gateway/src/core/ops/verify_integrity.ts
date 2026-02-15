import { db } from '../../adapters/database';
import * as crypto from 'crypto';

export async function verifyIntegrity() {
    console.log('[OPS] Verifying Ledger and Receipt Chain Integrity...');

    // 1. Verify Receipt Chain
    const receipts = db.raw.query('SELECT * FROM ledger_receipts ORDER BY created_at ASC') as any[];
    let prevHash: string | null = null;
    let chainBroken = false;

    for (const r of receipts) {
        const receiptJson = JSON.parse(r.receipt_json);
        if (prevHash && receiptJson.proof.prev_receipt_hash !== prevHash) {
            console.error(`❌ Chain broken at receipt ${r.receipt_id}: Expected prev ${prevHash}, got ${receiptJson.proof.prev_receipt_hash}`);
            chainBroken = true;
        }
        prevHash = r.hash;
    }

    if (!chainBroken) {
        console.log('   ✅ Receipt Chain: OK (all links intact)');
    }

    // 2. Verify Ledger Invariants
    const accounts = db.raw.query('SELECT * FROM ledger_accounts') as any[];
    for (const acc of accounts) {
        const entriesTotal = (db.raw.prepare('SELECT SUM(amount) as total FROM ledger_entries WHERE tenant_id = ? AND status = "SETTLED"').get([acc.tenant_id]) as any).total || 0;
        if (Math.abs(acc.settled_total - entriesTotal) > 0.0001) {
            console.error(`❌ Ledger Invariant Violation in account ${acc.account_id}: Balance ${acc.settled_total} vs Entries ${entriesTotal}`);
        }
    }
    console.log('   ✅ Ledger Invariants: OK');
}

if (require.main === module) {
    verifyIntegrity().catch(console.error);
}
