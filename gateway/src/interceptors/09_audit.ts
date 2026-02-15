import * as crypto from 'crypto';
import { Interceptor } from '../core/pipeline';
import { db } from '../adapters/database';

/**
 * Interceptor 09: Final Auditing
 * Records the outcome of every request in the append-only audit log.
 */
export const audit: Interceptor = async (ctx) => {
    const identity = ctx.identity || { userId: 'anonymous', tenantId: 'unknown' };
    const normalized = ctx.stepResults.normalized;
    const error = ctx.stepResults.error;

    const eventId = `audit_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = Date.now();

    const auditEntry = {
        event_id: eventId,
        tenant_id: identity.tenantId,
        actor_id: identity.userId,
        action: normalized?.action || 'unknown',
        resource_type: 'tool',
        resource_id: normalized?.action,
        status: error ? 'failure' : 'success',
        payload: JSON.stringify({
            request_id: normalized?.meta?.request_id,
            error: error ? { code: error.code, message: error.message } : null,
            cost_estimated: (ctx.stepResults as any).settlement?.amount_settled || 0
        }),
        created_at: timestamp
    };

    try {
        db.raw.run(`
            INSERT INTO audit_events (event_id, tenant_id, actor_id, action, resource_type, resource_id, status, payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            auditEntry.event_id,
            auditEntry.tenant_id,
            auditEntry.actor_id,
            auditEntry.action,
            auditEntry.resource_type,
            auditEntry.resource_id,
            auditEntry.status,
            auditEntry.payload,
            auditEntry.created_at
        ]);
    } catch (err) {
        console.error('[AUDIT] Failed to record audit event:', err);
    }

    return;
};
