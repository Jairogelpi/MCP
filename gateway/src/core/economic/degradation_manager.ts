import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface DegradationRule {
    id: string;
    condition: {
        trigger: 'soft_limit' | 'high_cost';
        threshold?: number;
        provider?: string;
        model?: string;
    };
    action: {
        type: 'degrade' | 'require_approval';
        target_model?: string;
    };
}

export interface DegradationConfig {
    version: string;
    rules: DegradationRule[];
}

export interface DegradationPlan {
    action: 'degrade' | 'require_approval' | 'none';
    patch?: {
        model?: string;
        [key: string]: any;
    };
    reason?: string;
}

export class DegradationManager {
    private static instance: DegradationManager;
    private config: DegradationConfig | null = null;
    private readonly CONFIG_PATH = path.join(__dirname, '../../../config/degrade_rules.yaml');

    private constructor() {
        this.loadConfig();
    }

    public static getInstance(): DegradationManager {
        if (!DegradationManager.instance) {
            DegradationManager.instance = new DegradationManager();
        }
        return DegradationManager.instance;
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.CONFIG_PATH)) {
                const content = fs.readFileSync(this.CONFIG_PATH, 'utf8');
                this.config = yaml.load(content) as DegradationConfig;
                console.log(`[DEGRADE] Loaded ${this.config.rules.length} rules.`);
            } else {
                console.warn(`[DEGRADE] Config not found at ${this.CONFIG_PATH}`);
            }
        } catch (err) {
            console.error('[DEGRADE] Failed to load config:', err);
        }
    }

    public evaluate(context: {
        isSoftLimit: boolean;
        estimatedCost: number;
        provider: string;
        model?: string;
    }): DegradationPlan {
        if (!this.config) return { action: 'none' };

        for (const rule of this.config.rules) {
            // Check Trigger
            if (rule.condition.trigger === 'soft_limit' && !context.isSoftLimit) continue;
            if (rule.condition.trigger === 'high_cost') {
                if (!rule.condition.threshold || context.estimatedCost <= rule.condition.threshold) continue;
            }

            // Check Metadata Match (Provider/Model)
            if (rule.condition.provider && rule.condition.provider !== context.provider) continue;
            if (rule.condition.model && rule.condition.model !== context.model) continue;

            // Match Found!
            if (rule.action.type === 'require_approval') {
                return {
                    action: 'require_approval',
                    reason: `Rule ${rule.id} triggered (High Cost or Limit)`
                };
            }

            if (rule.action.type === 'degrade') {
                // If attempting to degrade, ensure we have a target
                if (rule.action.target_model) {
                    return {
                        action: 'degrade',
                        patch: { model: rule.action.target_model },
                        reason: `Rule ${rule.id}: Downgrading ${context.model} -> ${rule.action.target_model}`
                    };
                }
            }
        }

        return { action: 'none' };
    }
}
