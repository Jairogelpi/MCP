# Policy Contract (v0.1.0)

## Overview
This document defines the interface between the Gateway (PEP) and the Policy Engine (PDP). It ensures that all access control decisions are made using a standardized input/output format, regardless of the underlying policy logic (RBAC, ABAC, ReGo, etc.).

## 1. Policy Decision Point (PDP) Input

The PDP receives a context object derived from the `ActionEnvelope` and enriched with identity and catalog metadata.

| Field | Type | Description | Source |
| :--- | :--- | :--- | :--- |
| `tenant_id` | string | Organization ID owning the request. | Envelope `meta.tenant` |
| `project_id` | string? | (Optional) Project context. | Envelope `meta.project` |
| `agent_id` | string? | (Optional) Agent making the call. | Envelope `meta.agent` |
| `user_role` | string | Role of the authenticated user (e.g., `admin`, `member`). | Identity Context |
| `upstream_server_id` | string | Target MCP server name. | Envelope `meta.targetServer` |
| `mcp_method` | string | The JSON-RPC method (e.g., `tools/call`). | Request Body |
| `tool_name` | string | Name of the tool being called. | Request Body `params.name` |
| `args` | object | The arguments passed to the tool. | Request Body `params.arguments` |
| `input_schema_hash` | string? | (Optional) Hash of the tool's input schema at runtime. | Catalog Lookup |
| `risk_class` | string | Risk classification of the tool (`low`, `medium`, `high`, `critical`). | Catalog Lookup |
| `timestamp` | integer | Request timestamp (ms). | Envelope `meta.timestamp` |
| `request_id` | string | Unique Request ID. | Envelope `id` |

## 2. Policy Decision Point (PDP) Output

The PDP must return a decision object for every evaluation.

| Field | Type | Description |
| :--- | :--- | :--- |
| `decision` | string | `ALLOW` \| `DENY` \| `TRANSFORM` |
| `reason_codes` | string[] | List of codes explaining the decision (Required). |
| `transform_patch` | object? | (If `TRANSFORM`) JSON Patch or merge object to modify `args`. |
| `obligations` | string[]? | Post-decision actions required (e.g., `log_audit`, `require_2fa`, `encrypt_result`). |

## 3. Standard Reason Codes

These codes are immutable and must be used by the Frontend and Telemetry systems to categorize decisions.

### Blocking / Deny Codes
| Code | Description |
| :--- | :--- |
| `FORBIDDEN_TOOL` | The user/role is not explicitly authorized to use this tool. |
| `BUDGET_HARD_LIMIT` | The tenant or user budget is exhausted. |
| `PII_DETECTED` | Sensitive data (PII) pattern matched in arguments (and no redaction possible). |
| `SSRF_BLOCKED` | Argument contained a URL or IP related to internal network segments. |
| `ARGS_LIMIT_ENFORCED` | Argument size or value exceeded safe limits. |
| `TENANT_SCOPE_VIOLATION` | Attempted to access resources not belonging to the tenant. |
| `SCHEMA_MISMATCH` | Tool arguments do not match the strict schema in the Catalog. |
| `DEFAULT_DENY` | No matching rule was found (Zero Trust). |

### Success / Transform Codes
| Code | Description |
| :--- | :--- |
| `ALLOWED_BY_RULE` | Explicitly allowed by a matching policy. |
| `TRANSFORMED_BY_RULE` | Allowed, but arguments were modified (e.g., PII redacted). |
| `DEFAULT_ALLOW` | (Dev Mode Only) Allowed by default policy. |
