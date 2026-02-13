import { Interceptor } from '../core/pipeline';
import { CostEstimator } from '../core/economic/cost_estimator';

export const capture: Interceptor = async (ctx) => {
    console.log('[6] Capture Response');

    if (!ctx.stepResults.upstream) {
        throw new Error('No upstream response captured');
    }

    const body = ctx.stepResults.upstream.body;
    const econ = ctx.stepResults.economic;

    if (body?.result?.usage && econ) {
        const usage = body.result.usage;
        console.log(`[6] Detected Usage: IN=${usage.input_tokens}, OUT=${usage.output_tokens}`);

        const realCost = CostEstimator.getInstance().calculateRealCost({
            provider: 'unknown', // Ideally from upstream metadata
            model: econ.model,
            endpoint: econ.endpoint
        }, usage);

        if (realCost >= 0) {
            econ.real_cost = realCost;
            console.log(`[6] Calculated Real Cost: ${realCost} EUR (Estimation was ${econ.cost})`);
        }
    }
};
