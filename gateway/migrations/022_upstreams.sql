CREATE TABLE IF NOT EXISTS upstreams (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    auth_type TEXT CHECK(auth_type IN ('none', 'bearer', 'header')) NOT NULL DEFAULT 'none',
    auth_config TEXT, -- JSON with credentials (e.g. { "token": "..." })
    created_at INTEGER NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Index for fast lookup during routing
CREATE INDEX idx_upstreams_tenant ON upstreams(tenant_id);
