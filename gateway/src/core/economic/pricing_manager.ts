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

    public getCurrency(): string {
        return 'EUR';
    }
}
