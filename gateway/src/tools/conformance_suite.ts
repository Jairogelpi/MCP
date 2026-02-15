import { MCPGatewayClient } from '../sdks/mcp-gateway-js/client';

async function runConformance() {
    console.log('🚀 Starting MCP Gateway Conformance Suite...');

    const client = new MCPGatewayClient({
        baseUrl: 'http://localhost:3000',
        tenantId: 'conformance_tester'
    });

    const tests = [
        { name: 'TC-01: Basic Tool Call', server: 'finance-core', tool: 'get_balance', params: { account: 'A1' } },
        { name: 'TC-02: Budget Exceeded', server: 'finance-core', tool: 'get_balance', params: { account: 'OVERRUN' } },
        { name: 'TC-03: Forbidden Tool', server: 'finance-core', tool: 'delete_database', params: {} },
    ];

    for (const test of tests) {
        process.stdout.write(`   [RUN] ${test.name}... `);
        try {
            const result = await client.callTool(test.server, test.tool, test.params);
            if (result.receiptId) {
                console.log('✅ PASS (Receipt Received)');
            } else {
                console.log('❌ FAIL (No Receipt ID)');
            }
        } catch (err: any) {
            if (test.name.includes('Exceeded') && err.message.includes('BUDGET_EXCEEDED')) {
                console.log('✅ PASS (Caught Expected Budget Error)');
            } else if (test.name.includes('Forbidden') && err.message.includes('FORBIDDEN')) {
                console.log('✅ PASS (Caught Expected Policy Error)');
            } else {
                console.log(`❌ FAIL: ${err.message}`);
            }
        }
    }

    console.log('\n✨ Conformance Suite Completed.');
}

runConformance().catch(console.error);
