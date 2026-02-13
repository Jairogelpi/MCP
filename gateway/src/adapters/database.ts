import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../../mcp.sqlite');
const sqlite = new Database(dbPath);

// Simple Migration Runner (for MVP)
const migrations = [
    path.resolve(__dirname, '../../migrations/001_pricing.sql'),
    path.resolve(__dirname, '../../migrations/002_budgets.sql'),
    path.resolve(__dirname, '../../migrations/003_ratelimits.sql'),
    path.resolve(__dirname, '../../migrations/004_ledger.sql'),
    path.resolve(__dirname, '../../migrations/005_ledger_v2.sql')
];

for (const migrationPath of migrations) {
    if (fs.existsSync(migrationPath)) {
        const migration = fs.readFileSync(migrationPath, 'utf-8');
        sqlite.exec(migration);
    }
}

export const db = {
    // Expose raw instance if needed
    raw: {
        transaction: (fn: Function) => {
            return sqlite.transaction(fn as any);
        },
        run: (sql: string, params: any[] = []) => {
            return sqlite.prepare(sql).run(params);
        },
        query: (sql: string, params: any[] = []) => {
            return sqlite.prepare(sql).all(params);
        },
        prepare: (sql: string) => {
            return sqlite.prepare(sql);
        }
    },

    pricing: {
        upsert: (rate: any) => {
            const stmt = sqlite.prepare(`
                INSERT INTO pricing_tiers (provider, model, endpoint, region, tier, input_price, output_price, flat_fee, effective_from, effective_to, created_at)
                VALUES (@provider, @model, @endpoint, @region, @tier, @input_price, @output_price, @flat_fee, @effective_from, @effective_to, @created_at)
            `);
            return stmt.run(rate);
        },
        findActive: (criteria: { provider: string, model: string, endpoint: string, region: string, tier: string }) => {
            // Logic: Specific match > Wildcards
            // We fetch all potential matches and filter in code or use complex query?
            // Let's use a query that ranks them.
            // 4 = Exact, 0 = Wildcard

            /*
              Score:
              Endpoint exact: +4
              Model exact: +2
              Region exact: +1
            */

            const stmt = sqlite.prepare(`
                SELECT *, 
                    (CASE WHEN endpoint = @endpoint THEN 4 ELSE 0 END) +
                    (CASE WHEN model = @model THEN 2 ELSE 0 END) +
                    (CASE WHEN region = @region THEN 1 ELSE 0 END) as score
                FROM pricing_tiers
                WHERE 
                    provider = @provider 
                    AND tier = @tier
                    AND (endpoint = @endpoint OR endpoint = '*')
                    AND (model = @model OR model = '*')
                    AND (region = @region OR region = 'global')
                    AND effective_from <= @now
                    AND (effective_to IS NULL OR effective_to > @now)
                ORDER BY score DESC
                LIMIT 1
            `);

            return stmt.get({ ...criteria, now: Date.now() });
        },
        clear: () => {
            sqlite.prepare('DELETE FROM pricing_tiers').run();
        }
    },

    budgets: {
        // Upsert budget definition
        upsert: (budget: any) => {
            // Using REPLACE for simplicity or UPSERT syntax
            const stmt = sqlite.prepare(`
                INSERT OR REPLACE INTO budgets (id, scope_type, scope_id, period, hard_limit, soft_limit, currency, active_from, active_to, created_at)
                VALUES (@id, @scope_type, @scope_id, @period, @hard_limit, @soft_limit, @currency, @active_from, @active_to, @created_at)
            `);
            return stmt.run(budget);
        },

        // Get spending state joined with budget def
        get: (budgetId: string) => {
            // Ensure spending record exists (lazy init) or left join
            const stmt = sqlite.prepare(`
                SELECT b.*, COALESCE(s.spent_estimated, 0.0) as spent
                FROM budgets b
                LEFT JOIN budget_spending s ON b.id = s.budget_id
                WHERE b.id = @id
            `);
            return stmt.get({ id: budgetId });
        },

        // Increment spend
        incrementSpend: (budgetId: string, amount: number) => {
            // Upsert spending record
            const stmt = sqlite.prepare(`
                INSERT INTO budget_spending (budget_id, spent_estimated, last_updated_at)
                VALUES (@id, @amount, @now)
                ON CONFLICT(budget_id) DO UPDATE SET
                    spent_estimated = spent_estimated + @amount,
                    last_updated_at = @now
            `);
            return stmt.run({ id: budgetId, amount, now: Date.now() });
        },

        clear: () => {
            sqlite.prepare('DELETE FROM budget_spending').run();
            sqlite.prepare('DELETE FROM budgets').run();
        }
    },

    rates: {
        // Simple Fixed Window Strategy
        checkAndIncrement: (key: string, amount: number, limit: number, windowMs: number): boolean => {
            const now = Date.now();
            const expiresAt = now + windowMs;

            // 1. Get current
            const row = sqlite.prepare('SELECT * FROM rate_limits WHERE key = @key').get({ key }) as any;

            if (!row) {
                // Initialize
                if (amount > limit) return false;
                sqlite.prepare(`
                    INSERT INTO rate_limits (key, count, window_start, expires_at)
                    VALUES (@key, @amount, @now, @expiresAt)
                `).run({ key, amount, now, expiresAt });
                return true;
            }

            // 2. Check Expiry (Reset)
            if (now > row.expires_at) {
                // Reset window
                if (amount > limit) return false; // Edge case: amount > limit even for fresh window
                sqlite.prepare(`
                    UPDATE rate_limits 
                    SET count = @amount, window_start = @now, expires_at = @expiresAt
                    WHERE key = @key
                `).run({ key, amount, now, expiresAt });
                return true;
            }

            // 3. Increment
            if (row.count + amount > limit) {
                return false; // Rate Limited
            }

            sqlite.prepare(`
                UPDATE rate_limits SET count = count + @amount WHERE key = @key
            `).run({ key, amount });

            return true;
        }
    },

    ledger: {
        // --- v2: Accounts ---
        getAccount: (id: string) => {
            return sqlite.prepare('SELECT * FROM ledger_accounts WHERE account_id = @id').get({ id });
        },
        upsertAccount: (account: any) => {
            const now = Date.now();
            sqlite.prepare(`
                INSERT INTO ledger_accounts (account_id, scope_type, scope_id, currency, hard_limit, soft_limit, updated_at)
                VALUES (@id, @scope_type, @scope_id, @currency, @hard_limit, @soft_limit, @now)
                ON CONFLICT(account_id) DO UPDATE SET
                    hard_limit = @hard_limit,
                    soft_limit = @soft_limit,
                    updated_at = @now
             `).run({ ...account, now });
        },
        updateBalance: (id: string, reservedDelta: number, settledDelta: number) => {
            const now = Date.now();
            sqlite.prepare(`
                UPDATE ledger_accounts 
                SET reserved_total = reserved_total + @reservedDelta,
                    settled_total = settled_total + @settledDelta,
                    updated_at = @now
                WHERE account_id = @id
             `).run({ id, reservedDelta, settledDelta, now });
        },

        // --- v2: Entries ---
        insertEntry: (entry: any) => {
            const now = Date.now();
            const info = sqlite.prepare(`
                INSERT INTO ledger_entries (request_id, tenant_id, type, amount, currency, status, reason_codes, created_at)
                VALUES (@request_id, @tenant_id, @type, @amount, @currency, @status, @reason_codes, @now)
             `).run({ ...entry, now });
            return info.lastInsertRowid;
        },

        // --- v2: Reservations (Active State) ---
        createReservation: (res: any) => {
            const now = Date.now();
            sqlite.prepare(`
                INSERT INTO ledger_reservations (request_id, reserve_entry_id, state, amount_reserved, budget_scopes, expires_at, updated_at)
                VALUES (@request_id, @reserve_entry_id, 'RESERVED', @amount, @budget_scopes, @expires_at, @now)
            `).run({ ...res, now });
        },
        updateReservationState: (requestId: string, state: string, settledAmount: number) => {
            const now = Date.now();
            sqlite.prepare(`
                UPDATE ledger_reservations 
                SET state = @state, amount_settled = @settledAmount, updated_at = @now
                WHERE request_id = @requestId
             `).run({ requestId, state, settledAmount, now });
        },
        getReservation: (requestId: string) => {
            return sqlite.prepare('SELECT * FROM ledger_reservations WHERE request_id = @requestId').get({ requestId });
        },
        getExpiredReservations: (now: number) => {
            return sqlite.prepare('SELECT * FROM ledger_reservations WHERE state = \'RESERVED\' AND expires_at < @now').all({ now });
        }
    },

    reservations: {
        create: async (amount: number) => {
            // For now, still dummy or could be DB
            // console.log(`[DB] Created reservation for ${amount}`);
            return { id: 'res_' + Date.now(), status: 'reserved' };
        },
        commit: async (id: string) => {
            // console.log(`[DB] Committed reservation ${id}`);
        }
    }
};
