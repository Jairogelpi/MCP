import { ActionEnvelope, PolicyDecision, PolicyInput, PolicyReasonCodes } from './contract';
import { db } from '../adapters/database';
import { DataGuard } from './data_guard';

export interface UnifiedPolicy {
    id: string;
    tenant_id: string;
    deployment_id: string | null;
    scope_type: 'tenant' | 'deployment' | 'agent' | 'action' | 'upstream';
    scope_id: string | null;
    priority: number;
    mode: 'enforce' | 'monitor';
    conditions: any;
    effect: 'allow' | 'deny' | 'require_approval' | 'transform' | 'limit';
    constraints: any;
    version: string;
}

export class PolicyEngine {
    /**
     * Unified evaluation point for all governance dimensions.
     * Follows deterministic logic: Deny > Require Approval > Limit > Allow.
     * Higher specificity usually has higher priority.
     */
    async evaluate(input: PolicyInput, envelopeHash?: string): Promise<PolicyDecision> {
        // 1. Fetch all applicable policies
        const policies = await this.getApplicablePolicies(input.tenant_id);

        // 2. Identify matches
        const matches = policies.filter(p => this.matches(p, input));

        // 3. Data Guard Integrity Check (PII/Secrets dimension)
        const piiTypes = DataGuard.scan(input.args);

        // 4. Deterministic Conflict Resolution
        // Order: DENY > REQUIRE_APPROVAL > TRANSFORM/LIMIT > ALLOW

        const enforcedMatches = matches.filter(m => m.mode === 'enforce');
        const monitorMatches = matches.filter(m => m.mode === 'monitor');

        // Log monitor matches
        for (const m of monitorMatches) {
            console.info(`[PolicyEngine] MONITOR-ONLY: Policy ${m.id} matched. Effect would be ${m.effect}`);
        }

        // --- Resolution Logic ---

        // A. If any ENFORCE policy says DENY -> DENY
        const denyPolicy = enforcedMatches.find(m => m.effect === 'deny');
        if (denyPolicy) {
            return {
                decision: 'deny',
                reason_codes: [PolicyReasonCodes.DENIED_BY_RULE],
                matchedRuleId: denyPolicy.id
            };
        }

        // B. If any ENFORCE policy says REQUIRE_APPROVAL -> DENY (until approved)
        const approvalPolicy = enforcedMatches.find(m => m.effect === 'require_approval');
        if (approvalPolicy) {
            let approvalId;
            if (envelopeHash) {
                const { ApprovalService } = require('./approval_service');
                approvalId = await ApprovalService.createRequest(input.tenant_id, envelopeHash, input.agent_id);
                console.info(`[PolicyEngine] Parked request for approval: ${approvalId}`);
            }

            return {
                decision: 'deny', // Parked state
                reason_codes: ['REQUIRE_APPROVAL'],
                matchedRuleId: approvalPolicy.id,
                decision_id: approvalId // Pass the approval request ID
            };
        }

        // C. If any ENFORCE policy says TRANSFORM/LIMIT -> Apply highest priority
        const transformPolicies = enforcedMatches.filter(m => m.effect === 'transform' || m.effect === 'limit')
            .sort((a, b) => b.priority - a.priority);

        if (transformPolicies.length > 0) {
            const best = transformPolicies[0];
            const parsedConstraints = best.constraints ? (typeof best.constraints === 'string' ? JSON.parse(best.constraints) : best.constraints) : undefined;
            return {
                decision: 'transform',
                reason_codes: [PolicyReasonCodes.TRANSFORMED_BY_RULE],
                matchedRuleId: best.id,
                transform_patch: parsedConstraints,
                constraints: parsedConstraints
            };
        }

        // D. If any ENFORCE policy says ALLOW -> ALLOW
        const allowPolicy = enforcedMatches.find(m => m.effect === 'allow');
        if (allowPolicy) {
            return {
                decision: 'allow',
                reason_codes: [PolicyReasonCodes.ALLOWED_BY_RULE],
                matchedRuleId: allowPolicy.id
            };
        }

        // Default: Final Baseline
        return {
            decision: 'allow',
            reason_codes: [PolicyReasonCodes.DEFAULT_ALLOW],
            matchedRuleId: 'baseline'
        };
    }

    private async getApplicablePolicies(tenantId: string): Promise<UnifiedPolicy[]> {
        const rows = await db.raw.query(`
            SELECT * FROM iam_policies 
            WHERE tenant_id = ? 
            AND (active_from IS NULL OR active_from <= ?) 
            AND (active_until IS NULL OR active_until >= ?)
        `, [tenantId, Date.now(), Date.now()]);

        return rows.map((r: any) => ({
            ...r,
            conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions
        }));
    }

    private matches(policy: UnifiedPolicy, input: PolicyInput): boolean {
        const cond = policy.conditions;

        // 1. Scope Dimensions
        if (policy.scope_type === 'agent' && policy.scope_id && policy.scope_id !== input.agent_id) return false;
        if (policy.scope_type === 'deployment' && policy.scope_id && policy.scope_id !== input.environment) return false;
        if (policy.scope_type === 'upstream' && policy.scope_id && policy.scope_id !== input.upstream_server_id) return false;
        if (policy.scope_type === 'action' && policy.scope_id && policy.scope_id !== input.tool_name) return false;

        // 2. Identity & Context Dimensions (RBAC / Env)
        if (cond.roles && !cond.roles.includes(input.role)) return false;
        if (cond.environments && !cond.environments.includes(input.environment)) return false;

        // 3. Resource Dimension (Agnostic)
        if (cond.resources && input.resource && !cond.resources.includes(input.resource)) {
            // If inverse is true, then it matches IF the resource is NOT in the list
            if (!cond.inverse) return false;
        } else if (cond.resources && input.resource && cond.resources.includes(input.resource)) {
            if (cond.inverse) return false;
        }

        // 4. Temporal Dimension
        if (cond.time_window) {
            const [start, end] = cond.time_window.split('-');
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            if (currentTime < start || currentTime > end) return false;
        }

        // 5. Parameter Dynamics (Generic Parameter Constraints)
        if (cond.parameter_rules) {
            for (const [path, ruleAny] of Object.entries(cond.parameter_rules as any)) {
                const rule = ruleAny as { min?: number; max?: number; enum?: any[]; pattern?: string };
                const val = input.args[path];
                if (val === undefined) continue;

                if (rule.min !== undefined && val < rule.min) return true;
                if (rule.max !== undefined && val > rule.max) return true;
                if (rule.enum !== undefined && !rule.enum.includes(val)) return true;
                if (rule.pattern !== undefined && !new RegExp(rule.pattern).test(String(val))) return true;
            }
        }

        // 6. Semantic Arguments (Equality Match)
        if (cond.args_match) {
            for (const [key, val] of Object.entries(cond.args_match)) {
                if (input.args[key] !== val) return false;
            }
        }

        return true;
    }
}
