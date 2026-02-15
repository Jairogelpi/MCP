
import { createInterface } from 'readline';
import { MCPGatewayClient } from '../../sdk/node/src/index';

/**
 * MCP Bridge for Claude Desktop
 * 
 * 1. Reads JSON-RPC from Stdin (Claude)
 * 2. Authenticates & Forwards to Gateway (HTTP)
 * 3. Returns JSON-RPC to Stdout (Claude)
 */

// CONFIGURATION
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
// API Key for "DemoCorp" (Provisioned in Step 3 of DEMO.md)
const API_KEY = process.env.MCP_API_KEY || 'demo-key';
const TENANT_ID = process.env.MCP_TENANT_ID || 'demo-client';
const TARGET_SERVER = process.env.MCP_TARGET_SERVER || 'finance-core';

const client = new MCPGatewayClient({
    baseUrl: GATEWAY_URL,
    tenantId: TENANT_ID,
    apiKey: API_KEY
});

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Helper to send JSON-RPC response
function send(data: any) {
    console.log(JSON.stringify(data));
}

// Log to stderr so Claude doesn't parse it as JSON
function log(msg: string) {
    console.error(`[BRIDGE] ${msg}`);
}

log(`Started. Gateway: ${GATEWAY_URL}, Tenant: ${TENANT_ID}`);

rl.on('line', async (line) => {
    try {
        if (!line.trim()) return;
        const request = JSON.parse(line);
        log(`Request: ${request.method} (ID: ${request.id})`);

        // 1. Handshake (initialize)
        if (request.method === 'initialize') {
            send({
                jsonrpc: '2.0',
                id: request.id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {} // We support tools
                    },
                    serverInfo: {
                        name: 'mcp-gateway-bridge',
                        version: '1.0.0'
                    }
                }
            });
            return;
        }

        if (request.method === 'notifications/initialized') {
            // Ack
            return;
        }

        // 2. List Tools (Proxy to Gateway Catalog?)
        // For the demo, we replicate the finance-core tools
        if (request.method === 'tools/list') {
            send({
                jsonrpc: '2.0',
                id: request.id,
                result: {
                    tools: [
                        {
                            name: 'get_balance',
                            description: 'Get account balance. Use account "A1" or "A2".',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    account: { type: 'string' }
                                },
                                required: ['account']
                            }
                        },
                        {
                            name: 'transfer',
                            description: 'Transfer funds between accounts.',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    from: { type: 'string' },
                                    to: { type: 'string' },
                                    amount: { type: 'number' }
                                },
                                required: ['from', 'to', 'amount']
                            }
                        }
                    ]
                }
            });
            return;
        }

        // 3. Call Tool (Forward to Gateway)
        if (request.method === 'tools/call') {
            const { name, arguments: args } = request.params;

            try {
                // Use SDK to call Gateway
                // Note: client.callTool parses the result.content array from Gateway
                const result = await client.callTool(TARGET_SERVER, name, args);

                // Construct the tool result for Claude
                const content: any[] = result.content || [];

                // If content is empty/null, default to success message
                if (!content.length) {
                    content.push({ type: 'text', text: 'Operation completed successfully.' });
                }

                // Add Receipt for visibility in Claude
                content.push({
                    type: 'text',
                    text: `\n\n🔒 Verified Receipt: ${result.receiptId}`
                });

                send({
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        content: content,
                        isError: false
                    }
                });

            } catch (err: any) {
                log(`Gateway Error: ${err.message}`);
                send({
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        content: [{ type: 'text', text: `Gateway Error: ${err.message}` }],
                        isError: true
                    }
                });
            }
            return;
        }

        // Default: Method not found
        // But send empty result for unsupported methods to avoid crashing Claude
        if (request.id) {
            console.error(`[BRIDGE] Method not handled: ${request.method}`);
        }

    } catch (err) {
        log(`Critical Error: ${err}`);
    }
});
