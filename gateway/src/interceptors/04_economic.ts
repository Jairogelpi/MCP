import { Interceptor } from '../core/pipeline';
import { EconomicDecider, EconomicReasonCode } from '../core/economic/decider';
import { LedgerManager } from '../core/ledger/ledger_manager';

const decider = new EconomicDecider();
const ledger = LedgerManager.getInstance();

export const economic: Interceptor = async (ctx) => {
    console.log('[4] Economic Engine (Soft)');

    const envelope = ctx.stepResults.normalized;
    if (!envelope) return;

    // 1. Construct Input
    const { tenant } = envelope.meta;
    const projectHeader = ctx.request.headers['x-project-id'] as string;
    const project = projectHeader || 'project:default';
    const scopes = [`tenant:${tenant}`, project];

    // Pricing Context
    let pricingContext: any = { provider: 'internal', tier: 'standard' };
    if (envelope.action === 'dangerous_op' || envelope.action === 'sensitive_op') {
        pricingContext = { provider: 'openai', model: 'gpt-4' };
    } else if (envelope.action === 'expensive_op') {
        pricingContext = { provider: 'internal', endpoint: 'expensive_op' };
    }

    // 2. Evaluate
    const decision = await decider.evaluate({
        tenant_id: tenant,
        budget_scopes: scopes,
        tool_name: envelope.action,
        args: envelope.parameters,
        pricing_context: pricingContext
    });

    console.log(`[ECON] Outcome: ${decision.outcome}, Cost: ${decision.estimated_cost.toFixed(4)} ${decision.currency}, Reason: ${decision.reason_codes.join(',')}`);

    // 3. Enforce
    if (decision.outcome === 'deny') {
        const errorMsg = `Economic Block: ${decision.reason_codes.join(', ')} (Scope: ${decision.budget_scope_failed})`;
        console.warn(`[ECON] ${errorMsg}`);
        ctx.stepResults.error = {
            code: decision.reason_codes[0],
            message: errorMsg,
            status: 402 // Payment Required
        };
        throw new Error(decision.reason_codes[0]);
    }

    if (decision.outcome === 'require_approval') {
        const errorMsg = `Approval Required: ${decision.reason_codes.join(', ')}`;
        console.warn(`[ECON] ${errorMsg}`);
        ctx.stepResults.error = {
            code: 'APPROVAL_REQUIRED',
            message: errorMsg,
            status: 402
        };
        throw new Error('APPROVAL_REQUIRED');
    }

    if (decision.outcome === 'degrade') {
        if (decision.patch) {
            console.warn(`[ECON] DEGRADING Request: ${JSON.stringify(decision.patch)}`);
            Object.assign(envelope.parameters, decision.patch);
        }
    }

    // 4. Reserve Funds (Ledger)
    const reserveResult = ledger.reserve({
        requestId: envelope.id,
        tenantId: tenant,
        budgetScopes: scopes,
        amount: decision.estimated_cost,
        currency: decision.currency,
        meta: { tool: envelope.action, scopes }
    });

    if (!reserveResult.success) {
        const errorMsg = `Ledger Reservation Failed: ${reserveResult.error}`;
        console.warn(`[ECON] ${errorMsg}`);
        ctx.stepResults.error = {
            code: 'LEDGER_CONFLICT',
            message: errorMsg,
            status: 409
        };
        throw new Error('LEDGER_CONFLICT');
    }

    // Pass info to downstream (Settlement)
    if (!ctx.stepResults.economic) ctx.stepResults.economic = { cost: 0, currency: 'EUR' };
    ctx.stepResults.economic.cost = decision.estimated_cost;
    ctx.stepResults.economic.currency = decision.currency;
    ctx.stepResults.economic.reserve_id = reserveResult.reserveId;
    ctx.stepResults.economic.budget_scopes = scopes;
};
