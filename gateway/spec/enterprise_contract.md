# Phase 8: Enterprise Contract

**Goal**: Define the service level guarantees, security boundaries, and compliance obligations for the MCP Gateway in enterprise environments.

## 1. Resilience & SLAs
- **Standard SLA**: 99.9% availability for the Passthrough Proxy.
- **Fail-Mode Governance**:
  - **Critical Tenants**: MUST use `fail-closed` for financial transactions to ensure no non-audited spend occurs.
  - **UX-First Tenants**: MAY use `fail-open` to prioritize AI responsiveness during gateway/ledger degradation.
- **Degradation**: In the event of Telemetry outage, the gateway SHOULD continue to operate with local-only buffering.

## 2. Security Boundaries
- **Egress Monitoring**: All upstream tool calls MUST transit through the Egress Security Interceptor.
- **Secrets Management**: No tenant private keys or API keys shall be stored in plaintext. HSM or KMS integration is mandatory for `Production Mode`.
- **Identity Isolation**: Cross-tenant data access is physically and logically prevented by scope-based filtering at the DB adapter level.

## 3. Data Governance & Retention
- **WORM Storage**: Receipts are stored in an append-only (WORM) ledger.
- **Standard Retention**: 90 days for full receipts, 3 years for metadata/ledger entries.
- **Legal Hold**: Explicit override to prevent automatic deletion of receipts involved in disputes or investigations.

## 4. Compliance Framework
- **SOC2 Ready**: All administrative changes (API Keys, Policies, Budgets) are logged in the `audit_logs` table.
- **GDPR Ready**:
  - PII redaction is enabled by default.
  - Right to be Forgotten (RTBF) supported via logical deletion with hashing for referential integrity.

---
**Freeze Gate**: `enterprise-contract-v0.1.0`
