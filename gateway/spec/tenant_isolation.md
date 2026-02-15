# Tenant Isolation Specification

## 1. Structural Isolation
- **Identity Scope**: Every request is tagged with a `tenant_id` at the `IdentityManager` level.
- **Query Hardening**: All database queries MUST include `WHERE tenant_id = ?` to prevent cross-tenant data access.
- **Key Registry**: API Keys are globally unique but strictly owned by one tenant.

## 2. Resource Isolation
- **Rate Limits**: Quotas are enforced per tenant (e.g., total tokens/minute).
- **Budgets**: Thresholds are isolated such that Tenant B hitting their budget never impacts Tenant A.
- **Egress Policies**: Alllists and blocklists are scoped to the tenant context.

## 3. Audit & Logging Isolation
- **Audit Trails**: Every event produced by a tenant's activity is only visible in that tenant's forensic export.
- **No Shared State**: In-memory caches (like rate limit buckets) use `tenant_id` as part of the key prefix.
