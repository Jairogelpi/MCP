import { MCPGatewayClient } from '../src/sdks/mcp-gateway-js/client';
import { ConformanceConfig, ConformanceTest, TestResult } from './types';
import fs from 'fs';
import path from 'path';

export class ConformanceRunner {
    private client: MCPGatewayClient;
    private tests: ConformanceTest[] = [];

    constructor(private config: ConformanceConfig) {
        this.client = new MCPGatewayClient({
            baseUrl: config.baseUrl,
            tenantId: config.tenantId,
            apiKey: config.apiKey
        });
    }

    registerTest(test: ConformanceTest) {
        this.tests.push(test);
    }

    async run() {
        console.log('\n🚀 Starting MCP Gateway Official Conformance Suite...');
        console.log(`📡 Targeting: ${this.config.baseUrl}`);
        console.log('--------------------------------------------------');

        let passed = 0;
        const results: Record<string, TestResult[]> = {};

        for (const test of this.tests) {
            process.stdout.write(`   [${test.category.toUpperCase()}] ${test.name}... `);
            try {
                const result = await test.execute(this.client);
                if (result.success) {
                    console.log('✅ PASS');
                    passed++;
                } else {
                    console.log(`❌ FAIL: ${result.message}`);
                }

                if (!results[test.category]) results[test.category] = [];
                results[test.category].push(result);
            } catch (err: any) {
                console.log(`❌ CRASH: ${err.message}`);
            }
        }

        console.log('--------------------------------------------------');
        console.log(`📊 Summary: ${passed}/${this.tests.length} tests passed.`);
        console.log(passed === this.tests.length ? '✨ Compliance Status: CERTIFIED' : '⚠️ Compliance Status: NON-COMPLIANT');
    }
}
