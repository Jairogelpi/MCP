import Fastify, { FastifyInstance } from 'fastify';
import { pipelineRunner } from './core/pipeline';
import { PipelineContext } from './core/contract';
import { parseValidate } from './interceptors/01_parse_validate';
import { normalize } from './interceptors/02_normalize';
import { policy } from './interceptors/03_policy';
import { economic } from './interceptors/04_economic';
import { forward } from './interceptors/05_forward';
import { capture } from './interceptors/06_capture';
import { receiptInteractor } from './interceptors/07_receipt';
import { telemetry } from './interceptors/08_telemetry';
import { CatalogManager } from './core/catalog_manager';
import { LedgerManager } from './core/ledger/ledger_manager';
import { settlement } from './interceptors/09_settlement';
import { PipelineRunner } from './core/pipeline';

const server: FastifyInstance = Fastify({ logger: true });

// --- CONFIGURATION ---
const UPSTREAMS = [
    { id: 'finance-core', url: 'http://localhost:3001' },
    { id: 'network-service', url: 'http://localhost:3002' }
];

// --- ERROR HANDLER ---
server.setErrorHandler((error, request, reply) => {
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
    catalog.exportSnapshot('./tools_snapshot.json');
}

// --- SERVER SETUP ---

server.post('/mcp/:tenant/:server', async (request, reply) => {
    const { tenant, server } = request.params as { tenant: string; server: string };

    // Debug Params
    console.log(`[SERVER] Request Params: tenant=${tenant}, server=${server}`);

    // Create Context manually to get ref to stepResults
    const context: PipelineContext = {
        request,
        reply,
        stepResults: {
            // Initial Raw Body is set in parseValidate, but we need stepResults object exists
        }
    };

    // We can't use helper if we want to access context AFTER run.
    // So we use PipelineRunner class directly or update helper to return context.
    // Let's use the helper but pass "stepResults" via the request decoration or just rely on helper mutating valid object?
    // The helper creates a NEW context. That's a problem!
    // "const context: PipelineContext = { ... }" in pipeline.ts

    // REVERT helper usage. Use class directly.
    const runner = new PipelineRunner();

    [parseValidate, normalize, policy, economic, forward, capture, receiptInteractor, telemetry, settlement].forEach(i => runner.use(i));

    try {
        await runner.run(context);
    } catch (err: any) {
        // --- VOID RESERVATION ON ERROR ---
        const reserveId = context.stepResults.economic?.reserve_id;
        if (reserveId) {
            console.warn(`[SERVER] Error during pipeline. Voiding reservation ${reserveId}...`);
            const ledger = LedgerManager.getInstance();
            // Need request_id. From context or reservation?
            // LedgerManager.void takes request_id.
            // We stored request_id in context.stepResults.normalized?.id?
            // If normalized failed, we don't have ID.
            // But if economic ran, normalized MUST have run.
            // So we use context.stepResults.normalized.id
            const reqId = context.stepResults.normalized?.id;
            const scopes = context.stepResults.economic?.budget_scopes || [];
            if (reqId) {
                ledger.void(reqId, scopes);
                console.warn(`[SERVER] Voided reservation ${reserveId} (Request: ${reqId})`);
            }
        }
        throw err; // Re-throw to error handler
    }

    // --- SEND RESPONSE ---

    if (context.stepResults.error) {
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

const start = async () => {
    try {
        await initializeCatalog();
        const { seedData } = require('./seed_data');
        seedData();

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
