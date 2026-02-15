import Fastify, { FastifyInstance } from 'fastify';
import { pipelineRunner } from './core/pipeline';
import { PipelineContext } from './core/contract';
import { auth } from './interceptors/00_auth';
import { parseValidate } from './interceptors/01_parse_validate';
import { normalize } from './interceptors/02_normalize';
import { waf } from './interceptors/02b_waf';
import { rateLimit } from './interceptors/02c_rate_limit';
import { policy } from './interceptors/03_policy';
import { economic } from './interceptors/04_economic';
import { forward } from './interceptors/05_forward';
import { capture } from './interceptors/06_capture';
import { receiptInteractor } from './interceptors/07_receipt';
import { telemetry } from './interceptors/08_telemetry';
import { audit } from './interceptors/09_audit';
import { CatalogManager } from './core/catalog_manager';
import { LedgerManager } from './core/ledger/ledger_manager';
import { settlement } from './interceptors/09_settlement';
import { PipelineRunner } from './core/pipeline';

import { startTelemetry } from './telemetry';
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { registerAdminRoutes } from './admin/api_routes';

// Start Telemetry ASAP
startTelemetry();

const tracer = trace.getTracer('mcp-gateway');
const meter = metrics.getMeter('mcp-gateway');
const requestCounter = meter.createCounter('mcp_requests_total', { description: 'Total MCP requests' });

const server: FastifyInstance = Fastify({ logger: true });

// --- CONFIGURATION ---
const UPSTREAMS = [
    { id: 'finance-core', url: 'http://localhost:3001' },
    { id: 'network-service', url: 'http://localhost:3002' }
];

// --- ERROR HANDLER ---
server.setErrorHandler((error, request, reply) => {
    // Span is likely closed in the handler wrapper, but we can capture exception if we access the active span?
    // Hard to get active span here if scope was lost, but usually OTel handles it if using auto-instrumentation.
    // For manual, we rely on the catch block in the route handler.

    server.log.error(error);
    const msg = error.message;

    if (msg === 'AUTH_MISSING') return reply.status(401).send({ error: { code: msg, message: msg } });
    if (msg === 'SCHEMA_MISMATCH') return reply.status(400).send({ error: { code: msg, message: msg } });
    if (msg === 'FORBIDDEN_TOOL') return reply.status(404).send({ error: { code: msg, message: msg } });
    if (msg.includes('DENIED_BY_RULE') || msg.includes('SSRF') || msg === 'DEFAULT_DENY') return reply.status(403).send({ error: { code: 'POLICY_VIOLATION', message: msg } });
    if (msg === 'BUDGET_HARD_LIMIT' || msg === 'ECON_RATE_LIMIT' || msg === 'APPROVAL_REQUIRED') return reply.status(402).send({ error: { code: msg, message: msg } });
    if (msg.includes('UPSTREAM_FAILED') || msg.includes('UPSTREAM_NOT_FOUND')) return reply.status(502).send({ error: { code: 'BAD_GATEWAY', message: msg } });

    // Default
    reply.status(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: msg } });
});

// --- CATALOG INIT ---
async function initializeCatalog() {
    console.log('[INIT] Initializing Tool Catalog...');
    const catalog = CatalogManager.getInstance();

    for (const upstream of UPSTREAMS) {
        try {
            console.log(`[INIT] Fetching tools from upstream: ${upstream.id} (${upstream.url})...`);
            const response = await fetch(`${upstream.url}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    id: 1,
                    params: {}
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const json = await response.json();
            if (json.result && json.result.tools) {
                for (const tool of json.result.tools) {
                    catalog.upsertTool({
                        name: tool.name,
                        description: tool.description,
                        inputSchema: tool.inputSchema,
                        upstreamId: upstream.id
                    });
                }
                console.log(`[INIT] Loaded ${json.result.tools.length} tools from ${upstream.id}`);
            }

        } catch (err) {
            console.error(`[INIT] Failed to fetch tools from ${upstream.id}:`, err);
        }
    }

    // Virtual Tools for Testing
    if (process.env.VIRTUAL_TOOLS) {
        console.log('[INIT] Registering Virtual Tools for Testing...');
        catalog.upsertTool({
            name: 'valid_tool',
            description: 'Mock tool for degradation testing',
            inputSchema: { type: 'object' },
            upstreamId: 'finance-core'
        });
    }

    catalog.exportSnapshot('./tools_snapshot.json');
}

// --- SERVER SETUP ---

server.post('/mcp/:tenant/:server', async (request, reply) => {
    return tracer.startActiveSpan('edge.receive', async (span) => {
        const { tenant, server } = request.params as { tenant: string; server: string };
        const { logger } = require('./core/logger');

        logger.info('request_received', {
            tenant_id: tenant,
            upstream_server: server,
            method: 'POST',
            url: request.url
        });

        // Add Attributes
        span.setAttribute('tenant_id', tenant);
        span.setAttribute('upstream_server', server);
        span.setAttribute('http.method', 'POST');
        span.setAttribute('http.url', request.url);

        // Create Context manually to get ref to stepResults
        const context: PipelineContext = {
            request,
            reply,
            stepResults: {}
        };

        const runner = new PipelineRunner();

        // Register interceptors
        [auth, parseValidate, normalize, waf, rateLimit, policy, economic, forward, capture, receiptInteractor, telemetry, settlement, audit].forEach(i => runner.use(i));

        try {
            await runner.run(context);

            span.setStatus({ code: SpanStatusCode.OK });
            const toolName = context.stepResults.normalized?.action || 'unknown';

            logger.info('request_processed', {
                tenant_id: tenant,
                upstream_server: server,
                tool_name: toolName,
                outcome: 'SUCCESS',
                latency_ms: 0
            });

            requestCounter.add(1, {
                tenant_id: tenant,
                upstream_server: server,
                outcome: 'SUCCESS',
                tool_name: toolName
            });

        } catch (err: any) {
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });

            const toolName = context.stepResults.normalized?.action || 'unknown';

            logger.error('request_failed', {
                tenant_id: tenant,
                upstream_server: server,
                tool_name: toolName,
                error_code: err.message,
                outcome: 'FAILURE'
            });

            requestCounter.add(1, {
                tenant_id: tenant,
                upstream_server: server,
                outcome: 'FAILURE',
                tool_name: toolName
            });

            // --- VOID RESERVATION ON ERROR ---
            const reserveId = context.stepResults.economic?.reserve_id;
            if (reserveId) {
                console.warn(`[SERVER] Error during pipeline. Voiding reservation ${reserveId}...`);
                const ledger = LedgerManager.getInstance();
                const reqId = context.stepResults.normalized?.id;
                const scopes = context.stepResults.economic?.budget_scopes || [];
                if (reqId) {
                    await ledger.void(reqId, scopes);
                    console.warn(`[SERVER] Voided reservation ${reserveId} (Request: ${reqId})`);
                }
            }
            throw err; // Re-throw to error handler
        } finally {
            span.end();
        }

        // --- SEND RESPONSE ---

        if (context.stepResults.error) {
            requestCounter.add(1, {
                tenant_id: tenant,
                upstream_server: server,
                outcome: context.stepResults.error.code,
                tool_name: context.stepResults.normalized?.action || 'unknown'
            });
            throw new Error(context.stepResults.error.code);
        }

        const upstream = context.stepResults.upstream;
        if (upstream?.isStream && upstream.stream) {
            console.log('[SERVER] Sending Stream Response');
            return reply.send(upstream.stream);
        }

        const receipt = context.stepResults.receipt;
        if (receipt) {
            console.log('[SERVER] Sending Receipt Response');
            return reply.send(receipt);
        }

        // Fallback
        console.error('[SERVER] No response generated');
        throw new Error('NO_RESPONSE_GENERATED');
    });
});

const start = async () => {
    try {
        await initializeCatalog();
        registerAdminRoutes(server);
        const { seedData } = require('./seed_data');
        await seedData();

        // Start Ledger Reaper (Phase 4.5)
        setInterval(() => {
            LedgerManager.getInstance().reaper();
        }, 30000); // Every 30s

        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Gateway listening on 0.0.0.0:3000');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
