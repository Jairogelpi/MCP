import { RetentionManager } from './retention_manager';
import { db } from '../adapters/database';

async function verifyAuditAndRetention() {
    console.log('\n🧪 Testing Audit & Retention (Phase 8.4)...');
    const tenantId = 'lab-tenant';

    // 1. Audit persistence
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['test_evt_1', tenantId, 'u1', 'test_action', 'tool', 'success', Date.now()]);
    console.log('   ✅ Audit Event recorded.');

    // 2. Reaper
    const oldTs = Date.now() - (2 * 24 * 60 * 60 * 1000);
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['old_evt_1', tenantId, 'u1', 'expired', 'tool', 'success', oldTs]);
    db.raw.run('INSERT OR REPLACE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES (?, ?, ?)', [tenantId, 'audit', 1]);
    await RetentionManager.runReaper();

    const remaining = (db.raw.prepare('SELECT count(*) as total FROM audit_events WHERE event_id = "old_evt_1"').get() as any).total;
    console.log(remaining === 0 ? '   ✅ Reaper purged expired record.' : '   ❌ Reaper failed to purge.');

    // 3. Legal Hold
    db.raw.run('INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['hold_evt_1', tenantId, 'u1', 'on_hold', 'tool', 'success', oldTs]);
    db.raw.run('INSERT OR REPLACE INTO legal_holds (tenant_id, resource_type, active, created_at) VALUES (?, ?, ?, ?)', [tenantId, 'audit', 1, Date.now()]);
    await RetentionManager.runReaper();

    const stillThere = (db.raw.prepare('SELECT count(*) as total FROM audit_events WHERE event_id = "hold_evt_1"').get() as any).total;
    console.log(stillThere === 1 ? '   ✅ Legal Hold respected.' : '   ❌ Legal Hold ignored.');
}

verifyAuditAndRetention().catch(console.error);
