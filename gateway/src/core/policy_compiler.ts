import { AgentPolicyConfig } from './contract';
import { UnifiedPolicy } from './policy_engine';
import * as crypto from 'crypto';

export class PolicyCompiler {
    /**
     * Translates high-level agent configuration into formal UnifiedPolicies.
     */
    static compile(config: AgentPolicyConfig, tenantId: string): UnifiedPolicy[] {
        const policies: UnifiedPolicy[] = [];
        const agentId = config.agent_id;
        const version = '3.0.0-auto';

        // 1. Mode-based presets (Global starting point)
        // Note: Presets can add multiple specific rules

        if (config.mode === 'open') {
            // Open Mode usually means no specific restrictive policies, 
            // but we might want a monitor-only policy for auditing.
        }

        // 2. Access Control (Allowed Upstreams/Actions/Models)
        if (config.allowed_upstreams && config.allowed_upstreams.length > 0) {
            policies.push({
                id: `pol_ups_${agentId}_${crypto.randomBytes(2).toString('hex')}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 200,
                mode: 'enforce',
                effect: 'deny',
                conditions: {
                    inverse: true,
                    upstream_ids: config.allowed_upstreams
                },
                constraints: null,
                version
            });
        }

        if (config.allowed_actions && config.allowed_actions.length > 0) {
            policies.push({
                id: `pol_act_${agentId}_${crypto.randomBytes(2).toString('hex')}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 200,
                mode: 'enforce',
                effect: 'deny',
                conditions: {
                    inverse: true,
                    tool_names: config.allowed_actions
                },
                constraints: null,
                version
            });
        }

        if (config.allowed_resources && config.allowed_resources.length > 0) {
            policies.push({
                id: `pol_res_${agentId}_${crypto.randomBytes(2).toString('hex')}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 210,
                mode: 'enforce',
                effect: 'deny',
                conditions: {
                    inverse: true,
                    resources: config.allowed_resources
                },
                constraints: null,
                version
            });
        }

        // 2.5 Parameter Constraints (Universal)
        if (config.parameter_constraints && Object.keys(config.parameter_constraints).length > 0) {
            policies.push({
                id: `pol_params_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 220,
                mode: 'enforce',
                effect: 'deny',
                conditions: {
                    parameter_rules: config.parameter_constraints
                },
                constraints: null,
                version
            });
        }

        // 2.6 Cost Overrides
        if (config.cost_overrides && Object.keys(config.cost_overrides).length > 0) {
            policies.push({
                id: `pol_costs_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 100,
                mode: 'enforce',
                effect: 'transform',
                conditions: {},
                constraints: {
                    cost_overrides: config.cost_overrides
                },
                version
            });
        }

        // 3. Budget Control
        if (config.daily_budget !== undefined) {
            policies.push({
                id: `pol_budget_daily_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 300,
                mode: 'enforce',
                effect: config.hard_cap ? 'deny' : 'require_approval',
                conditions: {
                    budget_period: 'daily',
                    limit: config.daily_budget
                },
                constraints: null,
                version
            });
        }

        // 4. Approval Rules
        if (config.require_approval_actions) {
            policies.push({
                id: `pol_approval_sens_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 150,
                mode: 'enforce',
                effect: 'require_approval',
                conditions: { min_risk: 'high' },
                constraints: null,
                version
            });
        }

        if (config.approval_threshold !== undefined) {
            policies.push({
                id: `pol_approval_cost_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 160,
                mode: 'enforce',
                effect: 'require_approval',
                conditions: { cost_gt: config.approval_threshold },
                constraints: null,
                version
            });
        }

        if (config.require_approval_prod) {
            policies.push({
                id: `pol_approval_prod_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'deployment',
                scope_id: 'prod',
                priority: 170,
                mode: 'enforce',
                effect: 'require_approval',
                conditions: { agent_id: agentId, environment: 'prod' },
                constraints: null,
                version
            });
        }

        // 5. Rate & Usage
        if (config.requests_per_minute) {
            policies.push({
                id: `pol_rate_${agentId}`,
                tenant_id: tenantId,
                deployment_id: null,
                scope_type: 'agent',
                scope_id: agentId,
                priority: 250,
                mode: 'enforce',
                effect: 'limit',
                conditions: { rpm_limit: config.requests_per_minute },
                constraints: null,
                version
            });
        }

        return policies;
    }
}
