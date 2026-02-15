# 🤖 Claude Desktop Integration Demo

You want to see the "Revolution" in Action inside Claude Desktop? Here is how.

The architecture will be:
`Claude Desktop` -> `Stio Bridge` -> `Gateway (Ops/Billing)` -> `Finance Core (Your Logic)`

## 1. Prerequisites (Keep these running!)

You need **3 Terminals**.

### Terminal 1: Upstream Server (The Bank)
This simulates your custom "Bank API" or "Trading Bot".

```powershell
cd gateway
npx tsx examples/mcp_server.ts
# ✅ Real MCP Server (finance-core) running on port 3001
```

### Terminal 2: The Gateway (The Protector)
This simulates the infrastructure layer.

```powershell
cd gateway
npm start
# 🚀 MCP Gateway running on port 3000
```

## 2. Configure Claude Desktop
Edit your `claude_desktop_config.json` (usually in `%APPDATA%\Claude` or `~/Library/Application Support/Claude`).

Add this configuration:

```json
{
  "mcpServers": {
    "finance-gateway": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "C:/Users/jairo/Desktop/mcp_financiero/gateway/src/bin/mcp_bridge.ts"
      ],
      "env": {
        "GATEWAY_URL": "http://localhost:3000",
        "MCP_API_KEY": "mcp_sk_test_12345", 
        "MCP_TENANT_ID": "demo-client"
      }
    }
  }
}
```

> **IMPORTANT**: 
> 1. Update the absolute path in `args` to match YOUR actual path to `mcp_bridge.ts`.
> 2. Generating a Real API Key:
>    In a 3rd terminal, run:
>    ```powershell
>    cd gateway
>    npx tsx src/admin/provision_tenant.ts --name "DemoCorp" --id "demo-client"
>    ```
>    Copy the key starting with `mcp_sk_...` into the config above.

## 3. The "Revolutionary" Experience

1.  **Restart** Claude Desktop completely.
2.  You should see the 🔌 icon with `finance-gateway`.
3.  Ask Claude: **"Transfer 500 EUR from account A1 to A2."**

### What You Will See (The Magic ✨)

1.  **Thinking**: Claude will decide to call `transfer`.
2.  **Intercept**: The Gateway will intercept this call.
3.  **Governance**: It checks if "Demo User" is allowed to transfer.
4.  **Billing**: It deducts tokens from your budget.
5.  **Execution**: It executes the transfer on `finance-core`.
6.  **Receipt**: Claude will show you:
    > "Operation completed successfully.
    > 🔒 Verified Receipt: r_8f7d..."

**This proves:** You can put a Bank-Grade Gateway between Claude and your tools *transparently*.
