import * as crypto from 'crypto';
import { db } from '../../adapters/database';
import { IdentityManager } from './identity_manager';

export class BootstrapService {
    /**
     * Bootstraps a workspace for a user idempotently.
     * Ensures Org, Member, Echo Upstream, and Key exist.
     */
    static async bootstrap(userId: string, userName: string, email: string) {
        return await db.raw.transaction(async () => {
            const now = Date.now();

            // 1. Organization & Membership
            const membershipRows = await db.raw.query(`
                SELECT tenant_id FROM tenant_members WHERE user_id = ? LIMIT 1
            `, [userId]);

            let tenantId: string;
            if (membershipRows.length > 0) {
                tenantId = membershipRows[0].tenant_id;
            } else {
                tenantId = `t_${crypto.randomBytes(4).toString('hex')}`;

                await db.raw.run(`
                    INSERT INTO tenants (tenant_id, name, owner_id, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [tenantId, `${userName}'s Workspace`, userId, 'active', now, now]);

                await db.raw.run(`
                    INSERT INTO tenant_members (tenant_id, user_id, role_id, status, joined_at)
                    VALUES (?, ?, ?, ?, ?)
                `, [tenantId, userId, 'role_admin', 'active', now]);

                console.log(`[BOOTSTRAP] Created Tenant: ${tenantId} for User: ${userId}`);
            }

            // 2. Default Echo Upstream
            const upstreams = await db.raw.query(`
                SELECT id FROM upstreams WHERE tenant_id = ? AND is_default = 1 LIMIT 1
            `, [tenantId]);

            if (upstreams.length === 0) {
                const upId = `up_echo_${crypto.randomBytes(4).toString('hex')}`;
                await db.raw.run(`
                    INSERT INTO upstreams (id, tenant_id, name, base_url, transport, auth_type, created_at, is_default)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [upId, tenantId, 'Echo Service', 'https://httpbin.org/post', 'http', 'none', now, 1]);
                console.log(`[BOOTSTRAP] Created Echo Upstream: ${upId} for Tenant: ${tenantId}`);
            }

            // 3. Default Deployment
            let deploymentId: string;
            const depRows = await db.raw.query(`
                SELECT id FROM deployments WHERE tenant_id = ? AND environment = 'prod' LIMIT 1
            `, [tenantId]);

            if (depRows.length > 0) {
                deploymentId = depRows[0].id;
            } else {
                deploymentId = `d_${crypto.randomBytes(4).toString('hex')}`;
                await db.raw.run(`
                    INSERT INTO deployments (id, tenant_id, name, environment, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `, [deploymentId, tenantId, 'Production Hub', 'prod', now]);
                console.log(`[BOOTSTRAP] Created Production Deployment: ${deploymentId}`);
            }

            // 4. Default Agent
            let agentId: string;
            const agentRows = await db.raw.query(`
                SELECT id FROM iam_agents WHERE tenant_id = ? LIMIT 1
            `, [tenantId]);

            if (agentRows.length > 0) {
                agentId = agentRows[0].id;
            } else {
                agentId = `ag_default_${crypto.randomBytes(4).toString('hex')}`;
                await db.raw.run(`
                    INSERT INTO iam_agents (id, tenant_id, name, role_id, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [agentId, tenantId, 'Autonomous Core', 'role_admin', 'Default system identity', now, now]);
                console.log(`[BOOTSTRAP] Created Default Agent: ${agentId}`);
            }

            // 5. API Key
            const keys = await db.raw.query(`
                SELECT key_id FROM iam_keys WHERE user_id = ? AND tenant_id = ? AND status = 'active'
            `, [userId, tenantId]);

            let rawKey: string | null = null;
            if (keys.length === 0) {
                rawKey = "sk_live_" + crypto.randomBytes(16).toString('hex');
                const keyHash = IdentityManager.hashKey(rawKey);
                const keyId = `key_${crypto.randomBytes(4).toString('hex')}`;

                await db.raw.run(`
                    INSERT INTO iam_keys (key_id, key_hash, user_id, tenant_id, deployment_id, agent_id, scopes, expires_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [keyId, keyHash, userId, tenantId, deploymentId, agentId, '*', now + (365 * 86400000), now]);
                console.log(`[BOOTSTRAP] Generated new API Key for User: ${userId} linked to Agent: ${agentId}`);
            }

            // 4. Default Budget
            await db.budgets.upsert({
                id: `tenant:${tenantId}`,
                scope_type: 'tenant',
                scope_id: tenantId,
                period: 'monthly',
                hard_limit: 100.0,
                soft_limit: 80.0,
                currency: 'EUR',
                active_from: now,
                active_to: null,
                created_at: now
            });

            return { tenantId, rawKey };
        });
    }
}
