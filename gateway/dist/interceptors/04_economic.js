"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.economic = void 0;
const database_1 = require("../adapters/database");
const economic = async (ctx) => {
    console.log('[4] Economic Reservation');
    const envelope = ctx.stepResults.normalized;
    if (!envelope)
        return;
    // MVP: Reserve fixed cost per action type
    const cost = envelope.type === 'command' ? 10 : 1;
    try {
        const reservation = await database_1.db.reservations.create(cost);
        ctx.stepResults.reservation = {
            reservationId: reservation.id,
            resource: 'standard_call',
            amount: cost,
            status: 'reserved'
        };
    }
    catch (err) {
        ctx.stepResults.error = {
            code: 'BUDGET_EXCEEDED',
            message: 'Insufficient funds',
            status: 402
        };
        throw new Error('BUDGET_EXCEEDED');
    }
};
exports.economic = economic;
