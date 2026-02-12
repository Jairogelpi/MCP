import { Interceptor } from '../core/pipeline';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

let validate: any;
let ajvInstance: any; // Define outer scope

try {
    const possiblePaths = [
        path.resolve(process.cwd(), 'spec/action_envelope.schema.json'),
        path.resolve(__dirname, '../../../spec/action_envelope.schema.json')
    ];

    const foundPath = possiblePaths.find(p => fs.existsSync(p));

    if (foundPath) {
        const schema = JSON.parse(fs.readFileSync(foundPath, 'utf-8'));
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validate = ajv.compile(schema);
        ajvInstance = ajv; // Assign to outer
    } else {
        console.warn('[WARN] Schema file not found. Skipping strict validation.');
    }
} catch (e) {
    console.error('[ERROR] Failed to load schema:', e);
}

export const parseValidate: Interceptor = async (ctx) => {
    console.log('[1] Parse/Validate & Auth Check');
    const body = ctx.request.body;
    const authHeader = ctx.request.headers['authorization'];

    if (!authHeader) {
        ctx.stepResults.error = {
            code: 'AUTH_MISSING',
            message: 'Authorization header is required',
            status: 401
        };
        throw new Error('AUTH_MISSING');
    }

    if (!body) {
        ctx.stepResults.error = {
            code: 'INVALID_FORMAT',
            message: 'Missing body',
            status: 400
        };
        throw new Error('INVALID_FORMAT');
    }

    if (validate) {
        const valid = validate(body);
        if (!valid) {
            const allowedErrors = ['must have required property \'id\'', 'must have required property \'version\'', 'must have required property \'meta\''];
            const realErrors = validate.errors.filter((e: any) => !allowedErrors.includes(e.message));

            if (realErrors.length > 0) {
                // Use ajvInstance here
                const errorText = ajvInstance ? ajvInstance.errorsText(realErrors) : JSON.stringify(realErrors);

                ctx.stepResults.error = {
                    code: 'SCHEMA_MISMATCH',
                    message: `Validation failed: ${errorText}`,
                    status: 400
                };
                throw new Error('SCHEMA_MISMATCH');
            }
        }
    }

    ctx.stepResults.raw = {
        ...(body as object),
        _routeParams: (ctx.request as any).params
    };
};
