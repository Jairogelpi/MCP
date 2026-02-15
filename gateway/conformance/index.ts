import { ConformanceRunner } from './runner';
import { piiDetection } from './tests_policy/pii_detection';
import { budgetEnforcement } from './tests_economic/budget_enforcement';
import { signatureValidity } from './tests_receipts/signature_validity';

async function main() {
    const runner = new ConformanceRunner({
        baseUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
        tenantId: process.env.TENANT_ID || 'conformance_tester',
        publicKey: process.env.GATEWAY_PUBLIC_KEY || ''
    });

    runner.registerTest(piiDetection);
    runner.registerTest(budgetEnforcement);
    runner.registerTest(signatureValidity);

    await runner.run();
}

main().catch(console.error);
