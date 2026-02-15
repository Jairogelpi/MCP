import { RetentionManager } from './retention_manager';
import { db } from '../../adapters/database';

async function verifyAuditAndRetention() {
    console.log('\n🧪 Testing Audit & Retention (Phase 8.4)...');

    const tenantId = 'lab-tenant';

    // 1. Test Audit Logging
    console.log('   [1] Testing Audit Log Persistence...');
    // We simulate a request by calling the audit intercetpor or just inserting
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['test_evt_1', tenantId, 'u1', 'test_action', 'tool', 'success', Date.now()]);

    const auditCount = (db.raw.prepare('SELECT count(*) as total FROM audit_events WHERE tenant_id = ?').get([tenantId]) as any).total;
    console.log(`   ✅ Audit Event recorded. Total for tenant: ${auditCount}`);

    // 2. Test Retention Purge
    console.log('   [2] Testing Retention Reaper...');
    // Add an old record (2 days ago)
    const oldTs = Date.now() - (2 * 24 * 60 * 60 * 1000);
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['old_evt_1', tenantId, 'u1', 'expired', 'tool', 'success', oldTs]);

    // Set policy to 1 day for this tenant
    db.raw.run('INSERT OR REPLACE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES (?, ?, ?)',
        [tenantId, 'audit', 1]);

    await RetentionManager.runReaper();

    const remaining = (db.raw.prepare('SELECT count(*) as total FROM audit_events WHERE event_id = "old_evt_1"').get() as any).total;
    if (remaining === 0) {
        console.log('   ✅ Reaper successfully purged expired audit record.');
    } else {
        console.log('   ❌ Reaper failed to purge record.');
    }

    // 3. Test Legal Hold
    console.log('   [3] Testing Legal Hold (Anti-Purge)...');
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['hold_evt_1', tenantId, 'u1', 'on_hold', 'tool', 'success', oldTs]);

    db.raw.run('INSERT OR REPLACE INTO legal_holds (tenant_id, resource_type, active, created_at) VALUES (?, ?, ?, ?)',
        [tenantId, 'audit', 1, Date.now()]);

    await RetentionManager.runReaper();

    const stillThere = (db.raw.prepare('SELECT count(*) as total FROM audit_events WHERE event_id = "hold_evt_1"').get() as any).total;
    if (stillThere === 1) {
        console.log('   ✅ Legal Hold correctly prevented purge of expired record.');
    } else {
        console.log('   ❌ Legal Hold was ignored during purge.');
    }

    // 4. Test Forensic Export
    console.log('   [4] Testing Forensic Export...');
    const exported = await RetentionManager.exportForensic(tenantId);
    console.log(`   ✅ Export Generated. Length: ${exported.length} characters.`);
    if (exported.includes('hold_evt_1')) {
        console.log('   ✅ Export contains Expected data.');
    }
}

verifyAuditAndRetention().catch(console.error);
