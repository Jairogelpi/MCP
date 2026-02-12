import { ActionEnvelope, PolicyDecision, PolicyRule } from './contract';

export class PolicyEngine {
    private rules: PolicyRule[] = [];

    constructor(initialRules: PolicyRule[] = []) {
        this.rules = initialRules;
    }

    public addRule(rule: PolicyRule) {
        this.rules.push(rule);
        this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    public evaluate(envelope: ActionEnvelope): PolicyDecision {
        const { tenant, targetServer } = envelope.meta;
        const { action } = envelope;

        const matched = this.rules.filter(rule => {
            const matchTenant = !rule.target.tenant || rule.target.tenant === '*' || rule.target.tenant === tenant;
            const matchServer = !rule.target.server || rule.target.server === '*' || rule.target.server === targetServer;
            const matchAction = !rule.target.action || rule.target.action === '*' || rule.target.action === action;
            return matchTenant && matchServer && matchAction;
        });

        if (matched.length === 0) {
            return { allow: true, reason: 'DEFAULT_ALLOW' };
        }

        const rule = matched[0];

        if (rule.effect === 'deny') {
            return {
                allow: false,
                reason: `DENIED_BY_RULE: ${rule.id}`,
                matchedRuleId: rule.id
            };
        }

        if (rule.effect === 'transform' && rule.transform) {
            try {
                const transformedEnvelope = this.applyTransformations(envelope, rule.transform);
                return {
                    allow: true,
                    reason: `TRANSFORMED_BY_RULE: ${rule.id}`,
                    transform: transformedEnvelope,
                    matchedRuleId: rule.id
                };
            } catch (err) {
                // Transformation failed (e.g. Egress Check)
                return {
                    allow: false,
                    reason: `POLICY_VIOLATION: ${(err as Error).message}`,
                    matchedRuleId: rule.id
                };
            }
        }

        return {
            allow: true,
            reason: `ALLOWED_BY_RULE: ${rule.id}`,
            matchedRuleId: rule.id
        };
    }

    private applyTransformations(envelope: ActionEnvelope, transform: NonNullable<PolicyRule['transform']>): ActionEnvelope {
        const clone = JSON.parse(JSON.stringify(envelope));

        if (transform.forceArgs) {
            clone.parameters = { ...clone.parameters, ...transform.forceArgs };
        }

        if (transform.redactPII) {
            for (const field of transform.redactPII) {
                if (clone.parameters[field] && typeof clone.parameters[field] === 'string') {
                    clone.parameters[field] = '***REDACTED***';
                }
            }
        }

        if (transform.checkEgress) {
            this.validateEgress(clone.parameters, transform.checkEgress);
        }

        return clone;
    }

    // Recursive validation
    private validateEgress(obj: any, options: { allowList?: string[], blockPrivate?: boolean }) {
        if (typeof obj === 'string') {
            // Basic URL detection
            if (obj.startsWith('http://') || obj.startsWith('https://')) {
                this.checkUrl(obj, options);
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                this.validateEgress(obj[key], options);
            }
        }
    }

    private checkUrl(urlString: string, options: { allowList?: string[], blockPrivate?: boolean }) {
        let hostname = '';
        try {
            const u = new URL(urlString);
            hostname = u.hostname;
        } catch {
            return; // Not a valid URL, ignore
        }

        if (options.blockPrivate) {
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' ||
                hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')) {
                throw new Error(`SSRF Block: Private access to ${hostname} is denied`);
            }
        }

        if (options.allowList && options.allowList.length > 0) {
            const allowed = options.allowList.some(domain => hostname === domain || hostname.endsWith('.' + domain));
            if (!allowed) {
                throw new Error(`Egress Block: Domain ${hostname} is not allowed`);
            }
        }
    }
}
