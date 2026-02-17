import {
    PolicyInput,
    PolicyDecision,
    PolicyRuleset,
    ABACRule,
    PolicyReasonCodes
} from './contract';

export class PDP {
    /**
     * Evaluate the input against the provided ruleset.
     * Returns the decision based on the highest priority matching rule.
     */
    evaluate(input: PolicyInput, ruleset: PolicyRuleset): PolicyDecision {
        const rules = ruleset.rules.sort((a, b) => b.priority - a.priority);

        let matchedRule: ABACRule | undefined;

        // Find first matching rule
        for (const rule of rules) {
            if (this.matches(rule, input)) {
                matchedRule = rule;
                break; // Highest priority wins
            }
        }

        if (!matchedRule) {
            // Default Deny if no rule matches
            return {
                decision: 'deny',
                reason_codes: [PolicyReasonCodes.DEFAULT_DENY],
                matchedRuleId: 'default'
            };
        }

        const reasonCode = this.getReasonCode(matchedRule);

        return {
            decision: matchedRule.effect,
            reason_codes: [reasonCode],
            matchedRuleId: matchedRule.id,
            transform_patch: matchedRule.transform ? {
                parameters: matchedRule.transform.forceArgs,
                _policy_transform: matchedRule.transform
            } : undefined
        };
    }

    private matches(rule: ABACRule, input: PolicyInput): boolean {
        const when = rule.when;

        // 1. Tool Name
        if (when.tool_name) {
            if (typeof when.tool_name === 'string') {
                if (when.tool_name !== input.tool_name) return false;
            } else if (when.tool_name.pattern) {
                // Regex or Glob? simple 'includes' for now
                if (!input.tool_name.includes(when.tool_name.pattern)) return false;
            }
        }

        // 2. Role (Agent Role match)
        if (when.role && when.role.length > 0) {
            if (!input.role || !when.role.includes(input.role)) return false;
        }

        // 2.1 Agent ID (Phase 4)
        if (when.agent_id && when.agent_id.length > 0) {
            if (!input.agent_id || !when.agent_id.includes(input.agent_id)) return false;
        }

        // 3. Risk Class
        if (when.risk_class) {
            if (input.risk_class !== when.risk_class) return false;
        }

        // 4. Project ID (Phase 2.3)
        if (when.project_id && when.project_id.length > 0) {
            if (!input.project_id || !when.project_id.includes(input.project_id)) return false;
        }

        // 5. Environment (Phase 2.3)
        if (when.environment && when.environment.length > 0) {
            // If input env is missing, it's considered specific enough to NOT match a rule demanding an env.
            // Or maybe default to 'prod'? Let's be strict.
            if (!input.environment || !when.environment.includes(input.environment)) return false;
        }

        // 6. Time Restricted
        if (when.time_restricted) {
            const now = new Date(input.timestamp);
            const currentHHMM = now.toISOString().split('T')[1].substring(0, 5); // HH:MM
            const start = when.time_restricted.start;
            const end = when.time_restricted.end;

            if (currentHHMM < start || currentHHMM > end) {
                return false;
            }
        }

        // 7. Args Match (Simple Key-Value Equality) (Phase 2.3)
        if (when.args_match) {
            for (const [key, allowedVal] of Object.entries(when.args_match)) {
                const actualVal = input.args ? input.args[key] : undefined;
                if (actualVal !== allowedVal) return false;
            }
        }

        return true;
    }

    private getReasonCode(rule: ABACRule): string {
        switch (rule.effect) {
            case 'allow': return PolicyReasonCodes.ALLOWED_BY_RULE;
            case 'deny': return PolicyReasonCodes.DENIED_BY_RULE; // Or custom
            case 'transform': return PolicyReasonCodes.TRANSFORMED_BY_RULE;
            default: return 'UNKNOWN_DECISION';
        }
    }
}
