CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, -- 'scope_type:scope_id' (e.g., 'tenant:acme', 'project:alpha')
    scope_type TEXT NOT NULL, -- tenant, project, agent, session, tool
    scope_id TEXT NOT NULL,
    period TEXT NOT NULL, -- monthly, daily, weekly, rolling_24h, infinite
    hard_limit REAL NOT NULL,
    soft_limit REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    active_from INTEGER NOT NULL,
    active_to INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budgets_lookup ON budgets (scope_type, scope_id);

CREATE TABLE IF NOT EXISTS budget_spending (
    budget_id TEXT PRIMARY KEY,
    spent_estimated REAL NOT NULL DEFAULT 0.0,
    last_updated_at INTEGER NOT NULL,
    FOREIGN KEY(budget_id) REFERENCES budgets(id)
);
