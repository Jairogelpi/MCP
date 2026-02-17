-- Migration: 028_agent_governance_intent.sql
-- Description: Stores the high-level governance intent (simplified config) for an agent.

CREATE TABLE IF NOT EXISTS agent_governance (
    agent_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    config_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(agent_id) REFERENCES iam_agents(id),
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id)
);
