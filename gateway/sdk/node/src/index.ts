
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface MCPGatewayOptions {
    baseUrl: string;
    tenantId: string;
    apiKey?: string;
}

export interface ToolResult {
    content: any[];
    isError: boolean;
    receiptId?: string;
    verifiable: boolean;
}

export class MCPGatewayClient {
    private client: AxiosInstance;
    private tenantId: string;

    constructor(options: MCPGatewayOptions) {
        this.tenantId = options.tenantId;
        this.client = axios.create({
            baseURL: options.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-mcp-tenant-id': options.tenantId,
                ...(options.apiKey ? { 'Authorization': `Bearer ${options.apiKey}` } : {})
            }
        });
    }

    async callTool(server: string, tool: string, args: any): Promise<ToolResult> {
        const payload = {
            type: 'command',
            action: tool,
            version: '1.0.0',
            parameters: args,
            meta: {},
            request_id: crypto.randomUUID(),
            timestamp: Date.now()
        };

        const response = await this.client.post(`/mcp/${this.tenantId}/${server}`, payload);

        // Gateway returns standardized JSON-RPC like structure
        // Receipt structure (from receipt_contract.md):
        // { receipt_id, meta, result: { success: true, data: ... }, ... }

        const data = response.data;
        const resultData = data.result?.data || {};

        return {
            content: resultData.content || [{ type: 'text', text: JSON.stringify(resultData) }],
            isError: !data.result?.success,
            receiptId: data.receipt_id,
            verifiable: !!data.signature
        };
    }

    verifyReceipt(receipt: any, publicKey: string): boolean {
        // Simple Ed25519 verification logic would go here
        // For now, return placeholder
        return true;
    }
}
