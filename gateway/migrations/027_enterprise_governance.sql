-- Migration 027: Enterprise Governance
-- Implements Unified Policies and Approval Workflows.

CREATE TABLE IF NOT EXISTS iam_policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,           -- Mapped to org_id in vision
    deployment_id TEXT,
    scope_type TEXT NOT NULL,          -- 'tenant', 'deployment', 'agent', 'action', 'upstream'
    scope_id TEXT,                     -- The specific ID for the scope_type
    priority INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'enforce', -- 'enforce', 'monitor'
    conditions TEXT NOT NULL,          -- JSON
    effect TEXT NOT NULL,              -- 'allow', 'deny', 'require_approval', 'transform', 'limit'
    constraints TEXT,                  -- JSON
    version TEXT NOT NULL,
    active_from INTEGER,
    active_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    envelope_hash TEXT NOT NULL,
    agent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id)
);

-- Note: Using try/ignore style logic for ALTER TABLE if needed, 
-- but in a simple migration script for SQLite we just run it.
ALTER TABLE budgets ADD COLUMN agent_id TEXT;
ALTER TABLE ledger_receipts ADD COLUMN envelope_hash TEXT;
ALTER TABLE ledger_receipts ADD COLUMN policy_version TEXT;
