import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DatabaseAdapter } from './db_interface';

export class SqliteAdapter implements DatabaseAdapter {
    private sqlite: Database.Database;
    private transactionQueue: Promise<any> = Promise.resolve();

    constructor(dbPath?: string) {
        const finalPath = dbPath || process.env.TEST_DB_PATH || path.resolve(__dirname, '../../mcp.sqlite');
        this.sqlite = new Database(finalPath);
        console.log(`[SqliteAdapter] Connected to: ${finalPath}`);
        this.runMigrations();
    }

    private runMigrations() {
        // Reuse existing migration logic
        const migrations = [
            { name: '001_pricing', path: path.resolve(__dirname, '../../migrations/001_pricing.sql') },
            { name: '002_budgets', path: path.resolve(__dirname, '../../migrations/002_budgets.sql') },
            { name: '003_ratelimits', path: path.resolve(__dirname, '../../migrations/003_ratelimits.sql') },
            { name: '004_ledger', path: path.resolve(__dirname, '../../migrations/004_ledger.sql') },
            { name: '005_ledger_v2', path: path.resolve(__dirname, '../../migrations/005_ledger_v2.sql') },
            { name: '006_key_registry', path: path.resolve(__dirname, '../../migrations/006_key_registry.sql') },
            { name: '007_receipt_ledger', path: path.resolve(__dirname, '../../migrations/007_receipt_ledger.sql') },
            { name: '008_immutable_receipts', path: path.resolve(__dirname, '../../migrations/008_immutable_receipts.sql') },
            { name: '009_identity_rbac', path: path.resolve(__dirname, '../../migrations/009_identity_rbac.sql') },
            { name: '010_audit_retention', path: path.resolve(__dirname, '../../migrations/010_audit_retention.sql') },
            { name: '011_billing_closures', path: path.resolve(__dirname, '../../migrations/011_billing_closures.sql') },
            { name: '012_iam_robust', path: path.resolve(__dirname, '../../migrations/012_iam_robust.sql') },
            { name: '013_audit_log', path: path.resolve(__dirname, '../../migrations/013_audit_log.sql') },
            { name: '014_billing_engine', path: path.resolve(__dirname, '../../migrations/014_billing_engine.sql') },
            { name: '015_settlement', path: path.resolve(__dirname, '../../migrations/015_settlement.sql') },
            { name: '016_auth_expansion', path: path.resolve(__dirname, '../../migrations/016_auth_expansion.sql') },
            { name: '017_multi_tenant_expansion', path: path.resolve(__dirname, '../../migrations/017_multi_tenant_expansion.sql') },
            { name: '018_granular_governance', path: path.resolve(__dirname, '../../migrations/018_granular_governance.sql') },
            { name: '019_real_governance', path: path.resolve(__dirname, '../../migrations/019_real_governance.sql') },
            { name: '020_tenant_settings', path: path.resolve(__dirname, '../../migrations/020_tenant_settings.sql') },
            { name: '021_deployments', path: path.resolve(__dirname, '../../migrations/021_deployments.sql') },
            { name: '022_upstreams', path: path.resolve(__dirname, '../../migrations/022_upstreams.sql') }
        ];

        for (const m of migrations) {
            if (fs.existsSync(m.path)) {
                try {
                    const sql = fs.readFileSync(m.path, 'utf-8');
                    this.sqlite.exec(sql);
                } catch (e: any) {
                    console.error(`[SqliteAdapter] Migration ${m.name} failed:`, e.message);
                }
            }
        }
    }

    raw = {
        transaction: async <T>(fn: (...args: any[]) => Promise<T> | T): Promise<T> => {
            const result = new Promise<T>((resolve, reject) => {
                this.transactionQueue = this.transactionQueue.then(async () => {
                    this.sqlite.prepare('BEGIN').run();
                    try {
                        const res = await fn();
                        this.sqlite.prepare('COMMIT').run();
                        resolve(res);
                    } catch (e) {
                        this.sqlite.prepare('ROLLBACK').run();
                        reject(e);
                    }
                }).catch(() => {
                    // Failures in one transaction shouldn't block the next one
                });
            });
            return result;
        },
        run: async (sql: string, params: any[] = []) => {
            return this.sqlite.prepare(sql).run(params);
        },
        query: async (sql: string, params: any[] = []) => {
            return this.sqlite.prepare(sql).all(params);
        }
    };

    chain = {
        getHead: async (scopeId: string) => {
            return this.sqlite.prepare('SELECT * FROM chain_state WHERE scope_id = @scopeId').get({ scopeId });
        },
        initChain: async (scopeId: string, genesisHash: string, receiptId: string) => {
            const now = Date.now();
            this.sqlite.prepare(`
                INSERT INTO chain_state (scope_id, last_hash, last_receipt_id, updated_at, sequence)
                VALUES (@scopeId, @genesisHash, @receiptId, @now, 1)
            `).run({ scopeId, genesisHash, receiptId, now });
        },
        advance: async (scopeId: string, newHash: string, receiptId: string, oldHash: string) => {
            const now = Date.now();
            const res = this.sqlite.prepare(`
                UPDATE chain_state 
                SET last_hash = @newHash, last_receipt_id = @receiptId, updated_at = @now, sequence = sequence + 1
                WHERE scope_id = @scopeId AND last_hash = @oldHash
            `).run({ scopeId, newHash, receiptId, now, oldHash });
            if (res.changes === 0) throw new Error('CONCURRENCY_VIOLATION: Chain moved under feet');
        },
        storeReceipt: async (receipt: any, hash: string, signature: string) => {
            this.sqlite.prepare(`
                INSERT INTO ledger_receipts (receipt_id, tenant_id, request_id, created_at, receipt_json, hash, prev_hash, signature)
                VALUES (@receipt_id, @tenant_id, @request_id, @created_at, @json, @hash, @prev_hash, @signature)
            `).run({
                receipt_id: receipt.receipt_id,
                tenant_id: receipt.meta.tenant_id,
                request_id: receipt.request_id,
                created_at: new Date(receipt.timestamps.created_at).getTime(),
                json: JSON.stringify(receipt),
                hash,
                prev_hash: receipt.proof.prev_receipt_hash,
                signature
            });
        }
    };

    pricing = {
        upsert: async (rate: any) => {
            this.sqlite.prepare(`
                INSERT INTO pricing_tiers (provider, model, endpoint, region, tier, input_price, output_price, flat_fee, effective_from, effective_to, created_at)
                VALUES (@provider, @model, @endpoint, @region, @tier, @input_price, @output_price, @flat_fee, @effective_from, @effective_to, @created_at)
            `).run(rate);
        },
        findActive: async (criteria: any) => {
            const stmt = this.sqlite.prepare(`
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
        clear: async () => {
            this.sqlite.prepare('DELETE FROM pricing_tiers').run();
        }
    };

    budgets = {
        upsert: async (budget: any) => {
            this.sqlite.prepare(`
                INSERT OR REPLACE INTO budgets (id, scope_type, scope_id, period, hard_limit, soft_limit, currency, active_from, active_to, created_at)
                VALUES (@id, @scope_type, @scope_id, @period, @hard_limit, @soft_limit, @currency, @active_from, @active_to, @created_at)
            `).run(budget);
        },
        get: async (budgetId: string) => {
            return this.sqlite.prepare(`
                SELECT b.*, COALESCE(s.spent_estimated, 0.0) as spent
                FROM budgets b
                LEFT JOIN budget_spending s ON b.id = s.budget_id
                WHERE b.id = @id
            `).get({ id: budgetId });
        },
        incrementSpend: async (budgetId: string, amount: number) => {
            this.sqlite.prepare(`
                INSERT INTO budget_spending (budget_id, spent_estimated, last_updated_at)
                VALUES (@id, @amount, @now)
                ON CONFLICT(budget_id) DO UPDATE SET
                    spent_estimated = spent_estimated + @amount,
                    last_updated_at = @now
            `).run({ id: budgetId, amount, now: Date.now() });
        },
        clear: async () => {
            this.sqlite.prepare('DELETE FROM budget_spending').run();
            this.sqlite.prepare('DELETE FROM budgets').run();
        }
    };

    rates = {
        checkAndIncrement: async (key: string, amount: number, limit: number, windowMs: number): Promise<boolean> => {
            const now = Date.now();
            const expiresAt = now + windowMs;
            const row = this.sqlite.prepare('SELECT * FROM rate_limits WHERE key = @key').get({ key }) as any;
            if (!row) {
                if (amount > limit) return false;
                this.sqlite.prepare('INSERT INTO rate_limits (key, count, window_start, expires_at) VALUES (@key, @amount, @now, @expiresAt)').run({ key, amount, now, expiresAt });
                return true;
            }
            if (now > row.expires_at) {
                if (amount > limit) return false;
                this.sqlite.prepare('UPDATE rate_limits SET count = @amount, window_start = @now, expires_at = @expiresAt WHERE key = @key').run({ key, amount, now, expiresAt });
                return true;
            }
            if (row.count + amount > limit) return false;
            this.sqlite.prepare('UPDATE rate_limits SET count = count + @amount WHERE key = @key').run({ key, amount });
            return true;
        }
    };

    ledger = {
        getAccount: async (id: string) => {
            return this.sqlite.prepare('SELECT * FROM ledger_accounts WHERE account_id = @id').get({ id });
        },
        upsertAccount: async (account: any) => {
            const now = Date.now();
            this.sqlite.prepare(`
                INSERT INTO ledger_accounts (account_id, scope_type, scope_id, currency, hard_limit, soft_limit, updated_at)
                VALUES (@id, @scope_type, @scope_id, @currency, @hard_limit, @soft_limit, @now)
                ON CONFLICT(account_id) DO UPDATE SET hard_limit = @hard_limit, soft_limit = @soft_limit, updated_at = @now
            `).run({ ...account, now });
        },
        updateBalance: async (id: string, reservedDelta: number, settledDelta: number) => {
            const now = Date.now();
            this.sqlite.prepare(`
                UPDATE ledger_accounts 
                SET reserved_total = reserved_total + @reservedDelta, settled_total = settled_total + @settledDelta, updated_at = @now
                WHERE account_id = @id
            `).run({ id, reservedDelta, settledDelta, now });
        },
        insertEntry: async (entry: any) => {
            const now = Date.now();
            const info = this.sqlite.prepare(`
                INSERT INTO ledger_entries (request_id, tenant_id, type, amount, currency, status, reason_codes, created_at)
                VALUES (@request_id, @tenant_id, @type, @amount, @currency, @status, @reason_codes, @now)
            `).run({ ...entry, now });
            return Number(info.lastInsertRowid);
        },
        createReservation: async (res: any) => {
            const now = Date.now();
            this.sqlite.prepare(`
                INSERT OR REPLACE INTO ledger_reservations (request_id, reserve_entry_id, state, amount_reserved, budget_scopes, expires_at, updated_at)
                VALUES (@request_id, @reserve_entry_id, 'RESERVED', @amount, @budget_scopes, @expires_at, @now)
            `).run({ ...res, now });
        },
        updateReservationState: async (requestId: string, state: string, settledAmount: number) => {
            const now = Date.now();
            this.sqlite.prepare(`
                UPDATE ledger_reservations SET state = @state, amount_settled = @settledAmount, updated_at = @now WHERE request_id = @requestId
            `).run({ requestId, state, settledAmount, now });
        },
        getReservation: async (requestId: string) => {
            return this.sqlite.prepare('SELECT * FROM ledger_reservations WHERE request_id = @requestId').get({ requestId });
        },
        getExpiredReservations: async (now: number) => {
            return this.sqlite.prepare("SELECT * FROM ledger_reservations WHERE state = 'RESERVED' AND expires_at < @now").all({ now }) as any[];
        }
    };

    keys = {
        getActiveKey: async (keyId: string) => {
            return this.sqlite.prepare("SELECT * FROM key_registry WHERE key_id = @id AND status = 'active'").get({ id: keyId });
        },
        upsertKey: async (key: any) => {
            const now = Date.now();
            this.sqlite.prepare(`
                INSERT INTO key_registry (key_id, public_key, status, created_at)
                VALUES (@key_id, @public_key, @status, @now)
                ON CONFLICT(key_id) DO UPDATE SET public_key = @public_key, status = @status
            `).run({ ...key, now });
        }
    };
}
