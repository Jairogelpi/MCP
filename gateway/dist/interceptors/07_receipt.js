"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptInteractor = void 0;
const database_1 = require("../adapters/database");
const stream_1 = require("stream");
const receiptInteractor = async (ctx) => {
    console.log('[7] Generate Receipt (Stream-Aware)');
    const reservation = ctx.stepResults.reservation;
    if (reservation) {
        await database_1.db.reservations.commit(reservation.reservationId);
    }
    const upstreamInfo = ctx.stepResults.upstream;
    if (upstreamInfo?.isStream && upstreamInfo.stream) {
        // STREAMING MODE
        console.log('[RECEIPT] Injecting Receipt into stream (Async Iterator)');
        const receiptData = {
            transactionId: ctx.request.id,
            status: 'success',
            cost: reservation ? reservation.amount : 0,
            timestamp: Date.now(),
            details: { ...upstreamInfo, result: 'stream_completed', stream: undefined }
        };
        // Wrapper generator to inject receipt at the end
        async function* receiptWrapper(source) {
            console.log('[WRAPPER] Starting to consume source');
            try {
                for await (const chunk of source) {
                    console.log(`[WRAPPER] Yielding chunk: ${chunk.toString().substring(0, 20)}...`);
                    yield chunk;
                }
                console.log('[WRAPPER] Source ended. Yielding receipt.');
                yield `event: receipt\ndata: ${JSON.stringify(receiptData)}\n\n`;
            }
            catch (err) {
                console.error('[WRAPPER] Error consuming source:', err);
                throw err;
            }
        }
        ctx.stepResults.upstream.stream = stream_1.Readable.from(receiptWrapper(upstreamInfo.stream));
        ctx.stepResults.receipt = undefined;
    }
    else {
        const errorDetails = ctx.stepResults.error;
        const receipt = {
            transactionId: ctx.request.id,
            status: errorDetails ? 'failure' : 'success',
            error: errorDetails ? { code: errorDetails.code, message: errorDetails.message } : undefined,
            details: upstreamInfo,
            cost: reservation ? reservation.amount : 0,
            timestamp: Date.now()
        };
        ctx.stepResults.receipt = receipt;
    }
};
exports.receiptInteractor = receiptInteractor;
