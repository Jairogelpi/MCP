import { Interceptor } from '../core/pipeline';
import { PipelineContext } from '../core/contract';

const WINDOW_MS = 60 * 1000; // 1 minute window
const limits = new Map<string, { count: number, resetAt: number }>();

/**
 * Interceptor 02c: Rate Limiting
 * Enforces hierarchical limits: Tenant > Agent > Tool.
 */
export const rateLimit: Interceptor = async (context: PipelineContext) => {
    const identity = context.identity;
    if (!identity) {
        console.log('[RATE-LIMIT] No identity found in context.');
        return;
    }

    const tenant = identity.tenantId;
    const agent = identity.userId;
    const envelope = context.stepResults.normalized;
    const tool = envelope?.action || 'unknown';

    console.log(`[RATE-LIMIT] Checking for ${agent} on ${tool}...`);

    const now = Date.now();

    // Limit Config (MVP: Hardcoded. Real world: Load from policy/DB)
    const configurations = [
        { key: `tenant:${tenant}`, limit: 100 },
        { key: `agent:${tenant}:${agent}`, limit: 10 },
        { key: `tool:${tenant}:${tool}`, limit: 50 }
    ];

    for (const cfg of configurations) {
        let bucket = limits.get(cfg.key);

        if (!bucket || now > bucket.resetAt) {
            bucket = { count: 0, resetAt: now + WINDOW_MS };
        }

        bucket.count++;
        // Immediately set the incremented count
        limits.set(cfg.key, bucket);

        if (bucket.count > cfg.limit) {
            const { logger } = require('../core/logger');
            logger.warn('rate_limit_exceeded', {
                key: cfg.key,
                tenant_id: tenant,
                agent_id: agent,
                limit: cfg.limit
            });

            throw new Error(`RATE_LIMIT_EXCEEDED:${cfg.key.split(':')[0].toUpperCase()}`);
        }
    }

    return;
};
