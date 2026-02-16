-- Migration 019: Real Governance & Dynamic Policy
-- Eliminates hardcoded tool mappings and provides dynamic cost estimation parameters.

-- 1. Tool Settings & Mapping
CREATE TABLE IF NOT EXISTS tool_settings (
    tool_name TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tier TEXT DEFAULT 'standard',
    estimated_tokens_out INTEGER DEFAULT 500,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

-- Seed real mapping for core demonstration tools
INSERT OR IGNORE INTO tool_settings (tool_name, provider, model, tier, estimated_tokens_out, created_at)
VALUES 
('dangerous_op', 'openai', 'gpt-4', 'standard', 1000, 1711260000000),
('sensitive_op', 'openai', 'gpt-4', 'standard', 500, 1711260000000),
('expensive_op', 'internal', 'expensive-model', 'standard', 200, 1711260000000),
('*', 'internal', '*', 'standard', 500, 1711260000000);

-- 2. Budget Cycles Support (Future proofing)
-- Ensure we can track which period a budget record belongs to.
-- Current budgets table already has active_from/to, which we will now use correctly.

-- 3. System Config
CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO system_config (config_key, config_value, updated_at)
VALUES ('default_currency', 'EUR', 1711260000000);
