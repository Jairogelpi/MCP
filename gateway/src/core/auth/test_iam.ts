import { IdentityManager } from './identity_manager';
import { db } from '../../adapters/database';

async function testIAM() {
    console.log('\n🧪 Testing Robust IAM & RBAC (Phase 8.2)...');

    // These secrets come from seed_iam.ts
    const adminSecret = 'admin_secret_123';
    const viewerSecret = 'viewer_secret_456';

    const adminIdentity = await IdentityManager.getIdentity(adminSecret);
    const viewerIdentity = await IdentityManager.getIdentity(viewerSecret);

    if (!adminIdentity || !viewerIdentity) {
        console.error('❌ Failed to authenticate test identities. Did you seed?');
        process.exit(1);
    }

    console.log(`   [AUTH] Admin authenticated: ${adminIdentity.userId} (Role: ${adminIdentity.role})`);
    console.log(`   [AUTH] Viewer authenticated: ${viewerIdentity.userId} (Role: ${viewerIdentity.role})`);

    // 1. Scope Enforcement Tests
    const testCases = [
        { name: 'Admin can manage policies', identity: adminIdentity, scope: 'manage_policies', expected: true },
        { name: 'Viewer cannot manage policies', identity: viewerIdentity, scope: 'manage_policies', expected: false },
        { name: 'Viewer can read receipts', identity: viewerIdentity, scope: 'read_receipts', expected: true },
        { name: 'Admin bypasses all (execute_tools)', identity: adminIdentity, scope: 'execute_tools', expected: true }
    ];

    let passed = 0;
    for (const t of testCases) {
        const res = IdentityManager.hasScope(t.identity, t.scope);
        const status = res === t.expected ? '✅' : '❌';
        console.log(`   ${status} [${t.name}] Res: ${res}`);
        if (res === t.expected) passed++;
    }

    console.log(`\n📊 IAM Results: ${passed}/${testCases.length} passed.`);
}

testIAM().catch(console.error);
