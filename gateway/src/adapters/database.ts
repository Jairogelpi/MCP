import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../../mcp.sqlite');
const sqlite = new Database(dbPath);

console.log(`[DB] Connected to: ${dbPath}`);

// Migrations
const migrations = [
    { name: '001_pricing', path: path.resolve(__dirname, '../../migrations/001_pricing.sql') },
    { name: '002_budgets', path: path.resolve(__dirname, '../../migrations/002_budgets.sql') },
    { name: '003_ratelimits', path: path.resolve(__dirname, '../../migrations/003_ratelimits.sql') },
    { name: '004_ledger', path: path.resolve(__dirname, '../../migrations/004_ledger.sql') },
    { name: '005_ledger_v2', path: path.resolve(__dirname, '../../migrations/005_ledger_v2.sql') },
    { name: '006_key_registry', path: path.resolve(__dirname, '../../migrations/006_key_registry.sql') }
];

for (const m of migrations) {
    if (fs.existsSync(m.path)) {
        try {
            const sql = fs.readFileSync(m.path, 'utf-8');
            sqlite.exec(sql);
        } catch (e: any) {
            console.error(`[DB] Migration ${m.name} failed:`, e.message);
        }
    }
}

export const db = {
    raw: {
        transaction: (fn: Function) => sqlite.transaction(fn as any),
        run: (sql: string, params: any[] = []) => {
            try {
                return sqlite.prepare(sql).run(params);
            } catch (e: any) {
                console.error(`[DB-ERROR] SQL: ${sql}`, e.message);
                throw e;
            }
        },
        query: (sql: string, params: any[] = []) => {
            try {
                return sqlite.prepare(sql).all(params);
            } catch (e: any) {
                console.error(`[DB-ERROR] SQL: ${sql}`, e.message);
                throw e;
            }
        },
        prepare: (sql: string) => sqlite.prepare(sql)
    },
    pricing: {
        upsert: (rate: any) => sqlite.prepare(`
            INSERT INTO pricing_tiers (provider, model, endpoint, region, tier, input_price, output_price, flat_fee, effective_from, effective_to, created_at)
            VALUES (@provider, @model, @endpoint, @region, @tier, @input_price, @output_price, @flat_fee, @effective_from, @effective_to, @created_at)
        `).run(rate),
        findActive: (criteria: any) => {
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
        clear: () => sqlite.prepare('DELETE FROM pricing_tiers').run()
    },
    budgets: {
        upsert: (budget: any) => sqlite.prepare(`
            INSERT OR REPLACE INTO budgets (id, scope_type, scope_id, period, hard_limit, soft_limit, currency, active_from, active_to, created_at)
            VALUES (@id, @scope_type, @scope_id, @period, @hard_limit, @soft_limit, @currency, @active_from, @active_to, @created_at)
        `).run(budget),
        get: (budgetId: string) => sqlite.prepare(`
            SELECT b.*, COALESCE(s.spent_estimated, 0.0) as spent
            FROM budgets b
            LEFT JOIN budget_spending s ON b.id = s.budget_id
            WHERE b.id = @id
        `).get({ id: budgetId }),
        incrementSpend: (budgetId: string, amount: number) => sqlite.prepare(`
            INSERT INTO budget_spending (budget_id, spent_estimated, last_updated_at)
            VALUES (@id, @amount, @now)
            ON CONFLICT(budget_id) DO UPDATE SET
                spent_estimated = spent_estimated + @amount,
                last_updated_at = @now
        `).run({ id: budgetId, amount, now: Date.now() }),
        clear: () => {
            sqlite.prepare('DELETE FROM budget_spending').run();
            sqlite.prepare('DELETE FROM budgets').run();
        }
    },
    rates: {
        checkAndIncrement: (key: string, amount: number, limit: number, windowMs: number): boolean => {
            const now = Date.now();
            const expiresAt = now + windowMs;
            const row = sqlite.prepare('SELECT * FROM rate_limits WHERE key = @key').get({ key }) as any;
            if (!row) {
                if (amount > limit) return false;
                sqlite.prepare('INSERT INTO rate_limits (key, count, window_start, expires_at) VALUES (@key, @amount, @now, @expiresAt)').run({ key, amount, now, expiresAt });
                return true;
            }
            if (now > row.expires_at) {
                if (amount > limit) return false;
                sqlite.prepare('UPDATE rate_limits SET count = @amount, window_start = @now, expires_at = @expiresAt WHERE key = @key').run({ key, amount, now, expiresAt });
                return true;
            }
            if (row.count + amount > limit) return false;
            sqlite.prepare('UPDATE rate_limits SET count = count + @amount WHERE key = @key').run({ key, amount });
            return true;
        }
    },
    ledger: {
        getAccount: (id: string) => sqlite.prepare('SELECT * FROM ledger_accounts WHERE account_id = @id').get({ id }),
        upsertAccount: (account: any) => {
            const now = Date.now();
            sqlite.prepare(`
                INSERT INTO ledger_accounts (account_id, scope_type, scope_id, currency, hard_limit, soft_limit, updated_at)
                VALUES (@id, @scope_type, @scope_id, @currency, @hard_limit, @soft_limit, @now)
                ON CONFLICT(account_id) DO UPDATE SET hard_limit = @hard_limit, soft_limit = @soft_limit, updated_at = @now
            `).run({ ...account, now });
        },
        updateBalance: (id: string, reservedDelta: number, settledDelta: number) => {
            const now = Date.now();
            sqlite.prepare(`
                UPDATE ledger_accounts 
                SET reserved_total = reserved_total + @reservedDelta, settled_total = settled_total + @settledDelta, updated_at = @now
                WHERE account_id = @id
            `).run({ id, reservedDelta, settledDelta, now });
        },
        insertEntry: (entry: any) => {
            const now = Date.now();
            const info = sqlite.prepare(`
                INSERT INTO ledger_entries (request_id, tenant_id, type, amount, currency, status, reason_codes, created_at)
                VALUES (@request_id, @tenant_id, @type, @amount, @currency, @status, @reason_codes, @now)
            `).run({ ...entry, now });
            return info.lastInsertRowid;
        },
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
                UPDATE ledger_reservations SET state = @state, amount_settled = @settledAmount, updated_at = @now WHERE request_id = @requestId
            `).run({ requestId, state, settledAmount, now });
        },
        getReservation: (requestId: string) => sqlite.prepare('SELECT * FROM ledger_reservations WHERE request_id = @requestId').get({ requestId }),
        getExpiredReservations: (now: number) => sqlite.prepare('SELECT * FROM ledger_reservations WHERE state = "RESERVED" AND expires_at < @now').all({ now })
    },
    keys: {
        getActiveKey: (keyId: string) => sqlite.prepare('SELECT * FROM key_registry WHERE key_id = @id AND status = "active"').get({ id: keyId }),
        upsertKey: (key: any) => {
            const now = Date.now();
            sqlite.prepare(`
                INSERT INTO key_registry (key_id, public_key, status, created_at)
                VALUES (@key_id, @public_key, @status, @now)
                ON CONFLICT(key_id) DO UPDATE SET public_key = @public_key, status = @status
            `).run({ ...key, now });
        }
    }
};
