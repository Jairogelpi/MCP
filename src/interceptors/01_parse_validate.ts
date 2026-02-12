import { Interceptor } from '../core/pipeline';

export const parseValidate: Interceptor = async (ctx) => {
    console.log('[1] Parse/Validate & Auth Check');
    const body = ctx.request.body;
    const authHeader = ctx.request.headers['authorization'];

    // MVP Auth Check (Spec 0.3)
    if (!authHeader) {
        ctx.stepResults.error = {
            code: 'AUTH_MISSING',
            message: 'Authorization header is required',
            status: 401
        };
        // Standard way to stop pipeline might be to throw, but here we set error 
        // and we need to ensuring subsequent steps check if error exists, or we throw checks.
        // For this pipeline runner, throwing is the "stop".
        throw new Error('AUTH_MISSING');
    }

    // Validate Body
    if (!body) {
        ctx.stepResults.error = {
            code: 'INVALID_FORMAT',
            message: 'Missing body',
            status: 400
        };
        throw new Error('INVALID_FORMAT');
    }

    // Pass raw body and include route params already injected by server.ts
    ctx.stepResults.raw = {
        ...(body as object),
        _routeParams: (ctx.request as any).params // Fallback/Redundant check
    };
};
