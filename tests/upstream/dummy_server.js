
const http = require('http');

const PORT = process.argv[2] ? parseInt(process.argv[2]) : 3001;

const TOOLS = [
    {
        name: 'valid_tool',
        description: 'A safe tool for testing',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' }
            }
        }
    },
    {
        name: 'dangerous_op',
        description: 'A dangerous tool that should be blocked by policy',
        inputSchema: {}
    },
    {
        name: 'sensitive_op',
        description: 'Tool that handles PII',
        inputSchema: {
            type: 'object',
            properties: {
                credit_card: { type: 'string' }
            }
        }
    },
    {
        name: 'curl_op',
        description: 'Tool that performs network requests',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string' }
            }
        }
    },
    {
        name: 'search_op',
        description: 'Tool for searching',
        inputSchema: {
            type: 'object',
            properties: {
                limit: { type: 'number' }
            }
        }
    },
    {
        name: 'stream_test',
        description: 'Tool for streaming',
        inputSchema: {}
    },
    {
        name: 'expensive_op',
        description: 'A very expensive tool for testing approval workflows',
        inputSchema: {}
    }
];

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const request = JSON.parse(body);
                console.log(`[UPSTREAM] Received: ${request.method}`);

                const delay = parseInt(req.headers['x-test-delay-ms'] || '0');
                const tokensIn = parseInt(req.headers['x-test-tokens-in'] || '100');
                const tokensOut = parseInt(req.headers['x-test-tokens-out'] || '100');

                if (request.method === 'tools/list') {
                    const response = {
                        jsonrpc: '2.0',
                        id: request.id,
                        result: {
                            tools: TOOLS
                        }
                    };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(response));
                    return;
                }

                // Default Echo for tools/call
                const response = {
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        content: [{ type: 'text', text: `Result for ${request.params?.name || 'unknown'}` }],
                        usage: {
                            input_tokens: tokensIn,
                            output_tokens: tokensOut
                        }
                    }
                };

                setTimeout(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(response));
                }, delay);

            } catch (err) {
                console.error('[UPSTREAM] Error:', err);
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Dummy Upstream Server running on port ${PORT}`);
});
