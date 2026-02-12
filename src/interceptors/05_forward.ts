import { Interceptor } from '../core/pipeline';

export const forward: Interceptor = async (ctx) => {
    console.log('[5] Forward to Upstream');

    const envelope = ctx.stepResults.normalized;
    if (!envelope) return;

    // MVP: Mock Upstream Call using envelope details
    console.log(`[FORWARD] Calling ${envelope.meta.targetServer} -> ${envelope.action}`);

    await new Promise(resolve => setTimeout(resolve, 50)); // Simulated latency

    ctx.stepResults.upstream = {
        result: { status: 'executed', data: `Result for ${envelope.action}` },
        upstreamLatency: 50
    };
};
