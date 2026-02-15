import { PipelineContext } from '../core/contract';
import { Interceptor } from '../core/pipeline';
import { IdentityManager } from '../core/auth/identity_manager';

/**
 * Interceptor 00: Authentication & Identity
 * Extracts Key ID from Authorization header and sets Identity in context.
 */
export const auth: Interceptor = async (context: PipelineContext) => {
    const authHeader = context.request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Enforce identity for auditing in Enterprise Phase
        throw new Error('AUTH_MISSING');
    }

    const keyId = authHeader.replace('Bearer ', '');
    const identity = await IdentityManager.getIdentity(keyId);

    if (!identity) {
        throw new Error('INVALID_IDENTITY');
    }

    // Store identity in context for downstream interceptors
    context.identity = identity;

    // Ensure tenant_id isolation
    const urlTenant = (context.request.params as any).tenant;
    if (urlTenant && urlTenant !== identity.tenantId && identity.role !== 'admin') {
        throw new Error('TENANT_ISOLATION_VIOLATION');
    }

    return;
};
