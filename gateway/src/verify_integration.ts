
import { db } from './adapters/database';

async function verifyFullFlow() {
    console.log('\n--- PHASE 5.5 FULL INTEGRATION VERIFICATION ---');

    process.env.GATEWAY_PRIVATE_KEY = 'MC4CAQAwBQYDK2VwBCIEIKFv98yK7h0f+fH1b5j9tW0vJ4zO2n7r6fW5n9uW2Y3S';
    try {
        db.keys.upsertKey({
            key_id: 'gateway-key-v1',
            public_key: 'MCowBQYDK2VwAyEAixt6mRBe1N4vNIn6e9sR5f2D6Z0pExE2oF3U/9p79Xo=',
            status: 'active'
        });
    } catch (e) { }

    // 1. Check Receipt Count Before
    const countBefore = db.raw.query('SELECT COUNT(*) as c FROM ledger_receipts')[0].c;
    console.log(`[TEST] Receipts Before: ${countBefore}`);

    // 2. Perform Request (Using curl or internal simulation?)
    // Trying internal module simulation since server might not be running or we want isolation.
    // Actually, let's just inspect the DB after a manual run or assume the previous tests populated it?
    // No, we need to trigger the interceptor.

    // Changing strategy: Since we just modified the interceptor, we should run the server and hit it.
    // OR, we can mock the context and call the interceptor directly.

    // Let's rely on the previous unit test approach using a mock context for the interceptor.
    const { settlement } = require('./interceptors/09_settlement');

    const mockCtx = {
        stepResults: {
            economic: {
                reserve_id: 'res-test-123',
                cost: 0.1,
                real_cost: 0.05,
                budget_scopes: ['tenant:t1'],
                usage: { input: 10, output: 20 }
            },
            normalized: {
                id: 'req-integration-' + Date.now(),
                tool: 'calculator',
                method: 'add'
            }
        },
        request: {
            headers: {
                'x-tenant-id': 'tenant-integration-test'
            }
        }
    };

    console.log('[TEST] Invoking Settlement Interceptor...');
    await settlement(mockCtx);

    // 3. Check Receipt Count After
    const countAfter = db.raw.query('SELECT COUNT(*) as c FROM ledger_receipts')[0].c;
    console.log(`[TEST] Receipts After: ${countAfter}`);

    if (countAfter > countBefore) {
        console.log('✅ PASS: Receipt created by interceptor.');

        // 4. Verify Chain Link
        const last = db.raw.query('SELECT * FROM ledger_receipts ORDER BY created_at DESC LIMIT 1')[0];
        const chainHead = db.chain.getHead('tenant:tenant-integration-test');

        if (chainHead && chainHead.last_receipt_id === last.receipt_id) {
            console.log('✅ PASS: Chain State updated to point to new receipt.');
        } else {
            console.error('❌ FAIL: Chain State desync!', chainHead, last);
        }

    } else {
        console.error('❌ FAIL: No receipt created.');
    }
}

verifyFullFlow().catch(console.error);
