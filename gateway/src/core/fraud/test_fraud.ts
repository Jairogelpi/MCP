import { FraudDetector } from './detector';

async function runTest() {
    console.log('\n🕵️‍♀️ Testing Anti-Fraud System (Phase 11.6)...\n');

    const detector = new FraudDetector();

    // Scenario 1: Normal Spend
    console.log('--- Test 1: Normal Activity ---');
    const res1 = detector.process({
        tenantId: 'safe-tenant',
        type: 'SPEND',
        amount: 150, // 1.5x avg
        timestamp: Date.now()
    });
    console.log(`Result: ${res1.action} (Score: ${res1.score})`);


    // Scenario 2: Massive Burn Spike
    console.log('\n--- Test 2: Attack Vector (Burn Spike) ---');
    const res2 = detector.process({
        tenantId: 'safe-tenant',
        type: 'SPEND',
        amount: 5000, // 50x avg!
        timestamp: Date.now()
    });
    console.log(`Result: ${res2.action} (Score: ${res2.score}) - Reason: ${res2.reason}`);

    if (res2.action !== 'BLOCK') {
        throw new Error('❌ Failed to block massive spike!');
    }

    console.log('\n✅ Anti-Fraud Detection Verified.');
}

runTest().catch(console.error);
