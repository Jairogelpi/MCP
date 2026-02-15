import { SettlementEngine } from './settlement_engine';
import { NotaryService } from '../attestation/notary';

async function runTest() {
    console.log('\n🏦 Testing Settlement & Attestation (Phase 10.2 - 10.3)...\n');

    // 1. Settlement Flow
    console.log('--- Settlement Engine ---');
    const tenantId = 'acme-corp';
    const periodId = '2024-03';

    // Create Batch
    const batchId = await SettlementEngine.createBatch(tenantId, periodId);

    // Process Payouts
    await SettlementEngine.processPayouts(batchId);

    // Reconcile
    const recOk = await SettlementEngine.reconcile(batchId);
    if (!recOk) throw new Error('Reconciliation Failed');


    // 2. Attestation Flow
    console.log('\n--- Notary Attestation ---');
    const notary = new NotaryService();
    const receipts = ['hash_abc123', 'hash_def456'];

    // Issue
    const attestation = notary.signAttestation(tenantId, receipts);
    console.log('Issued Attestation:', JSON.stringify(attestation, null, 2));

    // Verify
    const isValid = notary.verify(attestation);
    console.log(`Signature Verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    if (!isValid) throw new Error('Attestation Verification Failed');
}

runTest().catch(console.error);
