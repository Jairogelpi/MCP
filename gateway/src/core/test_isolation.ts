import { db } from '../adapters/database';

async function verifyIsolation() {
    console.log('\n🧪 Testing Tenant Isolation (Phase 8.8)...');

    const T1 = 'tenant-alpha';
    const T2 = 'tenant-beta';

    // 1. Seed T1 Policy
    db.raw.run('INSERT OR REPLACE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES (?, ?, ?)', [T1, 'audit', 10]);

    // 2. Seed T2 Policy (Different)
    db.raw.run('INSERT OR REPLACE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES (?, ?, ?)', [T2, 'audit', 90]);

    // 3. Verify Separation
    const p1 = db.raw.prepare('SELECT retention_days FROM retention_policies WHERE tenant_id = ?').get([T1]) as any;
    const p2 = db.raw.prepare('SELECT retention_days FROM retention_policies WHERE tenant_id = ?').get([T2]) as any;

    if (p1.retention_days === 10 && p2.retention_days === 90) {
        console.log('   ✅ Policy Isolation: OK');
    } else {
        console.log('   ❌ Policy LEAK or OVERWRITE detected.');
    }

    // 4. Audit Isolation Test
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['audit_alpha_1', T1, 'u1', 'action_alpha', 'tool', 'success', Date.now()]);

    const leakCheck = db.raw.query('SELECT * FROM audit_events WHERE tenant_id = ?', [T2]);
    const alphaEvents = leakCheck.filter((e: any) => e.event_id === 'audit_alpha_1');

    if (alphaEvents.length === 0) {
        console.log('   ✅ Audit Isolation: OK (T1 data not visible to T2 queries)');
    } else {
        console.log('   ❌ DATA LEAK: T1 audit event appeared in T2 query results.');
    }
}

verifyIsolation().catch(console.error);
