-- Ledger v2 Schema

-- A) ledger_accounts (Current State & Configuration)
CREATE TABLE IF NOT EXISTS ledger_accounts (
    account_id TEXT PRIMARY KEY, -- e.g. 'tenant:acme', 'project:alpha'
    scope_type TEXT NOT NULL, -- tenant, project, agent, ...
    scope_id TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    hard_limit REAL NOT NULL DEFAULT 0,
    soft_limit REAL NOT NULL DEFAULT 0,
    reserved_total REAL NOT NULL DEFAULT 0, -- Active reservations
    settled_total REAL NOT NULL DEFAULT 0, -- Confirmed spend
    updated_at INTEGER NOT NULL
);

-- B) ledger_entries (Immutable Log)
CREATE TABLE IF NOT EXISTS ledger_entries (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL, -- Logical Trace ID (Idempotency Key)
    tenant_id TEXT,
    agent_id TEXT, -- Optional context
    type TEXT NOT NULL, -- RESERVE, SETTLE, REFUND, VOID
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL, -- APPLIED, REJECTED
    reason_codes TEXT, -- JSON array
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_request_id ON ledger_entries(request_id);

-- C) ledger_reservations (Active 2PC State)
CREATE TABLE IF NOT EXISTS ledger_reservations (
    request_id TEXT PRIMARY KEY,
    reserve_entry_id INTEGER, -- Link to initial entry
    state TEXT NOT NULL, -- RESERVED, SETTLED, VOIDED
    amount_reserved REAL NOT NULL,
    amount_settled REAL DEFAULT 0,
    amount_refunded REAL DEFAULT 0,
    budget_scopes TEXT NOT NULL, -- JSON array of scopes to release on VOID
    expires_at INTEGER,
    updated_at INTEGER NOT NULL
);

-- Note: We might want triggers to update ledger_accounts automatically?
-- User spec said "ledger_entries: solo INSERT... WORM-like".
-- For MVP with SQLite, we'll handle updates in Application Logic (LedgerManager).
