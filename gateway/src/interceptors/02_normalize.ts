import { Interceptor } from '../core/pipeline';
import { ActionEnvelope } from '../core/contract';
import { randomUUID } from 'crypto';

export const normalize: Interceptor = async (ctx) => {
    console.log('[2] Normalize');
    const raw = ctx.stepResults.raw;
    const routeParams = raw._routeParams; // Injected in server.ts

    // Construct Protocol v0.1.0 Envelope
    const envelope: ActionEnvelope = {
        id: ctx.request.id || randomUUID(),
        version: '0.1.0',
        type: raw.type || 'command', // Default to command if unspecified
        action: raw.action || 'unknown',
        parameters: raw.parameters || {},
        meta: {
            timestamp: Date.now(),
            source: ctx.request.ip,
            tenant: routeParams.tenant,
            targetServer: routeParams.server,
            // authContext populated later or here if we moved Auth to step 1
        }
    };

    ctx.stepResults.normalized = envelope;
};
