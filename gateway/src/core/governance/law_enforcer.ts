import { ActionEnvelope } from '../contract';
import { db } from '../../adapters/database';
import { logger } from '../logger';

export interface GovernanceResult {
    passed: boolean;
    reason?: string;
    violationCode?: string;
}

export class LawEnforcer {
    /**
     * Enforces hard business invariants.
     * These are deterministic rules that cannot be bypassed by prompts.
     */
    async enforceInvariants(envelope: ActionEnvelope): Promise<GovernanceResult> {
        const { action, parameters, meta } = envelope;

        // 1. Tenant Isolation Invariant
        // Ensure the parameters (like account IDs) don't reference resources outside the tenant.
        if (parameters.accountId && !parameters.accountId.startsWith(meta.tenant)) {
            return {
                passed: false,
                reason: `CROSS_TENANT_ACCESS_DENIED: Account ${parameters.accountId} does not belong to tenant ${meta.tenant}`,
                violationCode: 'INVARIANT_TENANT_ISOLATION'
            };
        }

        // 2. Financial Invariants for 'transfer'
        if (action === 'transfer') {
            const { from, to, amount } = parameters;

            // Invariant: No self-transfers
            if (from === to) {
                return {
                    passed: false,
                    reason: 'SELF_TRANSFER_PROHIBITED',
                    violationCode: 'INVARIANT_NO_SELF_TRANSFER'
                };
            }

            // Invariant: Amount must be positive
            if (amount <= 0) {
                return {
                    passed: false,
                    reason: 'INVALID_AMOUNT: Transfer must be positive',
                    violationCode: 'INVARIANT_POSITIVE_AMOUNT'
                };
            }

            // Invariant: Source account must belong to tenant
            if (!from.startsWith(meta.tenant)) {
                return {
                    passed: false,
                    reason: `SOURCE_ACCOUNT_OWNERSHIP_VIOLATION: ${from}`,
                    violationCode: 'INVARIANT_OWNERSHIP'
                };
            }
        }

        // 3. System Law: Velocity Limits (Hard Cap)
        // This is a deterministic rate limit per tenant for high-risk actions.
        if (action === 'transfer' || action === 'withdraw') {
            const recentCount = await this.getRecentActionCount(meta.tenant, action);
            if (recentCount > 50) { // Hard limit: 50 transfers per minute per tenant
                return {
                    passed: false,
                    reason: `VELOCITY_LIMIT_EXCEEDED: Max 50 ${action}/min`,
                    violationCode: 'INVARIANT_VELOCITY'
                };
            }
        }

        return { passed: true };
    }

    private async getRecentActionCount(tenantId: string, action: string): Promise<number> {
        // Mocking velocity check - in production this uses Redis or a fast counters table
        return 0;
    }
}
