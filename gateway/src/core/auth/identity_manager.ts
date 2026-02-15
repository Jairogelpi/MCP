import * as crypto from 'crypto';
import { db } from '../../adapters/database';

export type UserRole = 'admin' | 'viewer' | 'operator';

export interface Identity {
    userId: string;
    tenantId: string;
    role: string;
    scopes: string[];
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
        // Enforce hashed lookup
        const keyHash = this.hashKey(rawKey);

        const keyRows = await db.raw.query(`
            SELECT k.*, u.name as user_name 
            FROM iam_keys k
            JOIN iam_users u ON k.user_id = u.user_id
            WHERE k.key_hash = ? AND k.status = 'active' AND k.expires_at > ?
        `, [keyHash, Date.now()]);

        const keyRow = keyRows[0];

        if (!keyRow) return null;

        // Fetch roles for the user
        const roles = await db.raw.query(`
            SELECT r.name 
            FROM iam_roles r
            JOIN iam_user_roles ur ON r.role_id = ur.role_id
            WHERE ur.user_id = ?
        `, [keyRow.user_id]);

        // Fetch permissions (scopes) for the roles
        const perms = await db.raw.query(`
            SELECT p.scope_name 
            FROM iam_permissions p
            JOIN iam_role_permissions rp ON p.perm_id = rp.perm_id
            JOIN iam_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `, [keyRow.user_id]);

        const role = roles.length > 0 ? roles[0].name : 'viewer';
        const scopes = Array.from(new Set([
            ...keyRow.scopes.split(','),
            ...perms.map(p => p.scope_name)
        ])).filter(s => s !== '');

        return {
            userId: keyRow.user_id,
            tenantId: keyRow.tenant_id,
            role: role,
            scopes: scopes.includes('*') ? ['*'] : scopes
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
}
