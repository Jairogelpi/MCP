
import { processReceipt } from './core/receipt/chain';
import { db } from './adapters/database';
import crypto from 'crypto';

async function verifyConcurrency() {
    console.log('\n--- PHASE 5.5 CONCURRENCY STRESS TEST ---');

    const tenantId = 'stress_tenant_' + Date.now();
    // const manager = ReceiptChainManager.getInstance();

    // Setup keys
    process.env.GATEWAY_PRIVATE_KEY = 'MC4CAQAwBQYDK2VwBCIEIKFv98yK7h0f+fH1b5j9tW0vJ4zO2n7r6fW5n9uW2Y3S';
    try { db.keys.upsertKey({ key_id: 'gateway-key-v1', public_key: 'MCowBQYDK2VwAyEAixt6mRBe1N4vNIn6e9sR5f2D6Z0pExE2oF3U/9p79Xo=', status: 'active' }); } catch (e) { }

    const PARALLEL_REQUESTS = 50;
    console.log(`[TEST] Launching ${PARALLEL_REQUESTS} parallel receipt generations...`);

    const promises = [];
    for (let i = 0; i < PARALLEL_REQUESTS; i++) {
        promises.push(new Promise(async (resolve) => {
            const id = `req-${i}-${Math.random().toString(36).substring(7)}`;
            try {
                const receipt = {
                    receipt_id: crypto.randomUUID(),
                    request_id: id,
                    meta: { tenant_id: tenantId },
                    operation: { tool_name: 'test', mcp_method: 'call' },
                    proof: { request_hash: 'h', response_hash: 'h', nonce: 'n', prev_receipt_hash: '' },
                    decision: { effect: 'allow', reason_codes: [] },
                    economic: { cost_settled: 0.01, currency: 'EUR' },
                    timestamps: { created_at: new Date().toISOString() },
                    signature: { alg: 'ed25519', key_id: 'gateway-key-v1' }
                };

                // Simulate slight delay to encourage races if not locked properly
                await new Promise(r => setTimeout(r, Math.random() * 10));

                processReceipt(receipt);
                resolve({ success: true, id });
            } catch (e: any) {
                resolve({ success: false, id, error: e.message });
            }
        }));
    }

    const results = await Promise.all(promises);
    const failures = results.filter((r: any) => !r.success);

    if (failures.length > 0) {
        console.error(`❌ FAIL: ${failures.length} requests failed!`, failures[0]);
    } else {
        console.log(`✅ PASS: All ${PARALLEL_REQUESTS} requests processed successfully.`);
    }

    // Returns all receipts ordered by insertion time (approx)
    // Actually, let's verify the chain integrity
    console.log('[TEST] Verifying Chain Integrity...');

    const chainState = db.chain.getHead(`tenant:${tenantId}`) as any;
    console.log('Chain State:', chainState);

    if (chainState.sequence !== PARALLEL_REQUESTS) {
        console.error(`❌ FAIL: Sequence mismatch. Expected ${PARALLEL_REQUESTS}, got ${chainState.sequence}`);
    } else {
        console.log('✅ PASS: Sequence count matches.');
    }

    // Traverse back
    let currentHash = chainState.last_hash;
    let count = 0;
    while (currentHash !== '0000000000000000000000000000000000000000000000000000000000000000' && count < 1000) {
        const row = db.raw.query('SELECT * FROM ledger_receipts WHERE hash = ?', [currentHash])[0] as any;
        if (!row) {
            // Genesis check?
            // Actually genesis hash is not in receipts table usually, it's just a value in prev_hash
            break;
        }
        currentHash = row.prev_hash;
        count++;
    }

    if (count === PARALLEL_REQUESTS) {
        console.log(`✅ PASS: Successfully traversed ${count} links back to genesis.`);
        console.log(`\n📋 TENANT ID FOR VERIFICATION: ${tenantId}\n`);
    } else {
        console.error(`❌ FAIL: Traversal broken or incomplete. Counted ${count}`);
    }
}

verifyConcurrency().catch(console.error);
