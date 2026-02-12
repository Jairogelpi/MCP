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

        // 2. Role (Agent Role MUST be in the allowed list)
        if (when.role && when.role.length > 0) {
            // input.role must be present and in the list
            if (!input.role || !when.role.includes(input.role)) return false;
        }

        // 3. Risk Class
        if (when.risk_class) {
            if (input.risk_class !== when.risk_class) return false;
        }

        // 4. Time Restricted
        if (when.time_restricted) {
            const now = new Date(input.timestamp);
            const currentHHMM = now.toISOString().split('T')[1].substring(0, 5); // HH:MM
            const start = when.time_restricted.start;
            const end = when.time_restricted.end;

            // Simple range check (assuming same day for MVP)
            if (currentHHMM < start || currentHHMM > end) {
                // Outside allowed window? The rule says "Time Restricted" -> usually implies "When in this time".
                // If the rule is an ALLOW rule, "when time is X" means it only allows during X.
                // If it's a DENY rule, "when time is X" means it denies during X.
                return false;
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
