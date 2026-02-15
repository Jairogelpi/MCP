-- Migration 013: Audit & Retention
-- Provides append-only logs and policy-based lifecycles

-- 1. Audit Events (Append-only)
CREATE TABLE IF NOT EXISTS audit_events (
    event_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    status TEXT NOT NULL,
    payload TEXT, -- JSON blob
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_events(tenant_id, created_at);

-- 2. Retention Policies
CREATE TABLE IF NOT EXISTS retention_policies (
    tenant_id TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'audit', 'receipt', 'trace'
    retention_days INTEGER NOT NULL DEFAULT 365,
    PRIMARY KEY (tenant_id, resource_type)
);

-- 3. Legal Holds
CREATE TABLE IF NOT EXISTS legal_holds (
    tenant_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, resource_type)
);

-- Seed default global policies (Safely)
INSERT OR IGNORE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES ('*', 'audit', 365);
INSERT OR IGNORE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES ('*', 'receipt', 730);
INSERT OR IGNORE INTO retention_policies (tenant_id, resource_type, retention_days) VALUES ('*', 'trace', 30);
