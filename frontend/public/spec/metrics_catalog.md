# Metrics Catalog
> **Version**: 0.1.0
> **Type**: Prometheus / OpenTelemetry
> **Status**: DRAFT

This catalog defines the minimum viable set of metrics required to operate the MCP Gateway. All metrics must be prefixed with `mcp_`.

## 1. Traffic & Latency (The Pulse)

### `mcp_requests_total`
- **Type**: Counter
- **Description**: Total number of MCP tool requests processed.
- **Labels**:
  - `tenant_id`: Client ID.
  - `tool_name`: Name of the tool (e.g., `weather.get`).
  - `upstream_server`: Target server.
  - `outcome`: `SUCCESS`, `FAILURE`, `POLICY_DENY`, `THROTTLED`.

### `mcp_request_latency_ms`
- **Type**: Histogram
- **Description**: End-to-end latency of requests in milliseconds.
- **Buckets**: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
- **Labels**:
  - `tool_name`
  - `upstream_server`

## 2. Policy & Security (The Shield)

### `policy_denies_total`
- **Type**: Counter
- **Description**: Number of requests blocked by policy.
- **Labels**:
  - `tenant_id`
  - `reason`: `UNAUTHORIZED`, `BUDGET_EXCEEDED`, `BLACKLISTED_TOOL`.
  - `policy_version`: Version of the OPA policy.

## 3. Economics (The Ledger)

### `economic_burn_eur_per_hour`
- **Type**: Gauge (Calculated/derived or snapshot)
- **Description**: Current rate of spending in EUR.
- **Labels**: `tenant_id`.

### `ledger_reserved_total`
- **Type**: Counter
- **Description**: Total amount reserved (EUR).
- **Labels**: `tenant_id`.

### `ledger_settled_total`
- **Type**: Counter
- **Description**: Total amount successfully settled (EUR).
- **Labels**: `tenant_id`.

## 4. Human-in-the-Loop (The Brake)

### `approvals_pending`
- **Type**: Gauge
- **Description**: Current number of requests waiting for human approval.
- **Labels**: `tenant_id`.

### `approvals_latency_ms`
- **Type**: Histogram
- **Description**: Time taken for a human to approve/deny a request.
- **Labels**: `tenant_id`.
