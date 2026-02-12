import { Interceptor } from '../core/pipeline';
import { Receipt } from '../core/contract';
import { db } from '../adapters/database';

export const receiptInteractor: Interceptor = async (ctx) => {
    console.log('[7] Generate Receipt');

    const reservation = ctx.stepResults.reservation;
    if (reservation) {
        await db.reservations.commit(reservation.reservationId);
    }

    // If there was an error upstream or earlier (and handled but not stopped), include it
    const errorDetails = ctx.stepResults.error;

    const receipt: Receipt = {
        transactionId: ctx.request.id,
        status: errorDetails ? 'failure' : 'success',
        error: errorDetails ? { code: errorDetails.code, message: errorDetails.message } : undefined,
        details: ctx.stepResults.upstream,
        cost: reservation ? reservation.amount : 0,
        timestamp: Date.now()
    };

    ctx.stepResults.receipt = receipt;
};
