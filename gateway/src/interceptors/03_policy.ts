import { Interceptor } from '../core/pipeline';
import { PolicyDecision, PolicyInput, PolicyReasonCodes } from '../core/contract';
import { PDP } from '../core/pdp';
import { CatalogManager } from '../core/catalog_manager';
import { PIITransformer } from '../core/transformers/pii';
import { EgressTransformer } from '../core/transformers/egress';
import { LimitsTransformer } from '../core/transformers/limits';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
// MVP: Load ruleset based on tenant context or default to acme.
// In a real system, this would be a RulesetManager caching multiple tenants.
let rulesets: Record<string, any> = {};

function loadRuleset(tenant: string) {
    if (rulesets[tenant]) return rulesets[tenant];

    const rulePath = path.join(__dirname, `../../policies/tenant/${tenant}/ruleset_v1.json`);
    try {
        if (fs.existsSync(rulePath)) {
            const ruleset = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
            console.log(`[PEP] Loaded ruleset version ${ruleset.version} for ${tenant}`);
            rulesets[tenant] = ruleset;
            return ruleset;
        }
    } catch (e) {
        console.error(`[PEP] Failed to load ruleset for ${tenant}:`, e);
    }

    // Fallback to ACME if not found (for testing/demo consistency if tenant folder missing)
    // Or return empty denial ruleset
    return { tenant_id: 'unknown', version: '0.0.0', rules: [] };
}

// Pre-load ACME and Demo
loadRuleset('acme');
loadRuleset('demo-client');

const pdp = new PDP();
const catalog = CatalogManager.getInstance();

import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

export const policy: Interceptor = async (ctx) => {
    const tracer = trace.getTracer('mcp-gateway');
    const meter = metrics.getMeter('mcp-gateway');
    const denyCounter = meter.createCounter('policy_denies_total', { description: 'Policy denials' });

    return tracer.startActiveSpan('policy.evaluate', async (span) => {
        try {
            console.log('[3] Policy Decision (PEP - ABAC)');

            const envelope = ctx.stepResults.normalized;
            if (!envelope) {
                throw new Error('Policy Step: Missing Normalized Envelope');
            }

            const { tenant, targetServer } = envelope.meta;
            const toolName = envelope.action;

            span.setAttribute('mcp.tool_name', toolName);
            span.setAttribute('tenant_id', tenant);

            // 1. Enrichment (Catalog)
            const toolDef = catalog.getTool(targetServer, toolName);
            const riskClass = toolDef?.riskClass || 'medium';

            // 2. Enrichment (Identity)
            const identity = ctx.identity || { role: 'viewer', userId: 'anonymous', tenantId: 'unknown', scopes: [] };
            const agentId = identity.userId;
            const role = identity.role;

            const input: PolicyInput = {
                tenant_id: tenant,
                upstream_server_id: targetServer,
                agent_id: agentId,
                role: role,
                tool_name: toolName,
                args: envelope.parameters,
                timestamp: Date.now(),
                request_id: envelope.id,
                risk_class: riskClass // Enriched
            };

            console.log(`[PEP] Evaluating for ${agentId} (Role: ${role}) -> ${toolName} (Risk: ${riskClass})`);

            // 3. Evaluate
            const activeRuleset = loadRuleset(tenant);
            const decision = pdp.evaluate(input, activeRuleset);

            span.setAttribute('policy.decision', decision.decision.toUpperCase());

            // 4. Enforce
            if (decision.decision === 'deny') {
                const reason = decision.reason_codes.join(', ');
                const { logger } = require('../core/logger');
                logger.warn('policy_denied', {
                    tenant_id: tenant,
                    tool_name: toolName,
                    reason,
                    decision: 'deny'
                });

                span.setAttribute('policy.reasons', reason);
                denyCounter.add(1, {
                    tenant_id: tenant,
                    reason: decision.reason_codes[0],
                    policy_version: activeRuleset?.version || 'unknown'
                });

                ctx.stepResults.error = {
                    code: decision.reason_codes[0],
                    message: reason,
                    status: 403
                };
                throw new Error(decision.reason_codes[0]);
            }

            if (decision.decision === 'transform') {
                const { logger } = require('../core/logger');
                logger.info('policy_transform', {
                    tenant_id: tenant,
                    tool_name: toolName,
                    reasons: decision.reason_codes
                });

                const patch = decision.transform_patch;
                if (patch) {
                    // A. Argument Patching (Simple merge)
                    if (patch.parameters) {
                        envelope.parameters = { ...envelope.parameters, ...patch.parameters };
                        // console.log('[PEP] Applied arguments patch');
                    }

                    // B. Complex Transforms (Delegated)
                    const config = patch._policy_transform;
                    if (config) {
                        if (config.redactPII) {
                            await PIITransformer.apply(envelope, config.redactPII);
                            // console.log('[PEP] Applied PII Redaction');
                        }

                        if (config.checkEgress) {
                            try {
                                await EgressTransformer.apply(envelope, config.checkEgress);
                            } catch (err: any) {
                                logger.warn('policy_egress_blocked', { error: err.message });
                                ctx.stepResults.error = {
                                    code: PolicyReasonCodes.SSRF_BLOCKED,
                                    message: 'SSRF Blocked',
                                    status: 403
                                };
                                throw err;
                            }
                        }

                        if (config.forceArgs) {
                            await LimitsTransformer.apply(envelope, config.forceArgs);
                            // console.log('[PEP] Applied Limits/Force Args');
                        }
                    }
                }

                // Update normalized result
                decision.transform = envelope;
                ctx.stepResults.normalized = envelope;
            }

            ctx.stepResults.policy = decision;
            span.setStatus({ code: SpanStatusCode.OK });

            // Success Log
            if (decision.decision === 'allow') {
                const { logger } = require('../core/logger');
                logger.debug('policy_allowed', { tenant_id: tenant, tool_name: toolName });
            }

        } catch (err: any) {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            throw err;
        } finally {
            span.end();
        }
    });
};
