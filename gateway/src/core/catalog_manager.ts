import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ToolDefinition {
    name: string;
    description?: string;
    inputSchema: object;
    schemaHash?: string;
    riskClass?: 'low' | 'medium' | 'high';
    upstreamId: string;
}

export class CatalogManager {
    private static instance: CatalogManager;
    private tools: Map<string, ToolDefinition> = new Map(); // Key: `${upstreamId}:${toolName}`

    private constructor() { }

    public static getInstance(): CatalogManager {
        if (!CatalogManager.instance) {
            CatalogManager.instance = new CatalogManager();
        }
        return CatalogManager.instance;
    }

    public upsertTool(tool: ToolDefinition) {
        if (!tool.schemaHash) {
            tool.schemaHash = this.computeHash(tool.inputSchema);
        }
        const key = `${tool.upstreamId}:${tool.name}`;
        this.tools.set(key, tool);
        console.log(`[CATALOG] Upserted tool: ${key}`);
    }

    public getTool(upstreamId: string, toolName: string): ToolDefinition | undefined {
        return this.tools.get(`${upstreamId}:${toolName}`);
    }

    public validateTool(upstreamId: string, toolName: string): boolean {
        // MVP: Just existence check
        return this.tools.has(`${upstreamId}:${toolName}`);
    }

    public exportSnapshot(filepath: string) {
        const snapshot = Array.from(this.tools.values());
        fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
        console.log(`[CATALOG] Snapshot exported to ${filepath}`);
    }

    public loadFromSnapshot(filepath: string) {
        if (!fs.existsSync(filepath)) return;

        try {
            const snapshot = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            for (const tool of snapshot) {
                this.upsertTool(tool);
            }
            console.log(`[CATALOG] Loaded ${snapshot.length} tools from snapshot`);
        } catch (e) {
            console.error('[CATALOG] Failed to load snapshot:', e);
        }
    }

    private computeHash(schema: object): string {
        const str = JSON.stringify(schema); // Canonicalization needed in prod
        return crypto.createHash('sha256').update(str).digest('hex');
    }
}
