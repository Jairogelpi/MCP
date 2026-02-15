import { FederationTokenManager } from './token_manager';

async function runTest() {
    console.log('\n🤝 Testing Federation & Delegation (Phase 10.6)...\n');

    const manager = new FederationTokenManager();
    const client = 'client_corp';
    const agency = 'agency_inc';

    // 1. Issue Token (Client delegates to Agency)
    console.log(`[Client] Delegating budget to ${agency}...`);
    const token = manager.issueToken(client, agency, 'tools:read', 5000);
    console.log('Token:', token);

    // 2. Verify Token (Gateway Check)
    console.log('[Gateway] Verifying delegation...');
    const payload = manager.verifyToken(token);

    if (payload) {
        console.log('✅ Token Valid. Authorized Delegation:', payload);
    } else {
        throw new Error('❌ Token Verification Failed');
    }

    // 3. Simulate Expiry/Tamper (Optional Check)
    // ...
}

runTest().catch(console.error);
