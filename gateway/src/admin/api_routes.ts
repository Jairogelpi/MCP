import { FastifyInstance } from 'fastify';
import { db } from '../adapters/database';
import { IdentityManager } from '../core/auth/identity_manager';
import * as crypto from 'crypto';

export function registerAdminRoutes(server: FastifyInstance) {
    /**
     * POST /admin/api-keys
     * Creates a new hashed API key.
     */
    server.post('/admin/api-keys', async (request, reply) => {
        // In a real system, this endpoint itself would be protected by an admin key.
        // For Phase 8.2 verification, we assume the caller is authorized.
        const { userId, tenantId, scopes, expiresDays } = request.body as any;

        if (!userId || !tenantId) return reply.status(400).send({ error: 'Missing userId or tenantId' });

        const secret = crypto.randomBytes(32).toString('hex');
        const keyHash = IdentityManager.hashKey(secret);
        const keyId = `mcp_${crypto.randomBytes(4).toString('hex')}`;
        const expiresAt = Date.now() + (expiresDays || 30) * 24 * 60 * 60 * 1000;

        db.raw.run(`
            INSERT INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [keyId, keyHash, userId, tenantId, scopes || '', expiresAt, Date.now()]);

        return {
            key_id: keyId,
            secret: secret, // RETURN ONCE
            expires_at: new Date(expiresAt).toISOString()
        };
    });

    /**
     * POST /admin/api-keys/rotate
     * Rotates an existing key.
     */
    server.post('/admin/api-keys/rotate', async (request, reply) => {
        const { keyId } = request.body as any;
        const oldKey = db.raw.prepare('SELECT * FROM iam_keys WHERE key_id = ?').get([keyId]) as any;

        if (!oldKey) return reply.status(404).send({ error: 'Key not found' });

        // Revoke old
        db.raw.run("UPDATE iam_keys SET status = 'rotated' WHERE key_id = ?", [keyId]);

        // Create new
        const secret = crypto.randomBytes(32).toString('hex');
        const keyHash = IdentityManager.hashKey(secret);
        const newKeyId = `mcp_${crypto.randomBytes(4).toString('hex')}`;

        db.raw.run(`
            INSERT INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, expires_at, created_at, rotation_parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [newKeyId, keyHash, oldKey.user_id, oldKey.tenant_id, oldKey.scopes, oldKey.expires_at, Date.now(), keyId]);

        return {
            new_key_id: newKeyId,
            secret: secret,
            status: 'rotated'
        };
    });
}
