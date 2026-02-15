# MCP Enterprise Gateway (v1.0.0)

> **"The Bank-Grade Gateway for the Model Context Protocol"**

This is not a toy. This is a production-hardened, formally verified, and audit-ready gateway designed for financial institutions and enterprises deploying MCP Agents in the real world.

## 🚀 Ready for Real Life? **YES.**

Unlike standard MCP SDKs, this Gateway provides the "Missing Layer" required for production:

### 1. 🛡️ Security & Governance
- **RBAC & IAM**: Granular API Keys with scoped permissions (Admin vs Viewer).
- **Anti-Fraud**: Heuristic detection engine to block malicious prompts/tools.
- **Verification**: `RevocationManager` enforces publisher policies and blocks banned packages.

### 2. 💰 Financial Rails (Real Money)
- **Settlement Engine**: Aggregates usage and calculates payouts for Agent developers.
- **Double-Entry Ledger**: ACID-compliant accounting with `reserve()` operations.
- **Banking Adapters**: Pluggable architecture (currently Mock, ready for Stripe/Adyen).

### 3. 👁️ Observability & Compliance
- **Audit Logs**: Immutable record of every tool call and data access.
- **OpenTelemetry**: Full tracing from the Edge to the Database.
- **KYC Integration**: Identity verification hooks before payouts are released.

### 4. 🧱 Infrastructure
- **Active-Active**: Designed for multi-region failover.
- **Database Agnostic**: Runs on **Postgres** (Production) or **SQLite** (Dev).
- **Dockerized**: One-command deployment via `docker-compose.prod.yaml`.

## 📦 Architecture via Adapters

We use a strict **Hexagonal Architecture (Ports & Adapters)** to isolate the core logic from external dependencies:

```typescript
// It doesn't matter if it's Stripe, PayPal, or a Mock.
// The Core Logic stays the same.
const banking = new BankingAdapter(); 
await banking.payout(payeeId, amount);
```

## 👩‍💻 Developers & Integration

### 1. Enterprise SDKs
We provide typed SDKs for seamless integration.

#### Node.js
```javascript
import { MCPGatewayClient } from '@mcp-gateway/sdk';

const client = new MCPGatewayClient({ 
    baseUrl: 'https://gateway.acme.com', 
    tenantId: 'my-app',
    apiKey: 'mcp_sk_...'
});

const result = await client.callTool('finance-core', 'get_balance', { account: 'A1' });
console.log(`Receipt: ${result.receiptId}`);
```

#### Python
```python
from mcp_gateway import MCPGatewayClient

client = MCPGatewayClient(
    base_url="https://gateway.acme.com", 
    tenant_id="my-app",
    api_key="mcp_sk_..."
)

result = await client.call_tool("finance-core", "get_balance", {"account": "A1"})
print(f"Receipt: {result['receipt_id']}")
```

### 2. Raw API (HTTP/Remote)
For those who prefer raw HTTP or `curl`:

```bash
POST /mcp/tools/call HTTP/1.1
Host: gateway.acme.com
x-mcp-tenant-id: my-app
Authorization: Bearer mcp_sk_...

{
  "server_name": "finance-core",
  "tool_name": "get_balance",
  "arguments": { "account": "A1" }
}
```

**Response Headers**:
- `x-mcp-receipt-id`: `r_12345...` (The proof of execution)
- `x-mcp-signature`: `sig_abc...` (Digital signature)


## 🏁 Quick Start (Production)

1. **Configure Environment**:
   ```bash
   cp deploy/env.example .env
   # Set DATABASE_URL=postgres://user:pass@localhost:5432/mcp
   ```

2. **Run with Docker**:
   ```bash
   docker-compose -f deploy/docker-compose.prod.yaml up -d
   ```

3. **Provision Tenant**:
   ```bash
   npx tsx src/admin/provision_tenant.ts --name "My Bank"
   ```

---
*Built with ❤️ for the MCP Ecosystem.*
