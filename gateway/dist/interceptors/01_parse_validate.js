"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseValidate = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let validate;
let ajvInstance; // Define outer scope
try {
    const possiblePaths = [
        path_1.default.resolve(process.cwd(), 'spec/action_envelope.schema.json'),
        path_1.default.resolve(__dirname, '../../../spec/action_envelope.schema.json')
    ];
    const foundPath = possiblePaths.find(p => fs_1.default.existsSync(p));
    if (foundPath) {
        const schema = JSON.parse(fs_1.default.readFileSync(foundPath, 'utf-8'));
        const ajv = new ajv_1.default({ allErrors: true });
        (0, ajv_formats_1.default)(ajv);
        validate = ajv.compile(schema);
        ajvInstance = ajv; // Assign to outer
    }
    else {
        console.warn('[WARN] Schema file not found. Skipping strict validation.');
    }
}
catch (e) {
    console.error('[ERROR] Failed to load schema:', e);
}
const parseValidate = async (ctx) => {
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
            const realErrors = validate.errors.filter((e) => !allowedErrors.includes(e.message));
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
        ...body,
        _routeParams: ctx.request.params
    };
};
exports.parseValidate = parseValidate;
