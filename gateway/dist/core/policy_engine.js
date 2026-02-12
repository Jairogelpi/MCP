"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const contract_1 = require("./contract");
class PolicyEngine {
    rules = [];
    constructor(initialRules = []) {
        this.rules = initialRules;
    }
    addRule(rule) {
        this.rules.push(rule);
        this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
    evaluate(input) {
        // Find matching rules
        const matched = this.rules.filter(rule => {
            const matchTenant = !rule.target.tenant || rule.target.tenant === '*' || rule.target.tenant === input.tenant_id;
            const matchServer = !rule.target.server || rule.target.server === '*' || rule.target.server === input.upstream_server_id;
            const matchAction = !rule.target.action || rule.target.action === '*' || rule.target.action === input.tool_name;
            return matchTenant && matchServer && matchAction;
        });
        if (matched.length === 0) {
            return {
                decision: 'allow',
                reason_codes: [contract_1.PolicyReasonCodes.DEFAULT_ALLOW],
                allow: true, // compat
                matchedRuleId: 'default'
            };
        }
        const rule = matched[0];
        if (rule.effect === 'deny') {
            return {
                decision: 'deny',
                reason_codes: [contract_1.PolicyReasonCodes.DENIED_BY_RULE, rule.id], // Could map specific code from rule
                allow: false, // compat
                matchedRuleId: rule.id
            };
        }
        if (rule.effect === 'transform' && rule.transform) {
            try {
                // We need the envelope to transform. 
                // BUT evaluate takes PolicyInput. 
                // The engine should be able to transform the ARGS inside PolicyInput and return them.
                // Let's reconstruct a partial envelope or just transform args
                const transformedArgs = this.applyTransformations(input.args, rule.transform);
                return {
                    decision: 'transform',
                    reason_codes: [contract_1.PolicyReasonCodes.TRANSFORMED_BY_RULE, rule.id],
                    allow: true,
                    transform_patch: { parameters: transformedArgs }, // Patch style
                    matchedRuleId: rule.id,
                    // Legacy helper: we return a "full envelope" style object here?
                    // The caller handles patching the real envelope.
                };
            }
            catch (err) {
                // Map error to Reason Code
                let code = contract_1.PolicyReasonCodes.POLICY_VIOLATION;
                if (err.message.includes('SSRF'))
                    code = contract_1.PolicyReasonCodes.SSRF_BLOCKED;
                return {
                    decision: 'deny',
                    reason_codes: [code, err.message],
                    allow: false,
                    matchedRuleId: rule.id
                };
            }
        }
        return {
            decision: 'allow',
            reason_codes: [contract_1.PolicyReasonCodes.ALLOWED_BY_RULE, rule.id],
            allow: true,
            matchedRuleId: rule.id
        };
    }
    applyTransformations(args, transform) {
        const clone = JSON.parse(JSON.stringify(args || {}));
        if (transform.forceArgs) {
            Object.assign(clone, transform.forceArgs);
        }
        if (transform.redactPII) {
            for (const field of transform.redactPII) {
                if (clone[field] && typeof clone[field] === 'string') {
                    clone[field] = '***REDACTED***';
                }
            }
        }
        if (transform.checkEgress) {
            this.validateEgress(clone, transform.checkEgress);
        }
        return clone;
    }
    validateEgress(obj, options) {
        if (typeof obj === 'string') {
            if (obj.startsWith('http://') || obj.startsWith('https://')) {
                this.checkUrl(obj, options);
            }
        }
        else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                this.validateEgress(obj[key], options);
            }
        }
    }
    checkUrl(urlString, options) {
        let hostname = '';
        try {
            const u = new URL(urlString);
            hostname = u.hostname;
        }
        catch {
            return;
        }
        if (options.blockPrivate) {
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' ||
                hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')) {
                throw new Error('SSRF Block');
            }
        }
        if (options.allowList && options.allowList.length > 0) {
            const allowed = options.allowList.some(domain => hostname === domain || hostname.endsWith('.' + domain));
            if (!allowed) {
                throw new Error(`Egress Block: Domain ${hostname} not allowed`);
            }
        }
    }
}
exports.PolicyEngine = PolicyEngine;
