import { RevocationManager } from './revocation_manager';

async function runTest() {
    console.log('\n👮 Testing Marketplace Governance (Phase 11.7)...\n');

    const revocation = new RevocationManager();

    // 1. Install Valid Pack
    console.log('--- Test 1: Installing Valid Pack ---');
    const validPub = 'did:mcp:pub:stripe';
    const validPack = 'mcp-stripe-adapter';
    if (revocation.isRevoked(validPub, validPack)) {
        throw new Error('Valid pack falsely flagged!');
    }
    console.log('✅ Valid pack allowed.');

    // 2. Install Malware Pack (Revoked)
    console.log('\n--- Test 2: Installing Revoked Pack ---');
    const badPack = 'mcp-crypto-miner';
    if (!revocation.isRevoked(validPub, badPack)) {
        throw new Error('Revoked pack NOT detected!');
    }
    console.log('🛡️ Revoked pack BLOCKED.');

    // 3. Install from Banned Publisher
    console.log('\n--- Test 3: Installing from Banned Publisher ---');
    const badPub = 'did:mcp:pub:malware_inc';
    const anyPack = 'mcp-weather-app'; // Even a benign pack from bad actor is blocked
    if (!revocation.isRevoked(badPub, anyPack)) {
        throw new Error('Banned publisher NOT detected!');
    }
    console.log('🛡️ Banned publisher BLOCKED.');

    console.log('\n✅ Governance Policy Enforced.');
}

runTest().catch(console.error);
