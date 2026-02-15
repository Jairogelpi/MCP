import { PrivacyProofGenerator } from './proof_generator';

async function runTest() {
    console.log('\n🕵️ Testing Privacy-Preserving Proofs (Phase 10.7)...\n');

    const originalReceipt = {
        id: 'rcpt_secure_999',
        prompt: 'Secret Strategy for Merger',
        response: 'Buy Target Corp at $50',
        cost: 2500, // $0.0025
        timestamp: Date.now()
    };

    console.log('Original (Sensitive):', originalReceipt);

    // Redact Prompt and Response, keep ID and Cost visible
    const proof = PrivacyProofGenerator.redact(originalReceipt, ['prompt', 'response']);

    console.log('\nRedacted Proof (Public Safe):');
    console.log(JSON.stringify(proof, null, 2));

    // Verify
    if (proof.visible.prompt) throw new Error('❌ Prompt Leaked!');
    if (!proof.visible.cost) throw new Error('❌ Cost Hidden!');
    if (!proof.hashes.prompt) throw new Error('❌ Prompt Hash Missing!');

    console.log('\n✅ Privacy Proof Verified: Sensitive data hidden, Cost verifiable.');
}

runTest().catch(console.error);
