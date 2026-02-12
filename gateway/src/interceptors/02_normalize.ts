import { Interceptor } from '../core/pipeline';
import { ActionEnvelope } from '../core/contract';
import { randomUUID } from 'crypto';

export const normalize: Interceptor = async (ctx) => {
    console.log('[2] Normalize');
    const raw = ctx.stepResults.raw;
    const routeMeta = raw._routeMeta || {};
    const authContext = raw._authContext || {};

    // Construct Protocol v0.1.0 Envelope
    const envelope: ActionEnvelope = {
        id: ctx.request.id || randomUUID(),
        version: '0.1.0',
        type: raw.type || 'command',
        action: raw.action || 'unknown',
        parameters: raw.parameters || {},
        meta: {
            timestamp: Date.now(),
            source: (ctx.request.ip) || 'unknown',
            tenant: routeMeta.tenant || 'unknown',
            targetServer: routeMeta.server || 'unknown',
            authContext: authContext // Map auth context
        }
    };

    ctx.stepResults.normalized = envelope;
};
