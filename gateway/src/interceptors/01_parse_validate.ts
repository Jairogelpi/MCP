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

export const parseValidate: Interceptor = async (ctx) => {
    try {
        console.log('[1] Parse & Validate START');

        const body = ctx.request.body as any;
        const headers = ctx.request.headers;

        // Use native params
        const params = (ctx.request as any).params || {};
        const tenant = String(params.tenant || 'unknown');
        const server = String(params.server || 'unknown');

        console.log(`[VALIDATE] Context Params: tenant=${tenant}, server=${server}`);

        if (!headers.authorization) {
            throw new Error('AUTH_MISSING');
        }

        // Mock Auth Extraction
        const token = headers.authorization.replace('Bearer ', '').trim();
        let role = 'user';
        let userId = 'anonymous';

        if (token === 'admin') {
            role = 'admin';
            userId = 'admin-user';
        } else if (token === 'test') {
            userId = 'test-user';
        }

        console.log(`[AUTH] Parsed Token: ${token} -> Role: ${role}, User: ${userId}`);

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

        console.log(`[VALIDATE] Checking Catalog for Tool=${toolName}`);

        if (!catalog.validateTool(server, toolName)) {
            console.warn(`[VALIDATE] Tool not found: ${server}:${toolName}`);

            ctx.stepResults.error = {
                code: 'FORBIDDEN_TOOL',
                message: `Tool '${toolName}' not found or not allowed for server '${server}'`,
                status: 404
            };
            throw new Error('FORBIDDEN_TOOL');
        }

        ctx.stepResults.raw = {
            ...body,
            _routeMeta: { tenant, server },
            _authContext: { userId, role }
        };
    } catch (err) {
        console.error('[VALIDATE] Caught Error:', err);
        // Ensure specific errors propagate as is
        const msg = (err as Error).message;
        if (msg === 'AUTH_MISSING' || msg === 'SCHEMA_MISMATCH' || msg === 'FORBIDDEN_TOOL') {
            throw err;
        }
        throw err;
    }
};
