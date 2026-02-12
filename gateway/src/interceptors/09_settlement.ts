import { Interceptor } from '../core/pipeline';
import { LedgerManager } from '../core/ledger/ledger_manager';

const ledger = LedgerManager.getInstance();

export const settlement: Interceptor = async (ctx) => {
    console.log('[9] Settlement (Ledger)');

    const econ = ctx.stepResults.economic;
    const envelope = ctx.stepResults.normalized;

    if (!econ || !econ.reserve_id || !envelope) {
        // Nothing reserved, nothing to settle (maybe failed before)
        return;
    }

    // Determine Real Cost
    // Ideally, upstream returns usage in response headers or body
    // For MVP, we settle the Estimated Amount (or 0 if error?)
    // If request failed (status != 200), do we refund?
    // Policy: "Charge on Attempt" or "Charge on Success"?
    // Usually AI API charges on usage (tokens generated).
    // If upstream error, usually 0 cost.

    let realCost = econ.cost; // Default to estimated

    // If we have actual usage from 05_forward or 07_receipt (e.g. usage field), use it.
    // Assuming for now verification tests settle estimated amount.

    // Status Check
    // If pipeline has error, we might be here if we use `finally` block?
    // But interceptors run sequentially.
    // If Error thrown in Pipeline, this step is SKIPPED by PipelineRunner.
    // So `settle()` must be called explicitly in error handler (VOID) or success (SETTLE).

    // IF this runs, it means Success (mostly).
    ledger.settle(envelope.id, realCost, econ.budget_scopes || []);
    console.log(`[LEDGER] Settled ${realCost} EUR for ${envelope.id}`);
};
