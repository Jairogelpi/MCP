# Federation & Delegation Spec

## 1. Context
Allows an "Operating Org" (Agency) to execute tools on behalf of a "Resource Org" (Client), utilizing the Client's Budget and Policy constraints.

## 2. Trust Model
- **Resource Tenant (`rt`)**: Owns the Budget and the Tool.
- **Operating Tenant (`ot`)**: Runs the Agent code.
- **Delegation Token**: A signed JWT-like capability issued by `rt` to `ot`.

## 3. Delegation Token Layout
```json
{
  "iss": "did:mcp:tenant:client_corp",
  "sub": "did:mcp:tenant:agency_inc",
  "scope": "finance:tools:stripe_execute",
  "limits": {
    "budget_cap": 1000000, // $1.00
    "expiry": 1715000000
  },
  "signature": "ed25519_sig..."
}
```

## 4. Execution Flow
1. Agency Agent requests Tool execution with `X-MCP-Delegate: <token>`.
2. Gateway verifies Token signature against Issuer (`client_corp`).
3. Gateway enforces Issuer's Budget (`client_corp` pays).
4. Gateway logs Access (`agency_inc` is the actor).
