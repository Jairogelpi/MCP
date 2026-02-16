-- Migration 023: Real Tool Catalog
-- Replaces (or augments) the simple 'tool_settings' with a robust catalog.

CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY, -- uuid
    upstream_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    input_schema TEXT NOT NULL, -- JSON
    schema_hash TEXT NOT NULL, -- SHA256 of canonical schema
    risk_class TEXT DEFAULT 'medium', -- low, medium, high, critical
    
    -- Metadata from Upstream
    mcp_version TEXT,
    capabilities TEXT, -- JSON array
    
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,

    UNIQUE(upstream_id, name)
);

-- Index for fast lookups during request interception
CREATE INDEX IF NOT EXISTS idx_tools_lookup ON tools(upstream_id, name);
CREATE INDEX IF NOT EXISTS idx_tools_risk ON tools(risk_class);
