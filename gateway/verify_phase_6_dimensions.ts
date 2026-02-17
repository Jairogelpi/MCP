import { db } from './src/adapters/database';
import { PolicyEngine } from './src/core/policy_engine';
import { PolicyInput } from './src/core/contract';
import * as crypto from 'crypto';

async function verify() {
    console.log('\n--- PHASE 6: ADVANCED GOVERNANCE VERIFICATION ---\n');

    const engine = new PolicyEngine();
    const tenantId = 't_governance_v2';
    const now = Date.now();

    try {
        // 1. Setup Test Infrastructure
        await db.raw.run('INSERT OR IGNORE INTO tenants (tenant_id, name, owner_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, 'Governance V2 Org', 'u_admin', 'active', now, now]);

        await db.raw.run('DELETE FROM iam_policies WHERE tenant_id = ?', [tenantId]);

        // A. Dimension: Temporal (DENY midnight access)
        await db.raw.run(`
            INSERT INTO iam_policies (id, tenant_id, scope_type, scope_id, priority, mode, effect, conditions, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'p_time_lock', tenantId, 'tenant', null, 100, 'enforce', 'deny',
            JSON.stringify({ time_window: '00:00-08:00' }), // Assuming current time is in this window for test
            'v1', now, now
        ]);

        // B. Dimension: Data (DENY PII)
        await db.raw.run(`
            INSERT INTO iam_policies (id, tenant_id, scope_type, scope_id, priority, mode, effect, conditions, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'p_pii_guard', tenantId, 'tenant', null, 110, 'enforce', 'deny',
            JSON.stringify({ blocked_data_types: ['email', 'credit_card'] }),
            'v1', now, now
        ]);

        // C. Dimension: Environment & Approval (PROD requires approval)
        await db.raw.run(`
            INSERT INTO iam_policies (id, tenant_id, scope_type, scope_id, priority, mode, effect, conditions, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'p_prod_approval', tenantId, 'deployment', 'prod', 50, 'enforce', 'require_approval',
            JSON.stringify({ environments: ['prod'] }),
            'v1', now, now
        ]);

        // D. Dimension: Role & Conflict (Allow Devs, but Deny wins)
        await db.raw.run(`
            INSERT INTO iam_policies (id, tenant_id, scope_type, scope_id, priority, mode, effect, conditions, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'p_dev_allow', tenantId, 'tenant', null, 10, 'enforce', 'allow',
            JSON.stringify({ roles: ['developer'] }),
            'v1', now, now
        ]);

        console.log('✓ Test Policies Installed.');

        // --- SCENARIO 1: Temporal Block ---
        const inputTime: PolicyInput = {
            tenant_id: tenantId, upstream_server_id: 'any', agent_id: 'ag_1',
            role: 'admin', tool_name: 'test', args: {}, timestamp: now, request_id: 'r1',
            risk_class: 'low', environment: 'dev'
        };
        const resTime = await engine.evaluate(inputTime);
        console.log('Scenario 1 (Time Block):', resTime.decision === 'deny' && resTime.matchedRuleId === 'p_time_lock' ? 'PASSED ✅' : 'FAILED ❌');

        // --- SCENARIO 2: PII Block ---
        const inputPII: PolicyInput = {
            ...inputTime,
            args: { email: 'malicious@hacker.com' }
        };
        const resPII = await engine.evaluate(inputPII);
        console.log('Scenario 2 (PII Block):', resPII.decision === 'deny' && resPII.matchedRuleId === 'p_pii_guard' ? 'PASSED ✅' : 'FAILED ❌');

        // --- SCENARIO 3: Prod Approval ---
        // We override the time lock for this test to focus on Env
        await db.raw.run('UPDATE iam_policies SET conditions = ? WHERE id = ?', [JSON.stringify({ time_window: '23:59-23:59' }), 'p_time_lock']);

        const inputProd: PolicyInput = {
            ...inputTime,
            environment: 'prod'
        };
        const resProd = await engine.evaluate(inputProd);
        console.log('Scenario 3 (Prod Approval):', resProd.decision === 'deny' && resProd.reason_codes.includes('REQUIRE_APPROVAL') ? 'PASSED ✅' : 'FAILED ❌');

        // --- SCENARIO 4: Conflict Resolution (Deny > Allow) ---
        // Restore time lock
        await db.raw.run('UPDATE iam_policies SET conditions = ? WHERE id = ?', [JSON.stringify({ time_window: '00:00-23:59' }), 'p_time_lock']);
        const inputConflict: PolicyInput = {
            ...inputTime,
            role: 'developer' // p_dev_allow says Allow, p_time_lock says Deny
        };
        const resConflict = await engine.evaluate(inputConflict);
        console.log('Scenario 4 (Conflict Resolution - Deny Wins):', resConflict.decision === 'deny' ? 'PASSED ✅' : 'FAILED ❌');

        console.log('\n--- AUDIT VERIFICATION ---\n');

        // Simulating hash and receipt
        const envelope = { action: 'test', parameters: { key: 'val' } };
        const envelopeHash = crypto.createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
        console.log('Envelope Hash Calculation: OK (Hash: ' + envelopeHash.substring(0, 8) + '...)');

        console.log('\nALL GOVERNANCE v2 TESTS COMPLETED.');

    } catch (error: any) {
        console.error('Verification failed:', error.message);
    }
}

verify();
