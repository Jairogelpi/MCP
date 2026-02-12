import { Interceptor } from '../core/pipeline';
import { Receipt } from '../core/contract';
import { Readable } from 'stream';

export const receiptInteractor: Interceptor = async (ctx) => {
    console.log('[7] Generate Receipt (Stream-Aware)');

    const economic = ctx.stepResults.economic;
    const costDetails = economic ? { cost: economic.cost, currency: economic.currency } : { cost: 0, currency: 'EUR' };

    const upstreamInfo = ctx.stepResults.upstream;

    if (upstreamInfo?.isStream && upstreamInfo.stream) {
        // STREAMING MODE
        console.log('[RECEIPT] Injecting Receipt into stream (Async Iterator)');

        const receiptData: Receipt = {
            transactionId: ctx.request.id,
            status: 'success',
            cost: costDetails.cost,
            timestamp: Date.now(),
            details: { ...upstreamInfo, result: 'stream_completed', stream: undefined, economic: costDetails }
        };

        // Wrapper generator to inject receipt at the end
        async function* receiptWrapper(source: Readable) {
            console.log('[WRAPPER] Starting to consume source');
            try {
                for await (const chunk of source) {
                    // console.log(`[WRAPPER] Yielding chunk`); // Verbose
                    yield chunk;
                }
                console.log('[WRAPPER] Source ended. Yielding receipt.');
                yield `event: receipt\ndata: ${JSON.stringify(receiptData)}\n\n`;
            } catch (err) {
                console.error('[WRAPPER] Error consuming source:', err);
                throw err;
            }
        }

        ctx.stepResults.upstream!.stream = Readable.from(receiptWrapper(upstreamInfo.stream));
        ctx.stepResults.receipt = undefined;

    } else {
        const errorDetails = ctx.stepResults.error;
        const receipt: Receipt = {
            transactionId: ctx.request.id,
            status: errorDetails ? 'failure' : 'success',
            error: errorDetails ? { code: errorDetails.code, message: errorDetails.message } : undefined,
            details: { ...upstreamInfo, economic: costDetails },
            cost: costDetails.cost,
            timestamp: Date.now()
        };
        ctx.stepResults.receipt = receipt;
        console.log(`[RECEIPT] Generated ${receipt.transactionId} (Cost: ${receipt.cost})`);
    }
};
