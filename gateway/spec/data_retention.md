# Data Retention Policy: MCP Gateway

## 1. Objectives
Ensure compliance with regional regulations (GDPR, SOC2) while maintaining historic forensic capability.

## 2. Retention Tiers

| Resource Type | Default Retention | Minimum (Legal) | Max (Performance) |
|---------------|-------------------|-----------------|-------------------|
| **Audit Logs** | 12 months | 6 months | 7 years |
| **Receipts** | 24 months | 12 months | 10 years |
| **Traces/Telemetry** | 30 days | 7 days | 90 days |
| **API Key Hashes** | Active + 30 days | N/A | Infinite |

## 3. Policy Enforcement
- **Retention Reaper**: A daily background task that identifies and purges expired records.
- **Legal Holds**: If a `legal_hold` is active for a tenant/resource, the reaper MUST skip deletion regardless of age.
- **Logical Deletion**: Records are first marked as `deleted_at`, and then physically removed after a 7-day safety window.

## 4. Deletion Protocol
- **Tenant Termination**: 30-day grace period for forensic export. 
- **Purge Confirmation**: Audit log must record who initiated a manual purge.
