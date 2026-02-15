import { IdentityManager, UserRole } from './identity_manager';
import { db } from '../../adapters/database';

async function testRBAC() {
    try {
        console.log('\n🧪 Testing Identity & RBAC Enforcement...');

        // 1. Fetch all keys to inspect columns
        const allKeys = db.raw.prepare('SELECT * FROM key_registry').all() as any[];
        if (allKeys.length > 0) {
            console.log(`   📂 Database Columns: ${Object.keys(allKeys[0]).join(', ')}`);
        } else {
            console.log('   ⚠️  No keys in registry.');
        }

        const adminRow = allKeys.find(k => k.role === 'admin');
        const auditorRow = allKeys.find(k => k.role === 'auditor');
        const tenantRow = allKeys.find(k => k.role === 'tenant');

        if (!adminRow || !auditorRow || !tenantRow) {
            console.log('   ⚠️  Test keys missing. Run provision_tenant first.');
            process.exit(1);
        }

        const adminIdentity = await IdentityManager.getIdentity(adminRow.key_id);
        const auditorIdentity = await IdentityManager.getIdentity(auditorRow.key_id);
        const tenantIdentity = await IdentityManager.getIdentity(tenantRow.key_id);

        console.log(`   [ADMIN]   ${adminIdentity?.role} keys found.`);
        console.log(`   [AUDITOR] ${auditorIdentity?.role} keys found.`);
        console.log(`   [TENANT]  ${tenantIdentity?.role} keys found.`);

        // 2. Verification Logic
        const tests = [
            { id: 'T1', name: 'Admin bypasses all scopes', res: IdentityManager.hasAccess(adminIdentity!, 'delete:db'), expected: true },
            { id: 'T2', name: 'Auditor has read:receipts', res: IdentityManager.hasAccess(auditorIdentity!, 'read:receipts'), expected: true },
            { id: 'T3', name: 'Auditor lacks write:actions', res: IdentityManager.hasAccess(auditorIdentity!, 'write:actions'), expected: false },
            { id: 'T4', name: 'Tenant with "*" has all scopes', res: IdentityManager.hasAccess(tenantIdentity!, 'any:scope'), expected: true },
        ];

        let passed = 0;
        for (const t of tests) {
            const status = t.res === t.expected ? '✅' : '❌';
            console.log(`   ${status} [${t.id}] ${t.name}`);
            if (t.res === t.expected) passed++;
        }

        console.log(`\n📊 RBAC Results: ${passed}/${tests.length} passed.`);

    } catch (err: any) {
        console.error('\n❌ RBAC Test Failed with Error:');
        console.error(err.message);
    }
}

testRBAC().catch(console.error);
