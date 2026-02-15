import { ActionEnvelope } from './contract';
import { ReceiptSigner } from './signer';
import crypto from 'crypto';

export interface GatewayConfig {
    baseUrl: string;
    tenantId: string;
    apiKey?: string;
}

export class MCPGatewayClient {
    private signer: ReceiptSigner;

    constructor(private config: GatewayConfig) {
        this.signer = ReceiptSigner.getInstance();
    }

    /**
     * Executes a tool call through the MCP Gateway
     */
    async callTool(targetServer: string, action: string, parameters: any = {}) {
        const envelope: ActionEnvelope = {
            id: crypto.randomUUID(),
            action,
            parameters,
            meta: {
                tenant_id: this.config.tenantId,
                targetServer,
                timestamp: Date.now()
            }
        };

        const response = await fetch(`${this.config.baseUrl}/mcp/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
            },
            body: JSON.stringify(envelope)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gateway Error: ${error.message || response.statusText} (${error.code})`);
        }

        const result = await response.json();
        const receiptHeader = response.headers.get('x-mcp-receipt-id');

        return {
            ...result,
            receiptId: receiptHeader
        };
    }

    /**
     * Verifies a receipt against the gateway's public key
     */
    verifyReceipt(receipt: any, publicKey: string): boolean {
        return this.signer.verify(receipt, publicKey);
    }
}
