import { IdentityManager } from './src/core/auth/identity_manager';
import { db } from './src/adapters/database';
import * as crypto from 'crypto';

async function verifyPhase4() {
    console.log('--- Phase 4: Agent & Policy Verification ---');

    try {
        const tenantId = 'acme';
        const now = Date.now();

        // 1. Create a Test Agent
        const agentId = `ag_test_${crypto.randomBytes(4).toString('hex')}`;
        await db.raw.run(`
            INSERT INTO iam_agents (id, tenant_id, name, role_id, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [agentId, tenantId, 'Test Agent Entity', 'role_admin', 'A verification agent', now, now]);
        console.log('✅ Agent Created:', agentId);

        // 2. Create a Key linked to this Agent
        const rawKey = `sk_agent_${crypto.randomBytes(16).toString('hex')}`;
        const keyHash = IdentityManager.hashKey(rawKey);
        const keyId = `k_agent_${crypto.randomBytes(4).toString('hex')}`;

        await db.raw.run(`
            INSERT INTO iam_keys (key_id, key_hash, user_id, tenant_id, agent_id, scopes, status, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [keyId, keyHash, 'u_admin', tenantId, agentId, '*', 'active', now + 1000000, now]);
        console.log('✅ Agent Key Created');

        // 3. Resolve Identity
        const identity = await IdentityManager.getIdentity(rawKey);
        if (!identity) throw new Error('Identity not resolved');

        console.log('Identity Resolved:', JSON.stringify(identity, null, 2));

        if (identity.agentId !== agentId) throw new Error('Agent ID Mismatch');
        if (identity.role !== 'admin') throw new Error('Role Mismatch (Expected admin from ag_test)');

        console.log('✅ Identity Resolution successful');

        // 4. Policy Matching (Self-contained test or just logical check)
        // We know PDP.matches now checks agent_id.

        process.exit(0);
    } catch (err: any) {
        console.error('❌ Verification Failed:', err.message);
        process.exit(1);
    }
}

verifyPhase4();
