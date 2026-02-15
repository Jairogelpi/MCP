# IAM Specification (v0.1.0)

## 1. Data Model

### Tables
- **`iam_roles`**: `role_id` (PK), `name` (admin, viewer, etc.)
- **`iam_permissions`**: `perm_id` (PK), `scope_name` (`manage_policies`, `read_receipts`, etc.)
- **`iam_role_permissions`**: Links roles to permissions.
- **`iam_users`**: `user_id` (PK), `name`, `status`.
- **`iam_user_roles`**: Links users to roles.
- **`iam_keys`**: 
  - `key_id`: Publicly identifiable prefix (e.g., `mcp_...`).
  - `key_hash`: Hashed value of the secret key.
  - `user_id`: Owner.
  - `tenant_id`: Scope of data access.
  - `scopes`: JSON/Comma list of specific allowed actions.
  - `expires_at`: Mandatory expiration for production keys.
  - `status`: `active`, `rotated`, `revoked`.

## 2. Policy Scopes
- `manage_policies`: Write access to PEP/PDP rules.
- `manage_budgets`: Write access to financial limits.
- `manage_pricing`: Write access to pricing tiers.
- `read_receipts`: Access to audit trails.
- `verify_receipts`: Access to cryptographic verification tools.
- `execute_tools`: Permission to use the gateway proxy.

## 3. Key Lifecycle
- **Creation**: System generates a 32-byte secret, returns it ONCE. Stores `PBKDF2` hash and partial `key_id`.
- **Rotation**: `/admin/api-keys/rotate` generates a new secret, links it to the same identity, and marks the old one for "graceful termination" (default 1h) or immediate revocation.

## 4. RBAC Rules
| Role | Recommended Scopes |
|------|--------------------|
| **admin** | `*` |
| **viewer** | `read_receipts`, `verify_receipts` |
| **operator** | `manage_policies`, `manage_budgets` |
