import { ActionEnvelope, PipelineContext } from '../contract';
import { db } from '../../adapters/database';
import { logger } from '../logger';

export interface SandboxResult {
    passed: boolean;
    reason?: string;
    violationCode?: string;
}

export class SovereignSandbox {
    /**
     * Verifies the state transition attempted by a tool.
     * This is a post-condition check that runs after the tool logic has been "simulated"
     * or before the final commit in the ledger.
     */
    async verifyStateTransition(envelope: ActionEnvelope, context: PipelineContext): Promise<SandboxResult> {
        const { action, meta } = envelope;

        // The sandbox relies on comparing pre-state vs post-state.
        // For the MVP, we verify if any economic effect matches the declared intent.

        const economic = context.stepResults.economic;
        if (!economic) return { passed: true }; // No economic impact

        // 1. Value Conservation Invariant
        // A transfer must never create or destroy money.
        if (action === 'transfer') {
            const reserveId = economic.reserve_id;
            if (!reserveId) {
                return {
                    passed: false,
                    reason: 'SANDBOX_VIOLATION: Transfer must have a valid reservation before execution',
                    violationCode: 'INVARIANT_NO_RESERVATION'
                };
            }

            // In a real sandbox, we would inspect the pending journal entries here.
            // For now, we enforce that any transfer MUST match the tenant ownership.
            if (!meta.tenant) {
                return {
                    passed: false,
                    reason: 'SANDBOX_VIOLATION: Missing tenant context for economic action',
                    violationCode: 'INVARIANT_MISSING_CONTEXT'
                };
            }
        }

        // 2. Ownership Drift Detection
        // If the tool execution attempted to touch accounts not allowed by the initial policy.
        if (economic.budget_scopes) {
            for (const scope of economic.budget_scopes) {
                if (!scope.startsWith(meta.tenant)) {
                    return {
                        passed: false,
                        reason: `SANDBOX_VIOLATION: Ownership drift detected. Action tried to touch ${scope}`,
                        violationCode: 'INVARIANT_OWNERSHIP_DRIFT'
                    };
                }
            }
        }

        return { passed: true };
    }
}
