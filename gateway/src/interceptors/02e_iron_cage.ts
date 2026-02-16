import { Interceptor } from '../core/pipeline';
import { LawEnforcer } from '../core/governance/law_enforcer';
import { SovereignSandbox } from '../core/governance/sovereign_sandbox';

const lawEnforcer = new LawEnforcer();
const sandbox = new SovereignSandbox();

/**
 * Interceptor 02e: Iron Cage (Deterministic Governance)
 * Replaces heuristic detection with formal invariant enforcement.
 * Includes Law Enforcement (Pre-condition) and Sovereign Sandbox (Post-condition).
 */
export const ironCage: Interceptor = async (context) => {
    const envelope = context.stepResults.normalized;
    if (!envelope) return;

    try {
        console.log(`[IRON-CAGE] Hard-validating laws for ${envelope.action}...`);

        // 1. Pre-condition Laws
        const preResult = await lawEnforcer.enforceInvariants(envelope);
        if (!preResult.passed) {
            throw new Error(preResult.violationCode || 'GOVERNANCE_VIOLATION');
        }

        // 2. Capability Boundaries
        const identity = context.identity || { scopes: [] };
        const isWriteAction = ['transfer', 'withdraw', 'order', 'pay'].includes(envelope.action);
        if (isWriteAction && identity.scopes?.includes('read-only')) {
            throw new Error('CAPABILITY_VIOLATION');
        }

        // 3. Post-condition Sandbox Verification
        // Note: In this pipeline, ironCage runs BEFORE upstream but AFTER economic reservation.
        // This allows us to verify the reservation scope before any real I/O happens upstream.
        const postResult = await sandbox.verifyStateTransition(envelope, context);
        if (!postResult.passed) {
            throw new Error(postResult.violationCode || 'SANDBOX_VIOLATION');
        }

        console.log('[IRON-CAGE] Deterministic check passed.');

    } catch (error: any) {
        const { logger } = require('../core/logger');
        logger.warn('iron_cage_blocked', {
            tenant_id: envelope.meta.tenant,
            tool_name: envelope.action,
            error: error.message
        });

        context.stepResults.error = {
            code: error.message,
            message: `IRON_CAGE_BLOCKED: ${error.message}`,
            status: 403
        };
        throw error;
    }
};
