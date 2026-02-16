# Error Codes (v0.1.0)

All errors returned by the Gateway follow this JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description."
  }
}
```

## Standard Codes

| Status Code | Error Code | Description |
| :--- | :--- | :--- |
| **400** | `SCHEMA_MISMATCH` | Request body or tool arguments do not match the required schema. |
| **401** | `AUTH_MISSING` | No API Key or JWT provided. |
| **402** | `BUDGET_HARD_LIMIT` | The tenant or user has exhausted their budget. |
| **402** | `APPROVAL_REQUIRED` | The action requires human approval (Feature Flag). |
| **403** | `POLICY_VIOLATION` | Blocked by a policy rule (e.g., PII, allowed domains). |
| **404** | `FORBIDDEN_TOOL` | The requested tool is not permitted for this user/role. |
| **404** | `UPSTREAM_NOT_FOUND` | The requested upstream server is not configured. |
| **429** | `ECON_RATE_LIMIT` | Too many requests in a short window. |
| **502** | `BAD_GATEWAY` | The upstream MCP server failed to respond or returned 5xx. |
| **500** | `INTERNAL_SERVER_ERROR` | Unexpected crash or state in the gateway. |
