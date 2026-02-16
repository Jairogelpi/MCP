# ActionEnvelope Specification (v0.1.0)

## Overview
The **ActionEnvelope** is the atomic unit of work within the Financial MCP Gateway. Every incoming request, whether via HTTP or SSE, must be normalized into this structure before any policy logic, billing, or upstream forwarding occurs.

This structure guarantees that all downstream components (Policy Engine, Ledger, Audit Log) operate on a deterministic, versioned data shape.

## Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (v4) | Unique identifier for the request. Used for tracing logs and ledger entries. |
| `version` | string | Configuration version of the envelope schema (e.g., `v0.1.0`). |
| `type` | string | `command` (state-modifying) or `query` (read-only). |
| `action` | string | The specific tool or function name being invoked (e.g., `transfer_funds`). |
| `parameters` | object | The arguments provided to the tool. Must match the tool's input schema. |
| `meta` | object | Contextual metadata about the request environment. |

### Meta Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `timestamp` | integer | Unix timestamp (ms) when the request entered the gateway. |
| `source` | string | `http` or `sse`. |
| `tenant` | string | The Organization ID owning the request context. |
| `targetServer` | string | The logical name of the upstream MCP server (e.g., `finance-core`). |
| `authContext` | object | (Optional) Validated identity info: `user_id`, `scopes`, `role`. |

## JSON Schema
See [action_envelope.schema.json](./action_envelope.schema.json) for validation rules.
