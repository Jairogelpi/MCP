# Phase 7: Adoption Contract

**Goal**: Define the standard for "Production-Ready Integration" of the MCP Gateway into the AI ecosystem.

## 1. Integration Standards
A successful integration (SDK or Adapter) MUST achieve the following:

### A. Protocol Compliance (MEP-001 / MCP-RCP-001)
- The Client/Upstream MUST pass through the Gateway proxy.
- Every successful tool execution MUST produce a cryptographically verifiable `ActionReceipt`.
- The `receipt_id` MUST be included in the response headers/metadata.

### B. Observability Linkage
- **Trace Propagation**: The `traceparent` header MUST be propagated from the Client through the Gateway to the Upstream.
- **Correlation**: Logs and metrics MUST be correlatable using `trace_id` and `receipt_id`.

### C. Economic Transparency
- The Client MUST be able to display "Reserved" vs "Settled" costs to the end-user.
- Out-of-budget responses MUST be handled gracefully with standard error codes.

## 2. Adoption Tier Levels

| Tier | Requirement | Certification |
|---|---|---|
| **Level 1: Proxy Only** | Request/Response pass through. | Verified Badge |
| **Level 2: Audited** | Receipts generated & verified. | Audited Badge |
| **Level 3: Economic-First** | Low-latency budgets & throttles active. | Premium Badge |

## 3. Deployment Checklist
- [ ] Gateway replicas deployed (2+).
- [ ] Public Key distributed to clients.
- [ ] SLO alerts active in Prometheus.
- [ ] Runbooks shared with Ops team.

---
**Freeze Gate**: `adoption-contract-v0.1.0`
