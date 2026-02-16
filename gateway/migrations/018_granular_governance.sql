-- Migration 018: Universal Granular Governance
-- Implements support for Departments, Functional Scopes, and Hierarchical Budgeting.

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    dept_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- 2. Add Dept Support to Membership
-- SQLite doesn't support easy column addition with FKs, but we'll add it.
ALTER TABLE tenant_members ADD COLUMN dept_id TEXT;

-- 3. Functional Scopes (for limiting specific tools/APIs)
CREATE TABLE IF NOT EXISTS functional_scopes (
    scope_id TEXT PRIMARY KEY, -- e.g., 'mcp:finance-core:transfer'
    name TEXT NOT NULL,
    description TEXT,
    cost_weight REAL DEFAULT 1.0 -- Multiplier for cost calculation
);

-- Seed basic departments for existing tenants if needed (via logic)
-- Create Indices
CREATE INDEX IF NOT EXISTS idx_dept_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_dept ON tenant_members(dept_id);
