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
// MVP: Load specific tenant ruleset. Real world: Load dynamically based on ctx provided tenant.
const RULESET_PATH = path.join(__dirname, '../../policies/tenant/acme/ruleset_v1.json');
let ruleset: any;

try {
    ruleset = JSON.parse(fs.readFileSync(RULESET_PATH, 'utf8'));
    console.log(`[PEP] Loaded ruleset version ${ruleset.version} for ${ruleset.tenant_id}`);
} catch (e) {
    console.error('[PEP] Failed to load ruleset:', e);
    // Fallback? Or fail?
    ruleset = { tenant_id: 'unknown', version: '0.0.0', rules: [] };
}

const pdp = new PDP();
const catalog = CatalogManager.getInstance();

export const policy: Interceptor = async (ctx) => {
    console.log('[3] Policy Decision (PEP - ABAC)');

    const envelope = ctx.stepResults.normalized;
    if (!envelope) {
        throw new Error('Policy Step: Missing Normalized Envelope');
    }

    const { tenant, targetServer } = envelope.meta;
    const toolName = envelope.action;

    // 1. Enrichment (Catalog)
    const toolDef = catalog.getTool(targetServer, toolName);
    const riskClass = toolDef?.riskClass || 'medium'; // Default risk? 
    // Note: ToolCatalog currently might not populate riskClass from upstream (upstream needs to send it).
    // For MVP, let's assume upstream sends it or we default. 
    // The dummy upstream in 2.2 didn't strictly send riskClass, so 'medium' is safe default.

    // 2. Enrichment (Auth)
    const authContext = envelope.meta.authContext || {};
    const agentId = authContext.userId || 'anonymous-agent';
    const role = authContext.role || 'user'; // Default role

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
    // For MVP, we assume request tenant matches ruleset tenant.
    const decision = pdp.evaluate(input, ruleset);

    // 4. Enforce
    if (decision.decision === 'deny') {
        const reason = decision.reason_codes.join(', ');
        console.warn(`[POLICY] Deny: ${reason}`);

        ctx.stepResults.error = {
            code: decision.reason_codes[0],
            message: reason,
            status: 403
        };
        throw new Error(decision.reason_codes[0]);
    }



    // ...

    if (decision.decision === 'transform') {
        console.log(`[POLICY] Transform: ${decision.reason_codes.join(', ')}`);

        const patch = decision.transform_patch;
        if (patch) {
            // A. Argument Patching (Simple merge)
            if (patch.parameters) {
                envelope.parameters = { ...envelope.parameters, ...patch.parameters };
                console.log('[PEP] Applied arguments patch');
            }

            // B. Complex Transforms (Delegated)
            const config = patch._policy_transform;
            if (config) {
                if (config.redactPII) {
                    await PIITransformer.apply(envelope, config.redactPII);
                    console.log('[PEP] Applied PII Redaction');
                }

                if (config.checkEgress) {
                    try {
                        await EgressTransformer.apply(envelope, config.checkEgress);
                    } catch (err: any) {
                        console.warn(`[PEP] Egress Blocked: ${err.message}`);
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
                    console.log('[PEP] Applied Limits/Force Args');
                }
            }
        }

        // Update normalized result
        decision.transform = envelope;
        ctx.stepResults.normalized = envelope;
    }

    ctx.stepResults.policy = decision;
};
