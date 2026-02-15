# Threat Model: MCP Gateway (v0.1.0)

This model uses the **STRIDE** framework to identify and mitigate risks.

## 1. System Components
- **Client (Agent/User)**: Authenticates via API key.
- **Gateway Pipeline**: Intercepts, validates, and transforms requests.
- **Ledger/DB**: Stores identities, budgets, and transactions.
- **Upstream Tool Servers**: Remote services called via HTTP/mcp.

## 2. STRIDE Analysis

| Threat Category | Potential Attack | Mitigation Strategy |
|-----------------|------------------|---------------------|
| **Spoofing** | Use of stolen API key | Hashed storage, mandatory rotation, JWT-like claims (future). |
| **Tampering** | Modifying `amount_settled` in transit | 2-Phase commits, hash-chained receipts, Ed25519 signing. |
| **Repudiation** | Denying a tool execution happened | Immutable ledger, signed receipts with cross-session links. |
| **Information Disclosure** | SSRF to internal metadata service | Egress transformer with IP blocking and tenant-scoped allowlists. |
| **Denial of Service** | Flooding gateway with recursive calls | Hierarchical rate limiting and circuit breakers. |
| **Elevation of Privilege** | Tenant A access Tenant B data | Strict tenant isolation in `IdentityManager` and DB indices. |

## 3. High-Risk Entry Points
- **Parameter Injection**: Malicious input to tools. *Mitigation: WAF interceptor.*
- **Egress Calls**: Arbitrary URLs in tool arguments. *Mitigation: Strict egress whitelist.*
- **Replay Attacks**: Resending a valid settlement. *Mitigation: Request ID cache + nonces.*
