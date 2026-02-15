
import { createServer } from 'http';

const PORT = 3001;
const SERVER_NAME = 'finance-core';

const TOOLS = {
    'get_balance': (args: any) => {
        const balances: any = { 'A1': 1000, 'A2': 500 };
        return {
            balance: balances[args.account] || 0,
            currency: 'EUR',
            status: 'active'
        };
    },
    'transfer': (args: any) => {
        return {
            tx_id: 'tx_123456',
            status: 'completed',
            amount: args.amount
        };
    }
};

const server = createServer(async (req, res) => {
    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const jsonRpc = JSON.parse(body);
            console.log(`[${SERVER_NAME}] Received Call:`, jsonRpc.method, jsonRpc.params);

            if (jsonRpc.method === 'tools/call') {
                const { name, arguments: args } = jsonRpc.params;
                const toolFn = TOOLS[name];

                if (!toolFn) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: { code: -32601, message: 'Tool not found' } }));
                    return;
                }

                // Simulate processing
                setTimeout(() => {
                    const result = toolFn(args);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        result: { content: result },
                        id: jsonRpc.id
                    }));
                }, 100); // 100ms latency
            } else if (jsonRpc.method === 'tools/list') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpc.id,
                    result: {
                        tools: [
                            {
                                name: 'get_balance',
                                description: 'Get account balance. Use account "A1" or "A2".',
                                inputSchema: {
                                    type: 'object',
                                    properties: { account: { type: 'string' } },
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
                }));
            } else {
                res.writeHead(404);
                res.end();
            }
        } catch (err) {
            console.error(err);
            res.writeHead(500);
            res.end();
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Real MCP Server (${SERVER_NAME}) running on port ${PORT}`);
});
