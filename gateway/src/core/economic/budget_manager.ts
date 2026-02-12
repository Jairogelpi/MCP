import { db } from '../../adapters/database';

export interface BudgetContext {
    id: string; // scope_id (e.g. "tenant:acme", "project:alpha")
    hard_limit: number;
    soft_limit: number;
    spend: number;
    currency: string;
    period_start: number; // timestamp
    period_end: number;   // timestamp
}

export enum BudgetStatus {
    OK = 'OK',
    SOFT_LIMIT_EXCEEDED = 'SOFT_LIMIT_EXCEEDED',
    HARD_LIMIT_EXCEEDED = 'HARD_LIMIT_EXCEEDED'
}

// Deterministic Check Order: Tool > Session > Agent > Project > Tenant
const SCOPE_PRIORITY: Record<string, number> = {
    'tool': 1,
    'session': 2,
    'agent': 3,
    'project': 4,
    'tenant': 5
};

export class BudgetManager {
    private static instance: BudgetManager;

    private constructor() { }

    public static getInstance(): BudgetManager {
        if (!BudgetManager.instance) {
            BudgetManager.instance = new BudgetManager();
        }
        return BudgetManager.instance;
    }

    // Sort scopes by priority
    private sortScopes(scopes: string[]): string[] {
        return scopes.sort((a, b) => {
            const typeA = a.split(':')[0];
            const typeB = b.split(':')[0];
            return (SCOPE_PRIORITY[typeA] || 99) - (SCOPE_PRIORITY[typeB] || 99);
        });
    }

    public getBudget(scopeId: string): BudgetContext | undefined {
        const row = db.ledger.getAccount(scopeId) as any;
        if (!row) return undefined;
        return {
            id: row.account_id,
            hard_limit: row.hard_limit,
            soft_limit: row.soft_limit,
            spend: row.settled_total,
            currency: row.currency,
            period_start: 0, // Ledger v2 doesn't track periods yet
            period_end: 0
        };
    }

    // Check if adding cost would exceed limits (without committing)
    public checkBudget(scopes: string[], estimatedCost: number): { status: BudgetStatus; failedScope?: string } {
        const sortedScopes = this.sortScopes(scopes);

        for (const scope of sortedScopes) {
            const row = db.ledger.getAccount(scope) as any;
            if (!row) continue;

            // Use unified ledger state
            const used = row.settled_total + row.reserved_total;
            const projectedSpend = used + estimatedCost;

            if (projectedSpend > row.hard_limit) {
                return { status: BudgetStatus.HARD_LIMIT_EXCEEDED, failedScope: scope };
            }

            if (projectedSpend > row.soft_limit) {
                return { status: BudgetStatus.SOFT_LIMIT_EXCEEDED, failedScope: scope };
            }
        }

        return { status: BudgetStatus.OK };
    }

    public async consumeBudget(scopes: string[], cost: number): Promise<void> {
        // Migration: Budget consumption is now handled by LedgerManager.settle()
        // No-op here to avoid double-charging, but kept for interface compatibility
    }
}
