import { Interceptor } from '../core/pipeline';

export const capture: Interceptor = async (ctx) => {
    console.log('[6] Capture Response');

    if (!ctx.stepResults.upstream) {
        throw new Error('No upstream response captured');
    }

    // Logic to process/transform upstream response could go here
};
