# SOC2 Readiness Pack - MCP Gateway

This document outlines the security controls implemented in the MCP Gateway to satisfy SOC2 Trust Services Criteria (TSC).

## 1. Access Control (CC6.x)
- **Role-Based Access Control (RBAC)**: All administrative actions require a key with `admin` role. (See `src/core/auth/identity_manager.ts`).
- **Scoped API Keys**: Access to tools and data is restricted by cryptographic scopes (e.g., `read:receipts`).
- **Key Rotation**: The `key_registry` supports key status updates and rotation parent tracking for audit trails.

## 2. System Operations (CC7.x)
- **Observability**: Every request generates a full trace with correlation IDs (`trace_id`, `request_id`).
- **Real-time Alerting**: SLOs and alerts are defined for latency, error rates, and budget overruns.
- **Audit Logging**: Change events (provisioning, policy updates) are logged to the `audit_logs` system.

## 3. Risk Mitigation (CC5.x)
- **Economic Hardening**: Soft and hard budgets prevent unexpected financial exhaustion.
- **Security Hardening**: WAF-style payload inspection and Egress (anti-SSRF) protection are active for all upstream calls.

## 4. Data Integrity & Retention
- **Cryptographic Receipts**: All settled transactions are signed using Ed25519 and linked in a hash chain.
- **Retention Policies**: Multi-tier retention (90-day active, 3-year metadata) with support for `legal_hold`.

---
**Verification Evidence**:
- Test logs for RBAC enforcement.
- Export of `ledger_receipts` chain validation.
- OTEL Trace snapshots for successful/failed requests.
