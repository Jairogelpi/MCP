import { Interceptor } from '../core/pipeline';

export const telemetry: Interceptor = async (ctx) => {
    console.log('[8] Telemetry Emit');
    console.log(`[TELEMETRY] Request ${ctx.request.id} finished in ${Date.now() - (ctx.stepResults.normalized?.meta.timestamp || 0)}ms`);
};
