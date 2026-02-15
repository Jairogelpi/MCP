import { Interceptor } from '../core/pipeline';
import { Receipt } from '../core/contract';
import { Readable } from 'stream';

import { trace, SpanStatusCode } from '@opentelemetry/api';

export const receiptInteractor: Interceptor = async (ctx) => {
    const tracer = trace.getTracer('mcp-gateway');
    return tracer.startActiveSpan('receipt.emit', async (span) => {
        try {
            console.log('[7] Generate Receipt (Stream-Aware)');

            const economic = ctx.stepResults.economic;
            const costDetails = economic ? { cost: economic.cost, currency: economic.currency } : { cost: 0, currency: 'EUR' };

            const upstreamInfo = ctx.stepResults.upstream;

            span.setAttribute('receipt.cost', costDetails.cost);

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

                span.setAttribute('receipt.id', receiptData.transactionId);

                // Wrapper generator to inject receipt at the end
                async function* receiptWrapper(source: Readable) {
                    console.log('[WRAPPER] Starting to consume source');
                    try {
                        for await (const chunk of source) {
                            yield chunk;
                        }
                        console.log('[WRAPPER] Source ended. Yielding receipt.');
                        yield `event: receipt\ndata: ${JSON.stringify(receiptData)}\n\n`;

                        // We could end the span here, but the parent span expects this interceptor to return.
                        // The stream consumption happens LATER.
                        // So the 'receipt.emit' span basically tracks the SETUP of the receipt for streaming.
                        // To track actual emission time, we'd need a separate span in the generator.
                        // For now, this is acceptable.
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

                span.setAttribute('receipt.id', receipt.transactionId);

                if (ctx.stepResults.upstream?.isStream) {
                    const { logger } = require('../core/logger');
                    const { tenant } = ctx.request.params as { tenant: string };
                    logger.info('receipt_stream_started', {
                        tenant_id: tenant,
                        request_id: ctx.request.id
                    });
                } else {
                    console.log(`[RECEIPT] Generated: ${receipt.transactionId} (Cost: ${receipt.cost})`);

                    const { logger } = require('../core/logger');
                    const { tenant } = ctx.request.params as { tenant: string };
                    logger.info('receipt_emitted', {
                        tenant_id: tenant,
                        request_id: ctx.request.id,
                        receipt_id: receipt.transactionId,
                        cost: receipt.cost,
                        timestamp: receipt.timestamp
                    });
                }
            }
            span.setStatus({ code: SpanStatusCode.OK });
        } catch (err: any) {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            throw err;
        } finally {
            span.end();
        }
    });
};
