import { Interceptor } from '../core/pipeline';
import { LedgerManager } from '../core/ledger/ledger_manager';
import { processReceipt } from '../core/receipt/chain';
import crypto from 'crypto';

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
    await ledger.settle(envelope.id, realCost, econ.budget_scopes || []);
    console.log(`[LEDGER] Settled ${realCost} EUR for ${envelope.id} (Reserved: ${econ.cost})`);

    // --- PHASE 5: RECEIPT GENERATION & CHAINING ---
    try {
        const policy = ctx.stepResults.policy;
        // Construct Canonical Receipt Payload
        const receiptId = crypto.randomUUID();
        const receipt: any = {
            receipt_id: receiptId,
            request_id: envelope.id,
            meta: {
                tenant_id: ctx.identity?.tenant_id || 'anonymous',
                project_id: ctx.identity?.project_id,
                agent_id: ctx.identity?.agent_id,
                session_id: ctx.identity?.session_id,
                upstream: econ.model || 'unknown'
            },
            operation: {
                tool_name: envelope.action || 'unknown',
                mcp_method: envelope.type || 'command'
            },
            proof: {
                request_hash: 'TODO_HASH',
                response_hash: 'TODO_ResponseHash',
                nonce: crypto.randomBytes(8).toString('hex'),
                prev_receipt_hash: ''
            },
            decision: {
                effect: 'allow',
                reason_codes: policy?.reason_codes || [],
                patch_applied: false
            },
            economic: {
                cost_settled: realCost,
                currency: 'EUR',
                usage: {},
                pricing_version: 'v1'
            },
            timestamps: {
                created_at: new Date().toISOString(),
                started_at: new Date().toISOString(),
                ended_at: new Date().toISOString()
            },
            signature: {
                alg: 'ed25519',
                key_id: 'gateway-key-v1'
            }
        };

        // Chain & Store
        const result = await processReceipt(receipt);
        console.log(`[RECEIPT] Generated & Chained: ${result.receipt_id} (Prev: ${result.proof.prev_receipt_hash.substring(0, 8)}...)`);

    } catch (err: any) {
        console.error(`[RECEIPT-ERROR] Failed to generate/chain receipt: ${err.message}`);
    }
};
