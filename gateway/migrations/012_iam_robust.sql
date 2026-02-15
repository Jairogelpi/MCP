-- RBAC & IAM Robust Schema (8.2)

CREATE TABLE IF NOT EXISTS iam_roles (
    role_id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS iam_permissions (
    perm_id TEXT PRIMARY KEY,
    scope_name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS iam_role_permissions (
    role_id TEXT NOT NULL,
    perm_id TEXT NOT NULL,
    PRIMARY KEY (role_id, perm_id),
    FOREIGN KEY (role_id) REFERENCES iam_roles(role_id),
    FOREIGN KEY (perm_id) REFERENCES iam_permissions(perm_id)
);

CREATE TABLE IF NOT EXISTS iam_users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS iam_user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES iam_users(user_id),
    FOREIGN KEY (role_id) REFERENCES iam_roles(role_id)
);

CREATE TABLE IF NOT EXISTS iam_keys (
    key_id TEXT PRIMARY KEY, -- Public ID (e.g. mcp_abc123)
    key_hash TEXT NOT NULL,  -- Hashed secret
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    scopes TEXT DEFAULT '',  -- JSON string or comma-separated
    status TEXT DEFAULT 'active', -- active, rotated, revoked
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    rotation_parent_id TEXT,
    FOREIGN KEY (user_id) REFERENCES iam_users(user_id)
);

-- Seed basic roles
INSERT OR IGNORE INTO iam_roles (role_id, name) VALUES ('role_admin', 'admin'), ('role_viewer', 'viewer');

-- Seed permissions
INSERT OR IGNORE INTO iam_permissions (perm_id, scope_name) VALUES 
('p_mp', 'manage_policies'), 
('p_mb', 'manage_budgets'), 
('p_mpr', 'manage_pricing'), 
('p_rr', 'read_receipts'), 
('p_vr', 'verify_receipts'),
('p_ex', 'execute_tools');

-- Seed Role Permissions
-- Admin gets everything (*)
INSERT OR IGNORE INTO iam_role_permissions (role_id, perm_id) 
SELECT 'role_admin', perm_id FROM iam_permissions;

-- Viewer only gets read
INSERT OR IGNORE INTO iam_role_permissions (role_id, perm_id) VALUES 
('role_viewer', 'p_rr'), 
('role_viewer', 'p_vr');
