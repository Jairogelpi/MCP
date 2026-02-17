import { Interceptor } from '../core/pipeline';
import { PolicyDecision, PolicyInput, PolicyReasonCodes } from '../core/contract';
import { PDP } from '../core/pdp';
import { CatalogManager } from '../core/catalog_manager';
import { PIITransformer } from '../core/transformers/pii';
import { EgressTransformer } from '../core/transformers/egress';
import { LimitsTransformer } from '../core/transformers/limits';
import * as fs from 'fs';
import * as path from 'path';

import { RulesetManager } from '../core/ruleset_manager';
import { PolicyEngine } from '../core/policy_engine';

const engine = new PolicyEngine();
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
            const toolDef = await catalog.getTool(targetServer, toolName);

            // STRICT ENFORCEMENT (Phase 2)
            if (!toolDef) {
                const { logger } = require('../core/logger');
                logger.warn('policy_unknown_tool', { tenant_id: tenant, tool_name: toolName });

                // If we are in strict mode (Phase 2), we deny.
                // For transition, we might want to allow common tools or default to 'high' risk.
                // But user requested "Real Tool Catalog", so we deny if not found.

                ctx.stepResults.error = {
                    code: PolicyReasonCodes.FORBIDDEN_TOOL,
                    message: `Tool '${toolName}' not found in catalog for upstream '${targetServer}'`,
                    status: 403
                };
                throw new Error(PolicyReasonCodes.FORBIDDEN_TOOL);
            }

            const riskClass = toolDef.riskClass || 'medium';

            // 2. Enrichment (Identity)
            const identity = ctx.identity || { role: 'viewer', userId: 'anonymous', tenantId: 'unknown', scopes: [], environment: 'prod' };
            const agentId = identity.agentId || identity.userId;
            const role = identity.role;
            const environment = identity.environment || 'prod';

            const input: PolicyInput = {
                tenant_id: tenant,
                upstream_server_id: targetServer,
                agent_id: agentId,
                role: role,
                tool_name: toolName,
                args: envelope.parameters,
                timestamp: Date.now(),
                request_id: envelope.id,
                risk_class: riskClass,
                // ABAC: Extract from enriched identity
                project_id: (envelope.meta as any).project_id,
                environment: environment,
                mcp_method: 'tools/call', // Standard for now
                resource: envelope.parameters?.model || envelope.parameters?.resource || undefined
            };

            console.log(`[PEP] Evaluating for ${agentId} (Role: ${role}) -> ${toolName} (Risk: ${riskClass})`);

            // Generate Envelope Hash for potential approval/audit
            const crypto = require('crypto');
            const envelopeHash = crypto.createHash('sha256').update(JSON.stringify(envelope)).digest('hex');

            // 3. Evaluate
            const decision = await engine.evaluate(input, envelopeHash);

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
                    policy_version: 'unified-v1'
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
