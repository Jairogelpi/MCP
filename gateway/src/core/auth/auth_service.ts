import * as crypto from 'crypto';
import { db } from '../../adapters/database';
import { IdentityManager } from './identity_manager';

export interface UserAuthResult {
    success: boolean;
    token?: string;
    userId?: string;
    tenantId?: string;
    role?: string;
    error?: string;
}

export class AuthService {
    /**
     * Hashes password using a simple SHA-256 for this gateway demo.
     * In a full production environment, bcrypt/argon2 should be used.
     */
    static hashPassword(password: string): string {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    /**
     * Registers a new user and assigns them a default 'admin' role in their own personal organization.
     */
    static async register(email: string, name: string, password: string): Promise<UserAuthResult> {
        return await db.raw.transaction(async () => {
            try {
                const passwordHash = this.hashPassword(password);
                const userId = `u_${crypto.randomBytes(4).toString('hex')}`;

                // Create User
                await db.raw.run(`
                    INSERT INTO iam_users (user_id, name, email, password_hash, status)
                    VALUES (?, ?, ?, ?, ?)
                `, [userId, name, email, passwordHash, 'active']);

                // Create default "Personal Organization"
                const tenantId = `t_${crypto.randomBytes(4).toString('hex')}`;
                const now = Date.now();
                await db.raw.run(`
                    INSERT INTO tenants (tenant_id, name, owner_id, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [tenantId, `${name}'s Org`, userId, 'active', now, now]);

                // Add user as admin member of their own organization
                await db.raw.run(`
                    INSERT INTO tenant_members (tenant_id, user_id, role_id, status, joined_at)
                    VALUES (?, ?, ?, ?, ?)
                `, [tenantId, userId, 'role_admin', 'active', now]);

                // Assign Global Role (for broader system access if needed)
                await db.raw.run(`
                    INSERT INTO iam_user_roles (user_id, role_id)
                    VALUES (?, ?)
                `, [userId, 'role_admin']);

                // Create a default API key for this user scoped to their new organization
                const apiKey = `mcp_${crypto.randomBytes(16).toString('hex')}`;
                const keyHash = IdentityManager.hashKey(apiKey);
                const keyId = `key_${crypto.randomBytes(4).toString('hex')}`;

                await db.raw.run(`
                    INSERT INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, expires_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [keyId, keyHash, userId, tenantId, '*', now + (365 * 86400000), now]);

                // Create default budget for the organization (Phase 1)
                const budgetId = `tenant:${tenantId}`;
                await db.budgets.upsert({
                    id: budgetId,
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

                return { success: true, userId, tenantId, token: apiKey, role: 'admin' };

            } catch (error: any) {
                console.error('[AuthService] Registration error:', error.message);
                if (error.message.includes('UNIQUE')) {
                    throw new Error('EMAIL_ALREADY_EXISTS');
                }
                throw new Error('REGISTRATION_FAILED');
            }
        });
    }

    /**
     * Authenticates a user and returns their primary API key (as a token).
     */
    static async login(email: string, password: string): Promise<UserAuthResult> {
        try {
            const passwordHash = this.hashPassword(password);

            const userRows = await db.raw.query(`
                SELECT * FROM iam_users WHERE email = ? AND password_hash = ? AND status = 'active'
            `, [email, passwordHash]);

            const user = userRows[0];
            if (!user) {
                return { success: false, error: 'INVALID_CREDENTIALS' };
            }

            // Fetch primary tenant and role
            const membershipRows = await db.raw.query(`
                SELECT tenant_id, role_id FROM tenant_members WHERE user_id = ? LIMIT 1
            `, [user.user_id]);

            const membership = membershipRows[0];
            const roleId = membership?.role_id || 'role_viewer';
            const role = roleId === 'role_admin' ? 'admin' : 'viewer';
            const tenantId = membership?.tenant_id || '';

            // Get API key for this user/tenant
            const keyRows = await db.raw.query(`
                SELECT key_id FROM iam_keys WHERE user_id = ? AND tenant_id = ? AND status = 'active' LIMIT 1
            `, [user.user_id, tenantId]);
            // For the demo, we use a static token or the key_id as token if raw key is not available
            const token = keyRows[0]?.key_id || 'mcp_demo_token';

            return {
                success: true,
                userId: user.user_id,
                tenantId: tenantId,
                role: role,
                token: token
            };

        } catch (error: any) {
            console.error('[AuthService] Login error:', error.message);
            return { success: false, error: 'LOGIN_FAILED' };
        }
    }
}
