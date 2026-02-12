import { db } from '../../adapters/database';
import { randomUUID } from 'crypto';

export interface LedgerReservation {
    request_id: string;
    reserve_entry_id: number;
    state: 'RESERVED' | 'SETTLED' | 'VOIDED';
    amount_reserved: number;
    amount_settled: number;
    expires_at?: number;
}

export class LedgerManager {
    private static instance: LedgerManager;

    private constructor() { }

    public static getInstance(): LedgerManager {
        if (!LedgerManager.instance) {
            LedgerManager.instance = new LedgerManager();
        }
        return LedgerManager.instance;
    }

    // ACID Reserve (v2)
    public reserve(context: {
        requestId: string;
        tenantId: string;
        budgetScopes: string[];
        amount: number;
        currency: string;
        meta: any;
    }): { success: boolean; reserveId?: string; error?: string } {
        // Use synchronous transaction for atomicity in SQLite
        const transaction = db.raw.transaction(() => {
            // 1. Idempotency Check (Inside TX to prevent race)
            const existing = db.ledger.getReservation(context.requestId) as LedgerReservation | undefined;
            if (existing) {
                if (existing.state === 'RESERVED') {
                    return { success: true, reserveId: context.requestId };
                }
                if (existing.state === 'SETTLED') {
                    // Start of a "return summary" logic, but for reserve() acting as "ensure reserved",
                    // if it's already settled, we technically can't "reserve" again.
                    // But if this is a replay of the *same* request, we should probably say "OK, it's done".
                    // However, the pipeline expects a *new* reservation to settle?
                    // No, if pipeline retries, it might try to settle again.
                    // For `reserve` step specifically:
                    // If settled, we can't return a "reservation" that needs settling.
                    // We should probably error or return a status indicating "Already Done".
                    // Spec says: "si SETTLED: devuelves summary final" (implies success-like).
                    // We'll return success but maybe with a flag? 
                    // For now, let's treat as 'IDEMPOTENCY_REPLAY' error to warn caller, 
                    // OR return success and let `settle` handle it (settle is idempotent too).
                    // If we return success, caller proceeds to `settle`. `settle` checks if RESERVED.
                    // If `settle` sees SETTLED, it does nothing.
                    // So it seems safe to return success.
                    return { success: true, reserveId: context.requestId };
                }
                return { success: false, error: 'IDEMPOTENCY_REPLAY' }; // VOIDED or other
            }

            // 2. Transactional Reserve

            // Limit Check & Update Balances
            // Sort scopes to prevent deadlocks (good practice)
            const sortedScopes = [...context.budgetScopes].sort();

            for (const scope of sortedScopes) {
                let account = db.ledger.getAccount(scope) as any;
                if (!account) {
                    // Auto-migrate from legacy
                    const legacy = db.budgets.get(scope) as any;
                    if (legacy) {
                        db.ledger.upsertAccount({
                            id: legacy.id,
                            scope_type: legacy.scope_type,
                            scope_id: legacy.scope_id,
                            currency: legacy.currency,
                            hard_limit: legacy.hard_limit,
                            soft_limit: legacy.soft_limit
                        });
                        account = db.ledger.getAccount(scope) as any;
                    }
                }

                if (!account) continue; // Should fail? For now, skip.

                // Calc Available
                const used = account.settled_total + account.reserved_total;
                const available = account.hard_limit - used;

                if (context.amount > available) {
                    throw new Error('BUDGET_EXCEEDED'); // Triggers Rollback
                }

                // Update Balance (Reserved += amount)
                db.ledger.updateBalance(scope, context.amount, 0);
            }

            // Create Log
            const entryId = db.ledger.insertEntry({
                request_id: context.requestId,
                tenant_id: context.tenantId,
                type: 'RESERVE',
                amount: context.amount,
                currency: context.currency,
                status: 'APPLIED',
                reason_codes: '[]'
            });

            // Create Reservation
            db.ledger.createReservation({
                request_id: context.requestId,
                reserve_entry_id: entryId,
                amount: context.amount,
                expires_at: Date.now() + 60000
            });

            return { success: true, reserveId: context.requestId };
        });

        try {
            return transaction();
        } catch (e: any) {
            if (e.message === 'BUDGET_EXCEEDED') {
                return { success: false, error: 'BUDGET_EXCEEDED' };
            }
            console.error('[LEDGER] Reserve Failed:', e);
            return { success: false, error: 'LEDGER_ERROR' };
        }
    }

    // Settles the transaction (v3) - Handles Refunds & Overruns
    public settle(requestId: string, amountReal: number, scopes: string[]) {
        const transaction = db.raw.transaction(() => {
            // 1. Idempotency & Lock
            const res = db.ledger.getReservation(requestId) as LedgerReservation | undefined;
            if (!res) {
                console.warn(`[LEDGER] Settle failed: Reservation ${requestId} not found.`);
                return;
            }
            if (res.state !== 'RESERVED') {
                console.log(`[LEDGER] Settle idempotent: State is already ${res.state} for ${requestId}`);
                return;
            }

            // 2. Calculate Deltas
            const reserved = res.amount_reserved;
            const delta = reserved - amountReal; // Positive = Refund, Negative = Overrun

            let status = 'APPLIED';
            const reasoning: string[] = [];

            // 3. Update Balances & Check Overrun
            const sortedScopes = [...scopes].sort();
            for (const scope of sortedScopes) {
                const account = db.ledger.getAccount(scope) as any;
                if (!account) continue;

                // Release Reserve, Add Settled
                db.ledger.updateBalance(scope, -reserved, amountReal);

                // Overrun Check
                if (delta < 0) {
                    const overrun = Math.abs(delta);
                    const newUsed = account.settled_total - reserved + amountReal + account.reserved_total;
                    if (newUsed > account.hard_limit) {
                        status = 'OVERRUN_EXCEEDED';
                        reasoning.push(`LIMIT_EXCEEDED:${scope}`);
                    }
                }
            }

            // 4. Create Entries
            db.ledger.insertEntry({
                request_id: requestId,
                tenant_id: 'unknown',
                type: 'SETTLE',
                amount: amountReal,
                currency: 'EUR',
                status: status,
                reason_codes: JSON.stringify(reasoning)
            });

            if (delta > 0) {
                db.ledger.insertEntry({
                    request_id: requestId,
                    tenant_id: 'unknown',
                    type: 'REFUND',
                    amount: delta,
                    currency: 'EUR',
                    status: 'APPLIED',
                    reason_codes: '[]'
                });
            }

            // 5. Update Reservation State
            db.ledger.updateReservationState(requestId, 'SETTLED', amountReal);
        });

        try {
            transaction();
        } catch (e) {
            console.error('[LEDGER] Settle Transaction Failed:', e);
        }
    }

    public void(requestId: string, scopes: string[]) {
        const transaction = db.raw.transaction(() => {
            const res = db.ledger.getReservation(requestId) as LedgerReservation | undefined;
            if (!res || res.state !== 'RESERVED') return;

            // 1. Update State
            db.ledger.updateReservationState(requestId, 'VOIDED', 0);

            // 2. Log
            db.ledger.insertEntry({
                request_id: requestId,
                tenant_id: 'unknown',
                type: 'VOID',
                amount: 0,
                currency: 'EUR',
                status: 'APPLIED',
                reason_codes: '[]'
            });

            // 3. Release Funds
            for (const scope of scopes) {
                db.ledger.updateBalance(scope, -res.amount_reserved, 0);
            }
        });

        try {
            transaction();
        } catch (e) {
            console.error('[LEDGER] Void Transaction Failed:', e);
        }
    }
}
