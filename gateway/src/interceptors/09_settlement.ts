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

    let realCost = econ.real_cost ?? econ.cost; // Use real if captured, else estimated

    // IF this runs, it means Success (mostly).
    ledger.settle(envelope.id, realCost, econ.budget_scopes || []);
    console.log(`[LEDGER] Settled ${realCost} EUR for ${envelope.id} (Reserved: ${econ.cost})`);
};
