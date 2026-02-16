-- Deployments Table
CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    environment TEXT CHECK(environment IN ('prod', 'staging', 'dev')) NOT NULL DEFAULT 'dev',
    created_at INTEGER NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Loop existing keys to generic 'default' deployment? 
-- For now, just generic nullable column.
ALTER TABLE iam_keys ADD COLUMN deployment_id TEXT;
