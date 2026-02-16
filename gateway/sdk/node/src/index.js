"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPGatewayClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
class MCPGatewayClient {
    client;
    tenantId;
    constructor(options) {
        this.tenantId = options.tenantId;
        this.client = axios_1.default.create({
            baseURL: options.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-mcp-tenant-id': options.tenantId,
                ...(options.apiKey ? { 'Authorization': `Bearer ${options.apiKey}` } : {})
            }
        });
    }
    async callTool(server, tool, args) {
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
    verifyReceipt(receipt, publicKey) {
        // Simple Ed25519 verification logic would go here
        // For now, return placeholder
        return true;
    }
}
exports.MCPGatewayClient = MCPGatewayClient;
