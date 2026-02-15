# MEP-0003: Standard Error Codes

| Metadata | Value |
| :--- | :--- |
| **Title** | Standard Error Codes |
| **Author** | Architecture Team |
| **Status** | Active |

## 1. Motivation
Uniform error handling across different MCP gateways and SDKs.

## 2. Specification Changes
All errors MUST return valid JSON Problem Details (RFC 7807) with standard Codes:
- `MCP_RATE_LIMIT`: Rate limit exceeded.
- `MCP_INSUFFICIENT_FUNDS`: Budget exhausted.
- `MCP_INVALID_SIGNATURE`: Receipt verification failed.
- `MCP_UNAUTHORIZED`: Invalid or missing credentials.

## 3. Compatibility Impact
Standardizes previously ad-hoc string errors.

## 4. Test Cases
- Trigger rate limit -> Expect `429 Too Many Requests` + Code `MCP_RATE_LIMIT`.
