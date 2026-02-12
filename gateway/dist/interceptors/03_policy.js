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
        target: { action: 'curl_op' },
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
    console.log('[3] Policy Decision (PEP)');
    const envelope = ctx.stepResults.normalized;
    if (!envelope) {
        throw new Error('Policy Step: Missing Normalized Envelope');
    }
    // Build Policy Input from Envelope and Context
    // Spec: tenant_id, upstream_server_id from meta (mapped from raw URL)
    // agent_id? We assume it's in meta.authContext or headers.
    // For MVP, default to 'anonymous' if missing, but strictly should come from Auth.
    const input = {
        tenant_id: envelope.meta.tenant,
        upstream_server_id: envelope.meta.targetServer,
        agent_id: (envelope.meta.authContext?.userId) || 'anonymous-agent',
        tool_name: envelope.action,
        args: envelope.parameters,
        timestamp: Date.now(),
        request_id: envelope.id
    };
    const decision = engine.evaluate(input);
    if (decision.decision === 'deny') {
        const reason = decision.reason_codes.join(', ');
        console.warn(`[POLICY] Deny: ${reason}`);
        ctx.stepResults.error = {
            code: decision.reason_codes[0], // Primary reason code
            message: reason,
            status: 403
        };
        throw new Error(decision.reason_codes[0]);
    }
    if (decision.decision === 'transform' && decision.transform_patch) {
        console.log(`[POLICY] Transform: ${decision.reason_codes.join(', ')}`);
        // Patch args
        if (decision.transform_patch.parameters) {
            envelope.parameters = decision.transform_patch.parameters;
        }
        // Update normalized result
        decision.transform = envelope; // For legacy/logging
        ctx.stepResults.normalized = envelope;
    }
    ctx.stepResults.policy = decision;
};
exports.policy = policy;
