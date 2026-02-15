# MCP Gateway Error Codes

| Code | Status | Description |
|---|---|---|
| `FORBIDDEN_TOOL` | 403 / 404 | Access denied by policy or tool not in catalog. |
| `BUDGET_EXCEEDED` | 402 | Reservation failed: No funds available in the requested scopes. |
| `LIMIT_EXHAUSTED` | 429 | Rate limit (tokens/min, calls/min) reached. |
| `UPSTREAM_FAILED` | 502 | Target MCP server returned an error or timed out. |
| `CIRCUIT_BREAKER_OPEN` | 503 | Upstream is under heavy failure and currently blocked. |
| `SIGNATURE_INVALID` | 400 | Receipt signature verification failed. |
| `LEDGER_ERROR` | 500 | Internal error processing the transaction (Fail-Closed). |
