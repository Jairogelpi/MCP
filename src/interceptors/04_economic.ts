import { Interceptor } from '../core/pipeline';
import { db } from '../adapters/database';

export const economic: Interceptor = async (ctx) => {
    console.log('[4] Economic Reservation');

    const envelope = ctx.stepResults.normalized;
    if (!envelope) return;

    // MVP: Reserve fixed cost per action type
    const cost = envelope.type === 'command' ? 10 : 1;

    try {
        const reservation = await db.reservations.create(cost);

        ctx.stepResults.reservation = {
            reservationId: reservation.id,
            resource: 'standard_call',
            amount: cost,
            status: 'reserved'
        };
    } catch (err) {
        ctx.stepResults.error = {
            code: 'BUDGET_EXCEEDED',
            message: 'Insufficient funds',
            status: 402
        };
        throw new Error('BUDGET_EXCEEDED');
    }
};
