-- Ledger Transactions
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id TEXT PRIMARY KEY, -- request_id
    reserve_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL, -- RESERVED, SETTLED, REFUNDED, VOIDED
    amount_reserved REAL NOT NULL,
    amount_settled REAL DEFAULT 0,
    currency TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    meta TEXT -- JSON for tool_name, upstream, breakdown
);

-- Add reserved column to budget_spending if not exists
-- SQLite doesn't support IF NOT EXISTS for column.
-- We'll try to add it, ignoring error if exists, or do it in application code?
-- Better: Create a separate migrations file that just runs the ALTER.
-- But for this project's "Simple Migration Runner", it might fail if run twice.
-- I'll use a hack or just assume clean slate? The user wants "Idempotency real".
-- For the migration runner: I can wrap in `try` block in the runner TS code?
-- Or I can just check `PRAGMA table_info`?
-- Let's put the ALTER in a separate block or file that the runner handles gracefully?
-- Or just create a new table `budget_reservations` simplifies things (no ALTER needed).
-- Sum(spent) + Sum(reservations) = Usage.

CREATE TABLE IF NOT EXISTS budget_reservations (
    budget_id TEXT PRIMARY KEY,
    reserved_amount REAL NOT NULL DEFAULT 0.0,
    last_updated_at INTEGER NOT NULL,
    FOREIGN KEY(budget_id) REFERENCES budgets(id)
);
