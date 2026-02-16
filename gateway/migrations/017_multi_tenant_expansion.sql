-- Migration 017: Multi-Tenant Expansion
-- Adds formal structure for Organizations (Tenants), Member Relationships, and Invitations.

-- 1. Tenants (Organizations)
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, suspended, deleted
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES iam_users(user_id)
);

-- 2. Tenant Members (N:M relationship between users and tenants with specific roles)
CREATE TABLE IF NOT EXISTS tenant_members (
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, invited, suspended
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, user_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES iam_users(user_id),
    FOREIGN KEY (role_id) REFERENCES iam_roles(role_id)
);

-- 3. Invitations System
CREATE TABLE IF NOT EXISTS invitations (
    invite_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    inviter_id TEXT NOT NULL,
    invitee_email TEXT NOT NULL,
    role_id TEXT NOT NULL,
    token_hash TEXT NOT NULL, -- Hashed token for the link
    status TEXT DEFAULT 'pending', -- pending, accepted, expired, revoked
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (inviter_id) REFERENCES iam_users(user_id),
    FOREIGN KEY (role_id) REFERENCES iam_roles(role_id)
);

-- 4. Linking existing keys to real tenants
-- (This column already exists in iam_keys, but we ensure foreign key integrity conceptually)
-- Note: SQLite doesn't support adding FKs to existing tables easily, but we'll manage it via logic.

-- Create Index for performance
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invitee_email);
