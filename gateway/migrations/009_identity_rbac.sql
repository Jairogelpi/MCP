-- Enterprise Identity & RBAC Enhancement
ALTER TABLE key_registry ADD COLUMN role TEXT DEFAULT 'tenant'; -- admin, tenant, auditor, operator
ALTER TABLE key_registry ADD COLUMN scopes TEXT DEFAULT '*'; -- JSON array or comma-separated list
ALTER TABLE key_registry ADD COLUMN expires_at INTEGER;
ALTER TABLE key_registry ADD COLUMN rotation_parent_id TEXT; -- Link to previous key if rotated
