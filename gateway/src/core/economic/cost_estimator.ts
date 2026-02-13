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
        context: { provider: string; model?: string; endpoint?: string; tier?: string },
        args: any
    ): CostEstimation {
        // 1. Calculate Tokens (Deterministic Heuristic)
        // Heuristic: 1 token ~= 4 chars (English)
        // Serialize args deterministically/stably if possible, but JSON.stringify is "good enough" for MVP if keys order doesn't vary wildly.
        const jsonArgs = JSON.stringify(args || {});
        // Using Math.ceil to ensure at least 1 token if non-empty
        const estimated_tokens_in = jsonArgs.length > 0 ? Math.ceil(jsonArgs.length / 4) : 0;

        // Output heuristic: Assume 500 tokens output for avg tool response unless specified otherwise
        const estimated_tokens_out = 500;

        // 2. Get Rate
        const rate = this.pricing.getPrice(context);
        const currency = this.pricing.getCurrency();

        let estimated_cost = 0;

        if (rate) {
            const costIn = (estimated_tokens_in / 1000) * rate.input_price;
            const costOut = (estimated_tokens_out / 1000) * rate.output_price;
            estimated_cost = costIn + costOut + rate.flat_fee;
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
