"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policy = void 0;
const policy_engine_1 = require("../core/policy_engine");
const engine = new policy_engine_1.PolicyEngine([
    {
        id: 'deny-dangerous',
        target: { action: 'dangerous_op' },
        effect: 'deny',
        priority: 100
    },
    {
        id: 'redact-pii',
        target: { action: 'sensitive_op' },
        effect: 'transform',
        transform: {
            redactPII: ['credit_card', 'ssn']
        },
        priority: 90
    },
    {
        id: 'egress-control',
        target: { action: 'curl_op' }, // Applies to network actions
        effect: 'transform',
        transform: {
            checkEgress: {
                blockPrivate: true,
                allowList: ['example.com', 'api.google.com']
            }
        },
        priority: 85
    },
    {
        id: 'limit-search',
        target: { action: 'search_op' },
        effect: 'transform',
        transform: {
            forceArgs: { limit: 10 }
        },
        priority: 80
    }
]);
const policy = async (ctx) => {
    console.log('[3] Policy Decision (Engine-Based)');
    const envelope = ctx.stepResults.normalized;
    if (!envelope) {
        throw new Error('Policy Step: Missing Normalized Envelope');
    }
    const decision = engine.evaluate(envelope);
    if (!decision.allow) {
        console.warn(`[POLICY] Request Denied: ${decision.reason}`);
        ctx.stepResults.error = {
            code: 'POLICY_VIOLATION',
            message: decision.reason || 'Request denied by policy',
            status: 403
        };
        throw new Error('POLICY_VIOLATION');
    }
    if (decision.transform) {
        console.log(`[POLICY] Request Transformed: ${decision.reason}`);
        ctx.stepResults.normalized = decision.transform;
    }
    ctx.stepResults.policy = decision;
};
exports.policy = policy;
