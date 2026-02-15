# OpenTelemetry Tracing Specification
> **Version**: 0.1.0
> **Scope**: End-to-End Request Flow
> **Status**: DRAFT

This document defines the mandatory tracing structure for the MCP Gateway. Every request MUST generate a complete trace covering the lifecycle from ingress to receipt emission.

## 1. Mandatory Spans (The Happy Path)

The trace hierarchy must follow this structure:

1. **`edge.receive`** (Root Span)
   - **Context**: Access Layer (Express/HTTP)
   - **Description**: Ingress of the HTTP/JSON-RPC request.
   - **Attributes**: `http.method`, `http.url`, `client.ip` (redacted/masked).

2. **`interceptor.parse_validate`**
   - **Context**: Interceptor Chain Start.
   - **Description**: parsing the JSON-RPC payload and validating schemas.
   - **Attributes**: `mcp.method`, `mcp.params_sha256`.

3. **`policy.evaluate`**
   - **Context**: Policy Engine (OPA/Native).
   - **Description**: Checking permissions and compliance rules.
   - **Attributes**: `policy.decision` (ALLOW/DENY), `policy.reasons`.

4. **`economic.estimate`**
   - **Context**: Cost Estimator.
   - **Description**: Calculating the cost of the operation before execution.
   - **Attributes**: `econ.estimated_cost`, `econ.currency`.

5. **`ledger.reserve`**
   - **Context**: Ledger (Asset Manager).
   - **Description**: Reserving funds/budget.
   - **Attributes**: `ledger.transaction_id`, `ledger.amount`.

6. **`upstream.call`**
   - **Context**: Transport / Tool Executor.
   - **Description**: The actual call to the upstream MCP server/tool.
   - **Attributes**: `upstream.service`, `tool.name`.

7. **`ledger.settle`**
   - **Context**: Ledger (Asset Manager).
   - **Description**: Finalizing the transaction (commit/rollback).
   - **Attributes**: `ledger.settlement_status`, `ledger.final_cost`.

8. **`receipt.emit`**
   - **Context**: Receipt Manager.
   - **Description**: Generating, signing, and chaining the immutable receipt.
   - **Attributes**: `receipt.id`, `receipt.hash`, `chain.sequence`.

## 2. Mandatory Attributes (Context Propagation)

Every relevant span MUST include these attributes to allow cross-cutting queries:

| Attribute | Source | Description |
| :--- | :--- | :--- |
| `tenant_id` | Authentication | The client identity (opaque). |
| `trace_id` | Root Span | W3C Trace ID. |
| `request_id` | Gateway | Unique Request UUID. |
| `tool_name` | Payload | Name of the tool being called (e.g., `sqlite.query`). |
| `policy_decision` | Policy Engine | `ALLOW` or `DENY`. |
| `economic_outcome` | Ledger | `SETTLED`, `RESERVED`, `INSUFFICIENT_FUNDS`. |
| `receipt_id` | Receipt Manager | The SHA-256 hash/ID of the final receipt. |

## 3. Implementation Rules
- **Context Propagation**: Use `context.with(trace.setSpan(ctx, span), ...)` to ensure hierarchy.
- **Error Handling**: Any exception must be recorded with `span.recordException(e)` and `span.setStatus({ code: SpanStatusCode.ERROR })`.
- **Async Safety**: Ensure spans are ended in `finally` blocks or callbacks.
