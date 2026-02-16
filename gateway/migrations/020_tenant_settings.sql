-- Migration 020: Tenant-Specific Tool Settings
-- Allows each organization to have its own AI model mapping overrides.

-- 1. Update tool_settings to be tenant-aware
-- We'll add a tenant_id column. NULL means it's a "Global Default".
ALTER TABLE tool_settings ADD COLUMN tenant_id TEXT;

-- 2. Unique constraint for (tenant_id, tool_name)
-- Note: SQLite doesn't support adding UNIQUE constraints via ALTER TABLE easily without recreating.
-- For this demo, we'll rely on the resolution logic choosing the most specific match.

-- 3. Update Existing Seeds to be Global (NULL)
UPDATE tool_settings SET tenant_id = NULL WHERE tenant_id IS NULL;

-- 4. Sample Override for ACME tenant (if exists)
INSERT OR IGNORE INTO tool_settings (tool_name, provider, model, tier, estimated_tokens_out, created_at, tenant_id)
VALUES ('dangerous_op', 'anthropic', 'claude-3-opus', 'premium', 1500, 1711260000000, 'acme');
