-- Real Billing & Month-End Closures
CREATE TABLE IF NOT EXISTS billing_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    period_id TEXT NOT NULL, -- YYYY-MM
    total_settled REAL NOT NULL,
    currency TEXT NOT NULL,
    tax_rate REAL NOT NULL,
    tax_amount REAL NOT NULL,
    grand_total REAL NOT NULL,
    status TEXT NOT NULL, -- closed, paid
    created_at INTEGER NOT NULL,
    UNIQUE(tenant_id, period_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_billing_tenant ON billing_closures(tenant_id, period_id);
