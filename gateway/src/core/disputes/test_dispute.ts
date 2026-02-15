import { EvidenceGenerator } from './evidence_generator';

async function runTest() {
    console.log('\n⚖️ Testing Dispute Evidence Generation (Phase 10.5)...\n');

    const receiptId = 'rcpt_challenge_001';

    const bundle = await EvidenceGenerator.generateBundle(receiptId);

    console.log('Generated Evidence Bundle:');
    console.log(JSON.stringify(bundle, null, 2));

    if (!bundle.attestation || !bundle.receipt) {
        throw new Error('Incomplete Evidence Bundle');
    }

    console.log('\n✅ Bundle creation successful. Ready for Arbitration.');
}

runTest().catch(console.error);
