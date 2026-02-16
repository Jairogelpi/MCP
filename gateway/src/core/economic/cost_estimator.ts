import { PricingManager } from './pricing_manager';

export interface CostEstimation {
    estimated_tokens_in: number;
    estimated_tokens_out: number;
    estimated_cost: number;
    currency: string;
}

export class CostEstimator {
    private static instance: CostEstimator;
    private pricing = PricingManager.getInstance();

    private constructor() { }

    public static getInstance(): CostEstimator {
        if (!CostEstimator.instance) {
            CostEstimator.instance = new CostEstimator();
        }
        return CostEstimator.instance;
    }

    public estimate(
        context: { provider: string; model?: string; endpoint?: string; tier?: string; estimated_tokens_out?: number },
        args: any
    ): CostEstimation {
        // 1. Calculate Tokens (Deterministic Heuristic)
        const jsonArgs = JSON.stringify(args || {});
        const estimated_tokens_in = jsonArgs.length > 0 ? Math.ceil(jsonArgs.length / 4) : 0;

        // Use provided output estimate or fallback to 500
        const estimated_tokens_out = context.estimated_tokens_out || 500;

        // 2. Get Rate
        const rate = this.pricing.getPrice(context);
        const currency = this.pricing.getCurrency();

        let estimated_cost = 0;

        if (rate) {
            const inputPrice = rate.input_price || 0;
            const outputPrice = rate.output_price || 0;
            const flatFee = rate.flat_fee || 0;

            const costIn = (estimated_tokens_in / 1000) * inputPrice;
            const costOut = (estimated_tokens_out / 1000) * outputPrice;
            estimated_cost = costIn + costOut + flatFee;

            if (isNaN(estimated_cost)) estimated_cost = 0;
        } else {
            console.warn(`[ESTIMATOR] FAIL-SAFE: No pricing found for ${context.provider}:${context.model}:${context.endpoint}`);
            // Fail-safe: Signal missing price with -1
            return {
                estimated_tokens_in,
                estimated_tokens_out,
                estimated_cost: -1,
                currency
            };
        }

        return {
            estimated_tokens_in,
            estimated_tokens_out,
            estimated_cost,
            currency
        };
    }

    public calculateRealCost(
        context: { provider: string; model?: string; endpoint?: string; tier?: string },
        usage: { input_tokens: number; output_tokens: number }
    ): number {
        const rate = this.pricing.getPrice(context);
        if (!rate) return -1;

        const costIn = (usage.input_tokens / 1000) * rate.input_price;
        const costOut = (usage.output_tokens / 1000) * rate.output_price;
        return costIn + costOut + rate.flat_fee;
    }
}
