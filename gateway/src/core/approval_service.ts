import { db } from '../adapters/database';
import * as crypto from 'crypto';

export class ApprovalService {
    static async createRequest(tenantId: string, envelopeHash: string, agentId: string | null) {
        const id = `apr_${crypto.randomBytes(4).toString('hex')}`;
        const now = Date.now();
        const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours expiry

        await db.raw.run(`
            INSERT INTO approval_requests (id, tenant_id, envelope_hash, agent_id, status, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, tenantId, envelopeHash, agentId, 'pending', expiresAt, now, now]);

        return id;
    }

    static async listPending(tenantId: string) {
        return await db.raw.query(`
            SELECT * FROM approval_requests 
            WHERE tenant_id = ? AND status = 'pending' 
            ORDER BY created_at DESC
        `, [tenantId]);
    }

    static async resolve(id: string, status: 'approved' | 'rejected', adminId: string) {
        await db.raw.run(`
            UPDATE approval_requests 
            SET status = ?, approved_by = ?, updated_at = ?
            WHERE id = ?
        `, [status, adminId, Date.now(), id]);
    }
}
