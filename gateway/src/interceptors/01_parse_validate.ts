import { Interceptor } from '../core/pipeline';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { CatalogManager } from '../core/catalog_manager';

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const envelopeSchema = {
    type: 'object',
    properties: {
        type: { enum: ['command', 'query'] },
        action: { type: 'string' },
        version: { type: 'string' },
        parameters: { type: 'object' },
        meta: {
            type: 'object',
            properties: {}
        }
    },
    required: ['type', 'action', 'parameters']
};

const validateEnvelope = ajv.compile(envelopeSchema);
const catalog = CatalogManager.getInstance();

import { trace, SpanStatusCode } from '@opentelemetry/api';

const RECENT_REQUESTS = new Set<string>();
const MAX_REQUEST_CACHE = 10000;
const CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export const parseValidate: Interceptor = async (ctx) => {
    const tracer = trace.getTracer('mcp-gateway');
    return tracer.startActiveSpan('interceptor.parse_validate', async (span) => {
        try {
            console.log('[1] Parse & Validate START');

            const body = ctx.request.body as any;
            const params = (ctx.request as any).params || {};
            const tenant = String(params.tenant || 'unknown');
            const server = String(params.server || 'unknown');

            span.setAttribute('tenant_id', tenant);
            span.setAttribute('upstream_server', server);

            // 1. Mandatory Metadata (Replay Protection)
            const { request_id, timestamp } = body;

            if (!request_id || !timestamp) {
                console.warn('[VALIDATE] Missing request_id or timestamp');
                throw new Error('MISSING_REPLAY_METADATA');
            }

            // A. Duplication Check
            if (RECENT_REQUESTS.has(request_id)) {
                console.warn(`[VALIDATE] Replay detected for request_id: ${request_id}`);
                throw new Error('REPLAY_ATTACK_DETECTED');
            }

            // B. Timestamp Drift (Stale Request)
            const drift = Math.abs(Date.now() - timestamp);
            if (drift > CLOCK_SKEW_MS) {
                console.warn(`[VALIDATE] Stale request. Drift: ${drift}ms`);
                throw new Error('STALE_REQUEST');
            }

            // C. Cache Cleanup (Simple LRU logic for MVP)
            RECENT_REQUESTS.add(request_id);
            if (RECENT_REQUESTS.size > MAX_REQUEST_CACHE) {
                const first = RECENT_REQUESTS.values().next().value;
                if (first) RECENT_REQUESTS.delete(first);
            }

            // 2. Schema Validation
            const valid = validateEnvelope(body);
            if (!valid) {
                console.warn('[VALIDATE] Schema Errors:', validateEnvelope.errors);
                ctx.stepResults.error = {
                    code: 'SCHEMA_MISMATCH',
                    message: 'Invalid ActionEnvelope format',
                    status: 400
                };
                throw new Error('SCHEMA_MISMATCH');
            }

            const actionRaw = body.action;
            const toolName: string = String(actionRaw);
            span.setAttribute('mcp.tool_name', toolName);

            if (!catalog.validateTool(server, toolName)) {
                console.warn(`[VALIDATE] Tool not found: ${server}:${toolName}`);
                ctx.stepResults.error = {
                    code: 'FORBIDDEN_TOOL',
                    message: `Tool '${toolName}' not found or not allowed for server '${server}'`,
                    status: 404
                };
                throw new Error('FORBIDDEN_TOOL');
            }

            // Success: Populate result
            ctx.stepResults.raw = {
                ...body,
                _routeMeta: { tenant, server }
            };

            span.setStatus({ code: SpanStatusCode.OK });
        } catch (err: any) {
            console.error('[VALIDATE] Caught Error:', err);
            span.recordException(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            throw err;
        } finally {
            span.end();
        }
    });
};
