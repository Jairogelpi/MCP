-- Migration 014: Billing Engine & Period Management

-- 1. Billing Periods (Monthly/Quarterly)
CREATE TABLE IF NOT EXISTS billing_periods (
    period_id TEXT PRIMARY KEY, -- e.g. "acme:2024-02"
    tenant_id TEXT NOT NULL,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED, SEALED
    created_at INTEGER NOT NULL
);

-- 2. Invoices (The document)
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    period_id TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, FINAL, PAID
    issued_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (period_id) REFERENCES billing_periods(period_id)
);

-- 3. Invoice Lines (Granular breakdown)
CREATE TABLE IF NOT EXISTS invoice_lines (
    line_id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    reference_ledger_id TEXT, -- aggregated from multiple if needed
    created_at INTEGER NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON invoices(tenant_id, period_id);
