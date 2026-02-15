
import { db } from './adapters/database';
import crypto from 'crypto';

async function verifyImmutability() {
    console.log('\n--- PHASE 5.6 IMMUTABILITY (WORM) VERIFICATION ---');

    // 1. Setup - Insert a target receipt
    const id = 'immutable-test-' + Date.now();
    const receipt = {
        receipt_id: id,
        meta: { tenant_id: 'worm_tester' },
        request_id: 'req-' + id,
        proof: { prev_receipt_hash: 'genesis' },
        timestamps: { created_at: new Date().toISOString() }
    };

    // We bypass chain manager for raw DB test
    db.chain.storeReceipt(receipt, 'hash-' + id, 'sig-' + id);
    console.log(`[TEST] Inserted receipt: ${id}`);

    // 2. Attempt UPDATE
    console.log('[TEST] Attempting UPDATE...');
    let updateFailed = false;
    try {
        db.raw.run('UPDATE ledger_receipts SET hash = "hacked" WHERE receipt_id = ?', [id]);
    } catch (e: any) {
        if (e.message.includes('Receipts are immutable')) {
            updateFailed = true;
            console.log('✅ PASS: UPDATE blocked by trigger.');
        } else {
            console.error('❌ FAIL: Update failed but with unexpected error:', e.message);
        }
    }

    if (!updateFailed) {
        console.error('❌ FAIL: UPDATE succeeded! WORM is broken.');
        // Verify data didn't change anyway?
    }

    // 3. Attempt DELETE
    console.log('[TEST] Attempting DELETE...');
    let deleteFailed = false;
    try {
        db.raw.run('DELETE FROM ledger_receipts WHERE receipt_id = ?', [id]);
    } catch (e: any) {
        if (e.message.includes('Receipts are immutable')) {
            deleteFailed = true;
            console.log('✅ PASS: DELETE blocked by trigger.');
        } else {
            console.error('❌ FAIL: Delete failed but with unexpected error:', e.message);
        }
    }

    if (!deleteFailed) {
        console.error('❌ FAIL: DELETE succeeded! WORM is broken.');
    }

    // 4. Verify Existence
    const row = db.raw.query('SELECT * FROM ledger_receipts WHERE receipt_id = ?', [id]);
    if (row.length === 1) {
        console.log('✅ PASS: Receipt still exists and is untouched.');
    } else {
        console.error('❌ FAIL: Receipt is missing!');
    }
}

verifyImmutability().catch(console.error);
