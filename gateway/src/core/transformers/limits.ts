import { ActionEnvelope, PolicyReasonCodes } from '../contract';

export class LimitsTransformer {
    static async apply(envelope: ActionEnvelope, limits: Record<string, any>): Promise<void> {
        if (!envelope.parameters) return;

        for (const [key, limit] of Object.entries(limits)) {
            const currentVal = envelope.parameters[key];

            // Only apply if limit is a number and current value is a number
            if (typeof limit === 'number' && typeof currentVal === 'number') {
                if (currentVal > limit) {
                    console.log(`[LIMITS] Clamping ${key}: ${currentVal} -> ${limit}`);
                    envelope.parameters[key] = limit;
                }
            }
            // Should we force match non-numeric args? 
            // e.g. "model": "gpt-4o"
            else if (limit !== undefined) {
                // Exact match enforcement / Override
                envelope.parameters[key] = limit;
            }
        }
    }
}
