# Observability Contract & Telemetry Standards
> **Version**: 0.1.0
> **Status**: Frozen
> **Tag**: `obs-contract-v0.1.0`

This document defines the mandatory observability standards for the MCP Gateway. All components must adhere to these rules to ensure consistent tracing, effective debugging, and zero-PII leakage.

## 1. Correlation Model
Every request flowing through the system must carry and propagate the following identifiers.

| ID | Description | Source | Scope |
| :--- | :--- | :--- | :--- |
| **`trace_id`** | W3C Trace Context (128-bit hex). | Client or Gateway (if missing). | End-to-End (Client $\to$ Gateway $\to$ MCP Server) |
| **`request_id`** | Unique UUIDv4 for the specific HTTP/RPC request. | Gateway. | Single Request-Response Cycle |
| **`receipt_id`** | SHA-256 Hash of the canonical receipt logic. | Receipt Manager (Deterministic). | Permanent / Audit Log |

### Propagation
- **HTTP Headers**: `traceparent`, `x-request-id`
- **JSON-RPC**: Included in `params._meta` (if supported) or tracked via context mapping.
- **Logs**: All log entries MUST include `trace_id` and `request_id` in the structured JSON context.

## 2. Standard Dimensions (Labels)
Metrics and logs must use these standard attribute names. Ad-hoc attributes are discouraged.

| Attribute | Description | Cardinality | PII Allowed? |
| :--- | :--- | :--- | :--- |
| `tenant_id` | Tenant identifier (e.g., `client-xyz`). | Medium | **NO** (Must be opaque ID) |
| `tool_name` | Name of the MCP tool being invoked. | Low | No |
| `upstream_server_id` | ID of the upstream MCP server (e.g., `sqlite-service`). | Low | No |
| `policy_decision` | Final decision of the policy engine (`ALLOW`, `DENY`, `MANUAL_REVIEW`). | Low | No |
| `economic_outcome` | Financial result (`SETTLED`, `RESERVED`, `REFUNDED`, `INSUFFICIENT_FUNDS`). | Low | No |
| `error_code` | Standardized error code (e.g., `E_RATE_LIMIT`, `E_UNAUTHORIZED`). | Low | No |

## 3. The "Rule of Gold" for Logging
**"No Payloads, Only Shapes."**

Logging full request/response payloads is **STRICTLY FORBIDDEN** in production to prevent PII leakage (GDPR/compliance).

### ✅ Allowed (Safe to Log)
- **Metadata**: `timestamp`, `severity`, `component`.
- **Shapes**: `payload_size_bytes`, `array_length`, `keys_present`.
- **Hashes**: `sha256(prompt)`, `sha256(user_id)`.
- **Decisions**: "Policy A denied request R".

### ❌ Forbidden (Must be Redacted)
- **Raw PII**: Emails, names, phone numbers, IP addresses (unless masked).
- **Content**: Full prompt text, full tool output (which may contain DB rows).
- **Secrets**: API keys, bearer tokens.

### Redaction Strategy
If debugging requires inspecting values, use a dedicated **Debug Mode** with:
1. Short retention (e.g., 1 hour).
2. Restricted access control.
3. Explicit `[DEBUG-PII]` tag in logs.

## 4. Signal Specifications

### 4.1 Metrics (OpenTelemetry)
- **`gateway_request_total`**: Counter. Labels: `tenant_id`, `tool_name`, `status_code`.
- **`gateway_request_duration_seconds`**: Histogram. Labels: `tool_name`.
- **`receipt_created_total`**: Counter. Labels: `tenant_id`, `economic_outcome`.
- **`policy_decision_total`**: Counter. Labels: `policy_name`, `decision`.

### 4.2 Traces
- **Span Name**: `{Component}:{Operation}` (e.g., `Gateway:HandleToolCall`, `Signer:SignReceipt`).
- **Attributes**: Must include `tenant_id` and `receipt_id` (when available).

## 5. Freeze Agreement
By marking distinct components with `obs-contract-v0.1.0`, we agree that:
1. No new correlation IDs will be invented without updating this spec.
2. No PII will be logged by default.
3. All dashboards will rely solely on the Dimensions defined in section 2.
