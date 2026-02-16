# Policy Contract (v0.1.0)

This document defines the interface and behavior of the Policy Engine (PEP/PDP) within the Financial MCP Gateway.

## 1. Overview

The Policy Engine enforces Attribute-Based Access Control (ABAC) on every `ActionEnvelope` passing through the Gateway. It operates in a "Deny by Default" mode.

**Architecture**:
- **PEP (Policy Enforcement Point)**: Interceptor that validates input, queries PDP, and enforces decisions.
- **PDP (Policy Decision Point)**: Logic engine that evaluates the request against the active Ruleset.
- **Storage**: Database-backed, versioned `policy_rulesets` per tenant.

## 2. Input / Output

### Policy Input (Context)
The PEP constructs this object from the Request and Envelope:

```json
{
  "tenant_id": "string (UUID)",
  "upstream_server_id": "string (UUID)",
  "agent_id": "string (Identity)",
  "role": "string (admin, developer, viewer)",
  "tool_name": "string",
  "args": { ... },
  "risk_class": "low | medium | high | critical",
  "project_id": "string (optional)",
  "environment": "dev | staging | prod",
  "timestamp": 1234567890
}
```

### Policy Decision (Output)
The PDP returns a deterministic decision:

```json
{
  "decision": "allow | deny | transform",
  "reason_codes": ["string"],
  "matchedRuleId": "string",
  "transform_patch": { ... } // Optional
}
```

## 3. Reason Codes

Standard codes returned in `error.code` or audit logs:

| Code | Description |
| :--- | :--- |
| `FORBIDDEN_TOOL` | Tool is not permitted for this agent/role. |
| `POLICY_DENY` | Generic denial by a rule. |
| `BUDGET_EXCEEDED` | Economic limit reached. |
| `SSRF_BLOCKED` | Egress control blocked a private IP/Localhost. |
| `PII_DETECTED` | Sensitive data found in arguments. |
| `INVALID_ARGS` | Arguments violate a specific constraint (e.g. numeric limit). |
| `TIME_RESTRICTED` | Operation attempted outside allowed hours. |
| `ENV_RESTRICTED` | Operation not allowed in this environment (e.g. destructive in prod). |

## 4. Workflows

### 4.1 Strict Enforcement
- If `tool_name` is not found in the Catalog -> **DENY** (`FORBIDDEN_TOOL`).
- If no rule matches -> **DENY** (`DEFAULT_DENY`).
- If `decision == deny` -> PEP throws Error (403).

### 4.2 Transformations
- **Arguments Patch**: Merges `transform_patch.parameters` into envelope args.
- **PII Redaction**: If enabled, recursively scans args for emails, credit cards, SSNs.
- **Egress Control**: Blocks access to private networks (10.x, 192.168.x, localhost).
- **Limits**: Clamps numeric values to defined maximums.

## 5. ABAC Rule Schema

A Policy Ruleset is a JSON object stored in `policy_rulesets`:

```json
{
  "tenant_id": "t_123",
  "version": "1.0.0",
  "rules": [
    {
      "id": "rule_1",
      "priority": 100,
      "effect": "allow",
      "when": {
        "role": ["admin"],
        "environment": ["prod"],
        "risk_class": "high",
        "args_match": { "currency": "USD" }
      }
    }
  ]
}
```
