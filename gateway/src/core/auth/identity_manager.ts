import * as crypto from 'crypto';
import { db } from '../../adapters/database';

export type UserRole = 'admin' | 'viewer' | 'operator';

export interface Identity {
    userId: string;
    tenantId: string;
    deptId?: string;
    agentId?: string;
    role: string;
    scopes: string[];
    environment: 'dev' | 'staging' | 'prod';
}

export class IdentityManager {
    /**
     * Hashes a raw API key using a secure algorithm.
     */
    static hashKey(rawKey: string): string {
        return crypto.createHash('sha256').update(rawKey).digest('hex');
    }

    /**
     * Authenticates and returns identity from the robust IAM tables.
     */
    static async getIdentity(rawKey: string): Promise<Identity | null> {
        // 1. Enforce hashed lookup
        const keyHash = this.hashKey(rawKey);

        const keyRows = await db.raw.query(`
            SELECT k.*, d.environment as dep_env
            FROM iam_keys k
            LEFT JOIN deployments d ON k.deployment_id = d.id
            WHERE (k.key_hash = ? OR k.key_id = ?) AND k.status = 'active' AND k.expires_at > ?
        `, [keyHash, rawKey, Date.now()]);

        const keyRow = keyRows[0];
        if (!keyRow) return null;

        let roleId = 'role_viewer';
        let deptId = undefined;
        let agentId = keyRow.agent_id || undefined;
        let env: 'dev' | 'staging' | 'prod' = keyRow.dep_env || 'dev';

        if (agentId) {
            // Agent Path: Resolve identity from Agent entity
            const agentRows = await db.raw.query(`
                SELECT role_id, tenant_id FROM iam_agents WHERE id = ?
            `, [agentId]);
            const agent = agentRows[0];
            if (agent) {
                roleId = agent.role_id;
            }
        } else {
            // Human Path: Resolve identity from User membership
            const membershipRows = await db.raw.query(`
                SELECT role_id, dept_id FROM tenant_members
                WHERE tenant_id = ? AND user_id = ?
            `, [keyRow.tenant_id, keyRow.user_id]);
            const membership = membershipRows[0];
            if (membership) {
                roleId = membership.role_id;
                deptId = membership.dept_id;
            }
        }

        // Resolving human-readable role name and scopes
        const roles = await db.raw.query(`SELECT name FROM iam_roles WHERE role_id = ?`, [roleId]);
        const perms = await db.raw.query(`
            SELECT p.scope_name 
            FROM iam_permissions p
            JOIN iam_role_permissions rp ON p.perm_id = rp.perm_id
            WHERE rp.role_id = ?
        `, [roleId]);

        const roleName = roles.length > 0 ? roles[0].name.toLowerCase() : 'viewer';
        const scopes = Array.from(new Set([
            ...keyRow.scopes.split(','),
            ...perms.map(p => p.scope_name)
        ])).filter(s => s !== '');

        return {
            userId: keyRow.user_id,
            tenantId: keyRow.tenant_id,
            deptId: deptId || undefined,
            agentId: agentId,
            role: roleName,
            scopes: scopes.includes('*') ? ['*'] : scopes,
            environment: env
        };
    }

    /**
     * Checks if the identity has a required scope.
     */
    static hasScope(identity: Identity, requiredScope: string): boolean {
        if (identity.role === 'admin') return true;
        if (identity.scopes.includes('*')) return true;
        return identity.scopes.includes(requiredScope);
    }

    /**
     * Checks if the identity is a system-wide administrator.
     */
    static isGlobalAdmin(identity: Identity): boolean {
        return identity.tenantId === 'acme' && identity.role === 'admin';
    }
}
