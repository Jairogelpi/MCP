import { BudgetManager, BudgetStatus } from './budget_manager';
import { CostEstimator } from './cost_estimator';
import { PricingManager } from './pricing_manager';
import { DegradationManager } from './degradation_manager';
import { RateLimitManager } from './rate_limit_manager';

export enum EconomicReasonCode {
    BUDGET_HARD_LIMIT = 'BUDGET_HARD_LIMIT',
    BUDGET_SOFT_LIMIT = 'BUDGET_SOFT_LIMIT',
    PRICING_NOT_FOUND = 'PRICING_NOT_FOUND',
    COST_ESTIMATION_FAILED = 'COST_ESTIMATION_FAILED',
    DEGRADE_APPLIED = 'DEGRADE_APPLIED',
    APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
    ECON_RATE_LIMIT = 'ECON_RATE_LIMIT',
    OK = 'OK'
}

export interface EconomicInput {
    tenant_id: string;
    budget_scopes: string[];
    tool_name: string;
    args: any;
    pricing_context: {
        provider: string;
        model?: string;
        tier?: string;
    };
    cost_overrides?: Record<string, number>;
}

export interface EconomicDecision {
    outcome: 'allow' | 'deny' | 'degrade' | 'require_approval';
    estimated_cost: number;
    currency: string;
    reason_codes: EconomicReasonCode[];
    budget_scope_failed?: string;
    patch?: any; // For degrade outcome
}

export class EconomicDecider {
    private estimator = CostEstimator.getInstance();
    private budgets = BudgetManager.getInstance();
    private degradation = DegradationManager.getInstance();
    private rateLimiter = RateLimitManager.getInstance();

    public async evaluate(input: EconomicInput): Promise<EconomicDecision> {
        // 1. Resolve Dynamic Context if necessary
        let context = input.pricing_context;
        let estimated_tokens_out = 500;

        if (context.provider === 'dynamic') {
            const resolved = await PricingManager.getInstance().resolveContext(input.tool_name);
            context = {
                provider: resolved.provider,
                model: resolved.model,
                tier: resolved.tier
            };
            estimated_tokens_out = resolved.estimated_tokens_out;
        }

        // 2. Estimate
        let estimate;
        if (input.cost_overrides && input.cost_overrides[input.tool_name] !== undefined) {
            const overrideCost = input.cost_overrides[input.tool_name];
            console.log(`[ECON] Applying cost override for ${input.tool_name}: ${overrideCost}`);
            estimate = {
                estimated_cost: overrideCost,
                currency: 'USD', // Default for now
                estimated_tokens_in: 0,
                estimated_tokens_out: 0
            };
        } else {
            estimate = this.estimator.estimate({
                ...context,
                endpoint: input.tool_name,
                estimated_tokens_out
            }, input.args);
        }

        // Fail-safe Check
        if (estimate.estimated_cost === -1) {
            return {
                outcome: 'deny',
                estimated_cost: 0,
                currency: estimate.currency,
                reason_codes: [EconomicReasonCode.PRICING_NOT_FOUND],
                budget_scope_failed: 'pricing'
            };
        }

        // 2. Rate Limit Check (Throttling)
        const agentScope = input.budget_scopes.find(s => s.startsWith('agent:')) || 'agent:anon';
        const agentId = agentScope.split(':')[1];

        const isRateAllowed = this.rateLimiter.checkLimits(
            { agentId, tenantId: input.tenant_id },
            { tokens: estimate.estimated_tokens_in, cost: estimate.estimated_cost }
        );

        if (!isRateAllowed) {
            return {
                outcome: 'deny',
                estimated_cost: 0,
                currency: estimate.currency,
                reason_codes: [EconomicReasonCode.ECON_RATE_LIMIT],
                budget_scope_failed: 'rate_limit'
            };
        }

        // 3. Budget Check
        const budgetCheck = await this.budgets.checkBudget(input.budget_scopes, estimate.estimated_cost);

        // 3. Hard Limit -> STOP
        if (budgetCheck.status === BudgetStatus.HARD_LIMIT_EXCEEDED) {
            return {
                outcome: 'deny',
                estimated_cost: estimate.estimated_cost,
                currency: estimate.currency,
                reason_codes: [EconomicReasonCode.BUDGET_HARD_LIMIT],
                budget_scope_failed: budgetCheck.failedScope
            };
        }

        // 4. Soft Limit / High Cost -> Degradation Check
        const degradationPlan = this.degradation.evaluate({
            isSoftLimit: budgetCheck.status === BudgetStatus.SOFT_LIMIT_EXCEEDED,
            estimatedCost: estimate.estimated_cost,
            provider: input.pricing_context.provider,
            model: input.pricing_context.model
        });

        if (degradationPlan.action === 'require_approval') {
            return {
                outcome: 'require_approval',
                estimated_cost: estimate.estimated_cost,
                currency: estimate.currency,
                reason_codes: [EconomicReasonCode.APPROVAL_REQUIRED],
                budget_scope_failed: budgetCheck.failedScope
            };
        }

        if (degradationPlan.action === 'degrade') {
            return {
                outcome: 'degrade',
                estimated_cost: estimate.estimated_cost,
                currency: estimate.currency,
                reason_codes: [EconomicReasonCode.DEGRADE_APPLIED],
                budget_scope_failed: budgetCheck.failedScope,
                patch: degradationPlan.patch
            };
        }

        return {
            outcome: 'allow',
            estimated_cost: estimate.estimated_cost,
            currency: estimate.currency,
            reason_codes: [EconomicReasonCode.OK]
        };
    }

    public async commit(scopes: string[], cost: number) {
        await this.budgets.consumeBudget(scopes, cost);
    }
}
