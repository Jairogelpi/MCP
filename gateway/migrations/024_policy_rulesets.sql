-- Migration 024: Policy Rulesets (ABAC Storage)
-- Stores versioned policy rulesets for tenants.

CREATE TABLE IF NOT EXISTS policy_rulesets (
    id TEXT PRIMARY KEY,               -- e.g. rule_abcd123
    tenant_id TEXT NOT NULL,
    version TEXT NOT NULL,             -- e.g. 1.0.0
    content TEXT NOT NULL,             -- JSON string of the ruleset
    checksum TEXT NOT NULL,            -- SHA256 of content
    is_active BOOLEAN DEFAULT 0,       -- Only one active per tenant usually
    created_at INTEGER NOT NULL,
    created_by TEXT,                   -- user_id of author
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Index for fast lookup of active ruleset
CREATE INDEX IF NOT EXISTS idx_policy_active ON policy_rulesets(tenant_id) WHERE is_active = 1;
