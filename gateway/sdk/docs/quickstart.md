# MCP Gateway Quickstart

Integrate the MCP Gateway into your AI application in just 5 lines of code.

## 1. Node.js (npm)

```javascript
import { MCPGatewayClient } from '@mcp-gateway/sdk';

const client = new MCPGatewayClient({ 
    baseUrl: 'https://gateway.acme.com', 
    tenantId: 'my-app' 
});

const result = await client.callTool('finance-core', 'get_balance', { account: 'A1' });
console.log(`Balance: ${result.balance} (Receipt: ${result.receiptId})`);
```

## 2. Python (pip)

```python
from mcp_gateway import MCPGatewayClient

client = MCPGatewayClient(base_url="https://gateway.acme.com", tenant_id="my-app")

result = await client.call_tool("finance-core", "get_balance", {"account": "A1"})
print(f"Balance: {result['balance']} (Receipt: {result['receipt_id']})")
```

## 3. Verification
To verify a receipt's integrity:

```javascript
const isValid = client.verifyReceipt(receipt, GATEWAY_PUBLIC_KEY);
```
