# Runbook: Policy Deny Spike (PII/SSRF)

**Severity**: MEDIUM
**Status**: Unexpected increase in `FORBIDDEN_TOOL` or `DENY` decisions.

## Impact
- False positives blocking legitimate traffic.
- Active attack (SSRF attempt or PII leak).

## Diagnostic Steps
1. **Filter Logs**: Search for `policy_decision: DENY` in Loki.
2. **Identify Patterns**: Are denials coming from a specific `tenant_id` or `target_url`?
3. **Check PII Triggers**: See if new tool output patterns are accidentally triggering regex rules in `03_policy.ts`.

## Recovery Steps
1. **Tweak Regex**: If false positives, relax the PII patterns in `src/interceptors/03_policy.ts`.
2. **Revoke API Key**: If an active exploit is detected, rotate the tenant's Bearer token.
3. **Allowlist URL**: If a legitimate internal URL is blocked by SSRF logic, add it to the egress allowlist.
