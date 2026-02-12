import { Interceptor } from '../core/pipeline';
import { PolicyDecision } from '../core/contract';

export const policy: Interceptor = async (ctx) => {
    console.log('[3] Policy Decision');

    if (!ctx.stepResults.normalized) {
        throw new Error('Missing normalized request');
    }

    // MVP: Allow everything for now, but inspect the ActionEnvelope
    // In future we check tenant quotas, user roles, etc here.

    const decision: PolicyDecision = {
        allow: true
    };

    if (!decision.allow) {
        ctx.stepResults.error = {
            code: 'POLICY_DENY',
            message: 'Policy blocked request',
            status: 403
        };
        throw new Error('POLICY_DENY');
    }

    ctx.stepResults.policy = decision;
};
