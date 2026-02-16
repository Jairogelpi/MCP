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

const SCOPE_PRIORITY: Record<string, number> = {
    'tool': 1,
    'user': 2,
    'dept': 3,
    'tenant': 4,
    'session': 5,
    'project': 6
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

    public async getBudget(scopeId: string): Promise<BudgetContext | undefined> {
        const row = await db.ledger.getAccount(scopeId) as any;
        if (!row) return undefined;

        // Calculate real Monthly Period
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

        return {
            id: row.account_id,
            hard_limit: row.hard_limit,
            soft_limit: row.soft_limit,
            spend: row.settled_total,
            currency: row.currency,
            period_start: periodStart,
            period_end: periodEnd
        };
    }

    // Check if adding cost would exceed limits (without committing)
    public async checkBudget(scopes: string[], estimatedCost: number): Promise<{ status: BudgetStatus; failedScope?: string }> {
        const sortedScopes = this.sortScopes(scopes);

        for (const scope of sortedScopes) {
            const row = await db.ledger.getAccount(scope) as any;
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
