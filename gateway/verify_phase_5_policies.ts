import { PolicyEngine } from './src/core/policy_engine';
import { db } from './src/adapters/database';
import { PolicyInput } from './src/core/contract';
import * as crypto from 'crypto';

async function verifyPolicies() {
    console.log('--- Phase 5: Unified Policy Engine Verification ---');
    const engine = new PolicyEngine();
    const tenantId = 't_enterprise_test';
    const now = Date.now();

    try {
        // 1. Setup Test Data
        await db.raw.run('INSERT OR IGNORE INTO tenants (tenant_id, name, owner_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, 'Enterprise Test Org', 'u_admin', 'active', now, now]);

        await db.raw.run('DELETE FROM iam_policies WHERE tenant_id = ?', [tenantId]);

        // Policy A: General Org-level ALLOW (Priority 10)
        await db.raw.run(`
            INSERT INTO iam_policies (id, tenant_id, scope_type, scope_id, priority, mode, conditions, effect, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['pol_org_allow', tenantId, 'tenant', tenantId, 10, 'enforce', JSON.stringify({}), 'allow', '1.0.0', now, now]);

        // Policy B: Specific Agent-level DENY for 'transfer' (Priority 100)
        await db.raw.run(`
            INSERT INTO iam_policies (id, tenant_id, scope_type, scope_id, priority, mode, conditions, effect, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['pol_agent_deny', tenantId, 'agent', 'ag_risky', 100, 'enforce', JSON.stringify({ tool_name: 'transfer_funds' }), 'deny', '1.0.0', now, now]);

        console.log('✅ Test Policies seeded');

        // 2. Test Cases
        const inputBase: PolicyInput = {
            tenant_id: tenantId,
            upstream_server_id: 'ups_bank',
            agent_id: 'ag_trusted',
            role: 'operator',
            tool_name: 'read_balance',
            args: {},
            timestamp: now,
            request_id: 'req_1',
            risk_class: 'low'
        };

        // Case 1: Trusted Agent -> Allowed by Org Policy
        const res1 = await engine.evaluate(inputBase);
        console.log('Case 1 (Trusted/Read):', res1.decision);
        if (res1.decision !== 'allow') throw new Error('Case 1 Failed: Expected allow');

        // Case 2: Risky Agent -> Denied by Agent Policy for 'transfer_funds'
        const res2 = await engine.evaluate({
            ...inputBase,
            agent_id: 'ag_risky',
            tool_name: 'transfer_funds'
        });
        console.log('Case 2 (Risky/Transfer):', res2.decision);
        if (res2.decision !== 'deny') throw new Error('Case 2 Failed: Expected deny');

        // Case 3: Risky Agent -> Allowed for 'read_balance' (No specific deny for this tool)
        const res3 = await engine.evaluate({
            ...inputBase,
            agent_id: 'ag_risky',
            tool_name: 'read_balance'
        });
        console.log('Case 3 (Risky/Read):', res3.decision);
        if (res3.decision !== 'allow') throw new Error('Case 3 Failed: Expected allow (Defaulting to Org-level ALLOW)');

        console.log('\n✅ ALL POLICY ENGINE TESTS PASSED');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

verifyPolicies();
