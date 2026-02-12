import { db } from '../../adapters/database';

export class RateLimitManager {
    private static instance: RateLimitManager;

    private constructor() { }

    public static getInstance(): RateLimitManager {
        if (!RateLimitManager.instance) {
            RateLimitManager.instance = new RateLimitManager();
        }
        return RateLimitManager.instance;
    }

    // MVP Limits Configuration
    // In real world, load from config/DB per tenant/agent
    private readonly LIMITS = {
        // Tokens per Minute
        'tokens_min': { limit: 1000, window: 60 * 1000 },
        // Cost per Hour (EUR) - Increased for E2E testing
        'cost_hour': { limit: 1000.0, window: 60 * 60 * 1000 }
    };

    public checkLimits(context: { agentId: string; tenantId: string }, usage: { tokens: number; cost: number }): boolean {
        // 1. Check Agent Token Limit
        const tokenKey = `agent:${context.agentId}:tokens_min`;
        const tokenAllowed = db.rates.checkAndIncrement(
            tokenKey,
            usage.tokens,
            this.LIMITS.tokens_min.limit,
            this.LIMITS.tokens_min.window
        );
        if (!tokenAllowed) {
            console.warn(`[RATE] Token Limit Exceeded for ${context.agentId} (${usage.tokens} tokens)`);
            return false;
        }

        // 2. Check Tenant Cost Limit (Hourly Throttling)
        const costKey = `tenant:${context.tenantId}:cost_hour`;
        const costAllowed = db.rates.checkAndIncrement(
            costKey,
            usage.cost,
            this.LIMITS.cost_hour.limit,
            this.LIMITS.cost_hour.window
        );
        if (!costAllowed) {
            console.warn(`[RATE] Hourly Cost Limit Exceeded for ${context.tenantId} (${usage.cost} EUR)`);
            return false;
        }

        return true;
    }
}
