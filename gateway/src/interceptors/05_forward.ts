import { Interceptor } from '../core/pipeline';
import { Readable } from 'stream';

const UPSTREAM_MAP: Record<string, string> = {
    'finance-core': 'http://localhost:3001',
    'network-service': 'http://localhost:3002'
};

import { trace, SpanStatusCode } from '@opentelemetry/api';

// Circuit Breaker State
interface BreakerState {
    status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailureAt: number;
}

const BREAKER_CONFIG = {
    FAIL_THRESHOLD: 5,
    OPEN_TIMEOUT_MS: 30000, // 30 seconds
};

const breakers: Record<string, BreakerState> = {};

function getBreaker(id: string): BreakerState {
    if (!breakers[id]) {
        breakers[id] = { status: 'CLOSED', failures: 0, lastFailureAt: 0 };
    }
    return breakers[id];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const forward: Interceptor = async (ctx) => {
    const tracer = trace.getTracer('mcp-gateway');
    return tracer.startActiveSpan('upstream.call', async (span) => {
        try {
            console.log('[5] Forward to Upstream');

            const envelope = ctx.stepResults.normalized;
            if (!envelope) return;

            const targetServer = envelope.meta.targetServer;
            const upstreamUrl = UPSTREAM_MAP[targetServer];
            const breaker = getBreaker(targetServer);

            span.setAttribute('upstream.id', targetServer);
            span.setAttribute('upstream.url', upstreamUrl || 'unknown');
            span.setAttribute('breaker.status', breaker.status);

            // 1. Circuit Breaker Check
            if (breaker.status === 'OPEN') {
                if (Date.now() - breaker.lastFailureAt > BREAKER_CONFIG.OPEN_TIMEOUT_MS) {
                    breaker.status = 'HALF_OPEN';
                    console.log(`[BREAKER] ${targetServer} transitioned to HALF_OPEN`);
                } else {
                    ctx.stepResults.error = {
                        code: 'CIRCUIT_BREAKER_OPEN',
                        message: `Circuit breaker for ${targetServer} is OPEN.`,
                        status: 503
                    };
                    throw new Error('CIRCUIT_BREAKER_OPEN');
                }
            }

            if (!upstreamUrl) {
                console.error(`[FORWARD] Unknown target server: ${targetServer}`);
                ctx.stepResults.error = {
                    code: 'UPSTREAM_NOT_FOUND',
                    message: `Upstream '${targetServer}' not configured`,
                    status: 502
                };
                throw new Error('UPSTREAM_NOT_FOUND');
            }

            const isStreamingAction = envelope.action.includes('stream');

            if (isStreamingAction) {
                // ... (Keep existing streaming stub)
                const stream = Readable.from(['id: 1\ndata: {"chunk":"stream_test"}\n\n']);
                ctx.reply.header('Content-Type', 'text/event-stream');
                ctx.stepResults.upstream = { isStream: true, stream, result: null, upstreamLatency: 0 };
                span.setStatus({ code: SpanStatusCode.OK });
            } else {
                let attempts = 0;
                const MAX_ATTEMPTS = 3;
                let lastErr: any;

                while (attempts < MAX_ATTEMPTS) {
                    attempts++;
                    try {
                        const startTime = Date.now();
                        const rpcRequest = {
                            jsonrpc: '2.0',
                            id: envelope.id,
                            method: 'tools/call',
                            params: { name: envelope.action, arguments: envelope.parameters }
                        };

                        const response = await fetch(upstreamUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(rpcRequest),
                            signal: AbortSignal.timeout(30000) // 30s timeout
                        });

                        if (!response.ok) {
                            if (response.status >= 500 || response.status === 429) {
                                throw new Error(`Upstream HTTP ${response.status}`);
                            }
                            // Client errors don't trigger retries or breaker
                            const json = await response.json();
                            ctx.stepResults.upstream = { isStream: false, result: json.error || json.result, upstreamLatency: Date.now() - startTime };
                            return;
                        }

                        const json = await response.json();
                        const latency = Date.now() - startTime;

                        // Success -> Reset Breaker
                        breaker.status = 'CLOSED';
                        breaker.failures = 0;

                        ctx.stepResults.upstream = { isStream: false, result: json.result, upstreamLatency: latency };
                        span.setStatus({ code: SpanStatusCode.OK });
                        return;

                    } catch (err: any) {
                        lastErr = err;
                        console.warn(`[FORWARD] Attempt ${attempts} failed for ${targetServer}: ${err.message}`);

                        if (attempts < MAX_ATTEMPTS) {
                            const delay = Math.pow(2, attempts) * 100; // Exponential backoff
                            await sleep(delay);
                        }
                    }
                }

                // All attempts failed
                breaker.failures++;
                breaker.lastFailureAt = Date.now();
                if (breaker.failures >= BREAKER_CONFIG.FAIL_THRESHOLD) {
                    breaker.status = 'OPEN';
                    console.error(`[BREAKER] ${targetServer} transitioned to OPEN`);
                }

                throw lastErr;
            }

        } catch (err: any) {
            console.error('[FORWARD] Upstream Call Failed:', err);
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });

            if (!ctx.stepResults.error) {
                ctx.stepResults.error = {
                    code: 'UPSTREAM_FAILED',
                    message: err.message,
                    status: err.message === 'CIRCUIT_BREAKER_OPEN' ? 503 : 502
                };
            }
            throw new Error('UPSTREAM_FAILED');
        } finally {
            span.end();
        }
    });
};
