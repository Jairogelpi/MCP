-- Migration: 026_iam_agents.sql
-- Description: Introduces the Agent entity for non-human identity management.

CREATE TABLE IF NOT EXISTS iam_agents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role_id TEXT NOT NULL DEFAULT 'role_operator',
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY(role_id) REFERENCES iam_roles(role_id)
);

-- Link API Keys to Agents (optional, either user_id OR agent_id must be present)
ALTER TABLE iam_keys ADD COLUMN agent_id TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON iam_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_keys_agent ON iam_keys(agent_id);
