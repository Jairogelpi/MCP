import { db } from '../../adapters/database';
import { trace, SpanStatusCode, Tracer, metrics, Counter } from '@opentelemetry/api';
import { logger } from '../logger';

const tracer = trace.getTracer('mcp-gateway');
const meter = metrics.getMeter('mcp-gateway');
const reservedCounter = meter.createCounter('ledger_reserved_total', { description: 'Total funds reserved' });
const settledCounter = meter.createCounter('ledger_settled_total', { description: 'Total funds settled' });

export interface LedgerReservation {
    request_id: string;
    reserve_entry_id: number;
    state: 'RESERVED' | 'SETTLED' | 'VOIDED';
    amount_reserved: number;
    amount_settled: number;
    budget_scopes: string; // JSON string
    expires_at?: number;
}

export interface LedgerReservationRequest {
    requestId: string;
    tenantId: string;
    budgetScopes: string[];
    amount: number;
    currency: string;
    meta: any;
}

export interface LedgerReservationResult {
    success: boolean;
    reserveId?: string;
    error?: string;
    expiresAt?: number;
}

export interface LedgerReservation {
    request_id: string;
    reserve_entry_id: number;
    state: 'RESERVED' | 'SETTLED' | 'VOIDED';
    amount_reserved: number;
    amount_settled: number;
    budget_scopes: string; // JSON string
    expires_at?: number;
}

export class LedgerManager {
    private static instance: LedgerManager;
    private failMode: 'open' | 'closed' = (process.env.LEDGER_FAIL_MODE as any) || 'closed';

    private constructor() {
        console.log(`[LEDGER] Initialized in ${this.failMode.toUpperCase()} mode.`);
    }

    public static getInstance(): LedgerManager {
        if (!LedgerManager.instance) {
            LedgerManager.instance = new LedgerManager();
        }
        return LedgerManager.instance;
    }

    // ACID Reserve (v2)
    public async reserve(context: {
        requestId: string;
        tenantId: string;
        budgetScopes: string[];
        amount: number;
        currency: string;
        meta: any;
    }): Promise<{ success: boolean; reserveId?: string; error?: string }> {
        return tracer.startActiveSpan('ledger.reserve', async (span) => {
            span.setAttribute('ledger.amount', context.amount);
            span.setAttribute('tenant_id', context.tenantId);

            try {
                const result = await db.raw.transaction(async (): Promise<{ success: boolean; reserveId?: string; error?: string }> => {
                    const existing = await db.ledger.getReservation(context.requestId) as LedgerReservation | undefined;
                    if (existing) {
                        if (existing.state === 'RESERVED' || existing.state === 'SETTLED') {
                            return { success: true, reserveId: context.requestId };
                        }
                        // If VOIDED or otherwise, we log and proceed to allow a fresh reservation
                        logger.warn('ledger_reserve_idempotency_clash', {
                            request_id: context.requestId,
                            existing_state: existing.state,
                            action: 'RE_RESERVING'
                        });
                    }

                    const sortedScopes = [...context.budgetScopes].sort();
                    for (const scope of sortedScopes) {
                        const account = await db.ledger.getAccount(scope) as any;
                        if (!account) continue;

                        const used = account.settled_total + account.reserved_total;
                        const available = account.hard_limit - used;
                        if (context.amount > available) {
                            throw new Error('BUDGET_EXCEEDED');
                        }
                        await db.ledger.updateBalance(scope, context.amount, 0);
                    }

                    const entryId = await db.ledger.insertEntry({
                        request_id: context.requestId,
                        tenant_id: context.tenantId,
                        type: 'RESERVE',
                        amount: context.amount,
                        currency: context.currency,
                        status: 'APPLIED',
                        reason_codes: '[]'
                    });

                    await db.ledger.createReservation({
                        request_id: context.requestId,
                        reserve_entry_id: entryId,
                        amount: context.amount,
                        budget_scopes: JSON.stringify(context.budgetScopes),
                        expires_at: Date.now() + 60000
                    });

                    return { success: true, reserveId: context.requestId };
                });

                if (result.success) {
                    reservedCounter.add(context.amount, { tenant_id: context.tenantId });
                    span.setStatus({ code: SpanStatusCode.OK });
                } else {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: result.error });
                }
                return result;

            } catch (e: any) {
                if (e.message === 'BUDGET_EXCEEDED') {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: 'BUDGET_EXCEEDED' });
                    return { success: false, error: 'BUDGET_EXCEEDED' };
                }

                logger.error('ledger_reserve_failed', {
                    request_id: context.requestId,
                    error: e.message,
                    fail_mode: this.failMode
                });

                if (this.failMode === 'open') {
                    console.warn(`[LEDGER] Reserve Failed (FAIL-OPEN): ${e.message}`);
                    span.setStatus({ code: SpanStatusCode.OK, message: 'FAIL_OPEN' });
                    return { success: true, reserveId: context.requestId };
                }

                console.error('[LEDGER] Reserve Failed (FAIL-CLOSED):', e);
                span.recordException(e);
                return { success: false, error: 'LEDGER_ERROR' };
            } finally {
                span.end();
            }
        });
    }

    public async settle(requestId: string, amountReal: number, scopes: string[]) {
        return tracer.startActiveSpan('ledger.settle', async (span) => {
            span.setAttribute('ledger.settle_amount', amountReal);
            try {
                await db.raw.transaction(async () => {
                    const res = await db.ledger.getReservation(requestId) as LedgerReservation | undefined;
                    if (!res) {
                        console.warn(`[LEDGER] Settle failed: Reservation ${requestId} not found.`);
                        return;
                    }
                    if (res.state !== 'RESERVED') {
                        console.log(`[LEDGER] Settle idempotent: State is already ${res.state} for ${requestId}`);
                        return;
                    }

                    const reserved = res.amount_reserved;
                    const delta = reserved - amountReal;
                    let status = 'APPLIED';
                    const reasoning: string[] = [];

                    const sortedScopes = [...scopes].sort();
                    for (const scope of sortedScopes) {
                        const account = await db.ledger.getAccount(scope) as any;
                        if (!account) continue;

                        await db.ledger.updateBalance(scope, -reserved, amountReal);

                        if (delta < 0) {
                            const overrun = Math.abs(delta);
                            const newUsed = account.settled_total - reserved + amountReal + account.reserved_total;
                            if (newUsed > account.hard_limit) {
                                status = 'OVERRUN_EXCEEDED';
                                reasoning.push(`LIMIT_EXCEEDED:${scope}`);
                                logger.warn('ledger_settle_overrun_exceeded', {
                                    request_id: requestId,
                                    scope: scope,
                                    overrun_amount: overrun,
                                    new_used: newUsed,
                                    hard_limit: account.hard_limit
                                });
                            }
                        }
                    }

                    await db.ledger.insertEntry({
                        request_id: requestId,
                        tenant_id: 'unknown',
                        type: 'SETTLE',
                        amount: amountReal,
                        currency: 'EUR',
                        status: status,
                        reason_codes: JSON.stringify(reasoning)
                    });

                    if (delta > 0) {
                        await db.ledger.insertEntry({
                            request_id: requestId,
                            tenant_id: 'unknown',
                            type: 'REFUND',
                            amount: delta,
                            currency: 'EUR',
                            status: 'APPLIED',
                            reason_codes: '[]'
                        });
                    }

                    await db.ledger.updateReservationState(requestId, 'SETTLED', amountReal);
                    settledCounter.add(amountReal, { tenant_id: 'unknown' });
                });

                logger.info('ledger_settled', {
                    request_id: requestId,
                    amount_settled: amountReal,
                    scopes: scopes
                });
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (e) {
                logger.error('ledger_settle_failed', {
                    request_id: requestId,
                    amount_real: amountReal,
                    error: (e as Error).message,
                    fail_mode: this.failMode
                });

                if (this.failMode === 'open') {
                    console.warn(`[LEDGER] Settle Failed (FAIL-OPEN): ${(e as Error).message}`);
                    span.setStatus({ code: SpanStatusCode.OK, message: 'FAIL_OPEN' });
                    return;
                }

                console.error('[LEDGER] Settle Transaction Failed:', e);
                span.recordException(e as Error);
                span.setStatus({ code: SpanStatusCode.ERROR });
            } finally {
                span.end();
            }
        });
    }

    public async void(requestId: string, scopes: string[]) {
        return tracer.startActiveSpan('ledger.void', async (span) => {
            try {
                await db.raw.transaction(async () => {
                    const res = await db.ledger.getReservation(requestId) as LedgerReservation | undefined;
                    if (!res || res.state !== 'RESERVED') {
                        logger.warn('ledger_void_skipped', {
                            request_id: requestId,
                            reason: res ? `state is ${res.state}` : 'reservation not found'
                        });
                        return;
                    }

                    await db.ledger.updateReservationState(requestId, 'VOIDED', 0);
                    await db.ledger.insertEntry({
                        request_id: requestId,
                        tenant_id: 'unknown',
                        type: 'VOID',
                        amount: 0,
                        currency: 'EUR',
                        status: 'APPLIED',
                        reason_codes: '[]'
                    });

                    for (const scope of scopes) {
                        await db.ledger.updateBalance(scope, -res.amount_reserved, 0);
                    }
                });

                logger.info('ledger_voided', { request_id: requestId, scopes });
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (e) {
                logger.error('ledger_void_failed', {
                    request_id: requestId,
                    error: (e as Error).message,
                    fail_mode: this.failMode
                });

                if (this.failMode === 'open') {
                    console.warn(`[LEDGER] Void Failed (FAIL-OPEN): ${(e as Error).message}`);
                    span.setStatus({ code: SpanStatusCode.OK, message: 'FAIL_OPEN' });
                    return;
                }

                console.error('[LEDGER] Void Transaction Failed:', e);
                span.recordException(e as Error);
                span.setStatus({ code: SpanStatusCode.ERROR });
            } finally {
                span.end();
            }
        });
    }

    public async reaper() {
        const expired = await db.ledger.getExpiredReservations(Date.now()) as LedgerReservation[];
        if (expired.length > 0) {
            console.log(`[LEDGER] Reaper: Cleaning up ${expired.length} expired reservations.`);
            logger.info('ledger_reaper_start', { count: expired.length });
            for (const res of expired) {
                try {
                    const scopes = JSON.parse(res.budget_scopes);
                    await this.void(res.request_id, scopes);
                } catch (e) {
                    console.error(`[LEDGER] Reaper failed for ${res.request_id}:`, e);
                    logger.error('ledger_reaper_item_failed', {
                        request_id: res.request_id,
                        error: (e as Error).message
                    });
                }
            }
        }
    }
}
