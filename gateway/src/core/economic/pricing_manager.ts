import { db } from '../../adapters/database';

export interface PricingRate {
    provider: string;
    model: string;
    endpoint: string;
    tier: string;
    input_price: number;
    output_price: number;
    flat_fee: number;
    currency: string;
}

export class PricingManager {
    private static instance: PricingManager;

    private constructor() { }

    public static getInstance(): PricingManager {
        if (!PricingManager.instance) {
            PricingManager.instance = new PricingManager();
        }
        return PricingManager.instance;
    }

    public getPrice(context: { provider: string; model?: string; endpoint?: string; tier?: string; region?: string }): PricingRate | undefined {
        const rate = db.pricing.findActive({
            provider: context.provider,
            model: context.model || '*',
            endpoint: context.endpoint || '*',
            region: context.region || 'global',
            tier: context.tier || 'standard'
        }) as any; // Cast to any to access properties from SQLite row

        if (!rate) return undefined;

        return {
            provider: rate.provider,
            model: rate.model,
            endpoint: rate.endpoint,
            tier: rate.tier,
            input_price: rate.input_price,
            output_price: rate.output_price,
            flat_fee: rate.flat_fee,
            currency: 'EUR' // Schema assumes EUR for now
        };
    }

    /**
     * Resolves the real-world pricing context (provider, model, tier) for a tool name.
     * Eliminates hardcoded tool mappings.
     */
    public async resolveContext(toolName: string): Promise<{ provider: string; model: string; tier: string; estimated_tokens_out: number }> {
        const rows = await db.raw.query(`
            SELECT * FROM tool_settings 
            WHERE tool_name = ? OR tool_name = '*' 
            ORDER BY (CASE WHEN tool_name = ? THEN 1 ELSE 0 END) DESC 
            LIMIT 1
        `, [toolName, toolName]);

        const setting = rows[0];
        if (!setting) {
            return { provider: 'internal', model: '*', tier: 'standard', estimated_tokens_out: 500 };
        }

        return {
            provider: setting.provider,
            model: setting.model,
            tier: setting.tier,
            estimated_tokens_out: setting.estimated_tokens_out
        };
    }

    public getCurrency(): string {
        return 'EUR';
    }
}
