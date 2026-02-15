# Service Level Objectives (SLOs) - MCP Gateway

## 1. Availability SLO
*   **Target**: 99.9%
*   **Definition**: Percentage of successful (non-5xx) requests over a 30-day window.
*   **Exclude**: 4xx errors (client errors).

## 2. Latency SLO (Performance)
*   **Target**: p95 < 500ms (Internal processing)
*   **Definition**: Time spent in the gateway pipeline excluding the actual upstream tool execution time.
*   **Target**: p99 < 5s (End-to-end)
*   **Definition**: Total request duration including LLM/Tool call.

## 3. Financial Integrity SLO
*   **Target**: 100% (Zero unrecorded settlements)
*   **Definition**: Every `upstream.call` with a successful response must have a corresponding `SETTLE` entry in the ledger.
*   **Error Budget**: 0 - Any discrepancy triggers a SEV-1 audit.

## 4. Policy Latency
*   **Target**: p99 < 50ms
*   **Definition**: Duration of the `policy.evaluate` span.

---

## Error Budget Policies
- **80% Consumed**: Investigation required (MED alert).
- **100% Consumed**: Freeze on non-emergency changes until stability is restored.
