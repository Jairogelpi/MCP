
import { MCPGatewayClient } from '../sdk/node/src/index';

// 1. Config
const GATEWAY_URL = 'http://localhost:3000';
const TENANT_ID = 'demo-client';
const API_KEY = 'demo-key'; // Assumes you have provisioned this key

const client = new MCPGatewayClient({
    baseUrl: GATEWAY_URL,
    tenantId: TENANT_ID,
    apiKey: API_KEY
});

async function runDemo() {
    console.log('🚀 Starting "Real World" MCP Demo...\n');

    try {
        // 2. Call Tool: Get Balance
        console.log('1️⃣  Calling finance-core:get_balance...');
        const balance = await client.callTool('finance-core', 'get_balance', { account: 'A1' });
        console.log('   ✅ Result:', balance.content);
        console.log('   🧾 Receipt:', balance.receiptId);

        // 3. Call Tool: Transfer (Writes to Ledger)
        console.log('\n2️⃣  Calling finance-core:transfer...');
        const tx = await client.callTool('finance-core', 'transfer', { from: 'A1', to: 'A2', amount: 100 });
        console.log('   ✅ Result:', tx.content);
        console.log('   🧾 Receipt:', tx.receiptId);

        console.log('\n✅ Demo Complete! Check your Gateway logs for Audit/Ledger entries.');

    } catch (err: any) {
        console.error('❌ Demo Failed:', err.message);
        if (err.response) {
            console.error('   Status:', err.response.status);
            console.error('   Data:', err.response.data);
        }
    }
}

runDemo();
