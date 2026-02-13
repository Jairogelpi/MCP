import { ReceiptSigner } from './core/receipt/signer';
import { db } from './adapters/database';

async function verify() {
    console.log('\n--- PHASE 5.4 SIGNING VERIFICATION ---');

    console.log('[DEBUG] Setting GATEWAY_PRIVATE_KEY...');
    process.env.GATEWAY_PRIVATE_KEY = 'MC4CAQAwBQYDK2VwBCIEIKFv98yK7h0f+fH1b5j9tW0vJ4zO2n7r6fW5n9uW2Y3S';

    // 1. Initial State (Direct seed for test isolation)
    console.log('[DEBUG] Seeding key for test...');
    try {
        db.keys.upsertKey({
            key_id: 'gateway-key-v1',
            public_key: 'MCowBQYDK2VwAyEAixt6mRBe1N4vNIn6e9sR5f2D6Z0pExE2oF3U/9p79Xo=',
            status: 'active'
        });
        console.log('✅ PASS: Key seeded successfully.');
    } catch (e: any) {
        console.error('❌ FAIL: Seeding failed -', e.message);
        return;
    }

    console.log('[DEBUG] Initializing Signer...');
    const signer = ReceiptSigner.getInstance();

    const testReceipt: any = {
        receipt_id: 'receipt-123',
        request_id: 'req-456',
        operation: { tool_name: 'test_tool', mcp_method: 'tools/call' },
        economic: { cost_settled: 0.123, currency: 'EUR' },
        timestamps: { created_at: new Date().toISOString() },
        signature: {
            alg: 'ed25519',
            key_id: 'gateway-key-v1',
            sig: ''
        }
    };

    console.log('[TEST] Canonicalizing...');
    const canon = signer.canonicalize(testReceipt);
    console.log('Canonical Result (Partial):', canon.substring(0, 100) + '...');

    console.log('[TEST] Signing...');
    try {
        const sig = signer.sign(testReceipt);
        testReceipt.signature.sig = sig;
        console.log('Signature Generated:', sig.substring(0, 20) + '...');
    } catch (e: any) {
        console.error('❌ FAIL: Signing failed -', e.message);
        return;
    }

    console.log('[TEST] Verifying with Public Key from Registry...');
    const entry = db.keys.getActiveKey('gateway-key-v1') as any;
    if (!entry) {
        console.error('❌ FAIL: Key not found in registry');
        return;
    }

    const isValid = signer.verify(testReceipt, entry.public_key);
    if (isValid) {
        console.log('✅ PASS: Signature is valid and matches Public Key.');
    } else {
        console.error('❌ FAIL: Signature verification FAILED.');
    }

    console.log('\n[TEST] Tamper Detection...');
    testReceipt.economic.cost_settled = 0.0001; // Tamper
    const isStillValid = signer.verify(testReceipt, entry.public_key);
    if (!isStillValid) {
        console.log('✅ PASS: Tamper detected (Signature invalid after modification).');
    } else {
        console.error('❌ FAIL: Tamper NOT detected!');
    }
}

// Run
verify();
