# 🎮 The "Real World" MCP Demo

You asked to verify **everything** (Phases 1-12) with a real customized MCP server. Here is your playground.

This demo uses:
1. **Real Gateway**: Running locally on port 3000.
2. **Real MCP Server**: A custom `finance-core` server running on port 3001.
3. **Real SDK Client**: A Node.js script acting as the AI Agent.

## 1. Start the Real MCP Server (Upstream)
This simulates your custom "Bank API" or "Trading Bot".

```bash
# Terminal 1
npx tsx examples/mcp_server.ts
# ✅ Real MCP Server (finance-core) running on port 3001
```

## 2. Start the Gateway (The Protector)
This simulates the infrastructure layer.

```bash
# Terminal 2
npm start
# 🚀 MCP Gateway running on port 3000
```

## 3. Provision Access (One-Time Setup)
Create a tenant and API key for the demo.

```bash
# Terminal 3
npx tsx src/admin/provision_tenant.ts --name "DemoCorp" --id "demo-client"
# 🔑 API Key: mcp_sk_... (Copy this!)
```

*Paste the key into `examples/demo_client.ts` line 6.*

## 4. Run the Client (The Agent)
This uses the official SDK to make calls.

```bash
# Terminal 3
npx tsx examples/demo_client.ts
```

### What Happens?
1. **Auth**: The SDK sends the API Key. Gateway validates it (Phase 8).
2. **Rate Limit**: Gateway checks if you are spamming (Phase 8.3).
3. **Billing**: Gateway checks if you have budget (Phase 3).
4. **Routing**: Gateway forwards request to `localhost:3001` (Phase 1).
5. **Ledger**: Gateway records a debit in the double-entry accounting system (Phase 4).
6. **Settlement**: (Async) The mock banking adapter prepares a payout (Phase 12).
7. **Audit**: The transaction is logged to `audit_events` (Phase 8.4).

**Enjoy your fully functional Financial AI Infrastructure!** 🚀
