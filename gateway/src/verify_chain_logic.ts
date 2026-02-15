
import { processReceipt } from './core/receipt/chain';
import { db } from './adapters/database';
import { ReceiptSigner } from './core/receipt/signer';

async function verifyChain() {
    console.log('\n--- PHASE 5.5 CHAIN VERIFICATION ---');

    // Setup Key (Valid Pair from file)
    const fs = require('fs');
    try {
        const content = fs.readFileSync('keys.json', 'utf8');
        const keys = JSON.parse(content);

        process.env.GATEWAY_PRIVATE_KEY = keys.privateKey;

        db.keys.upsertKey({
            key_id: 'gateway-key-v1',
            public_key: keys.publicKey,
            status: 'active'
        });
        console.log('✅ Keys loaded successfully from keys.json');
    } catch (e) {
        console.error('Failed to load keys from keys.json', e);
        return;
    }

    // const manager = ReceiptChainManager.getInstance();
    const tenantId = 'test_tenant_chain_' + Date.now();

    console.log(`[TEST] Creating Chain for ${tenantId}...`);

    const r1 = createDummyReceipt(tenantId, 'r1');
    const processedR1 = processReceipt(r1);
    console.log(`[R1] Prev: ${processedR1.proof.prev_receipt_hash.substring(0, 10)}...`);
    console.log(`[R1] Sig:  ${processedR1.signature.sig.substring(0, 10)}...`);

    const r2 = createDummyReceipt(tenantId, 'r2');
    const processedR2 = processReceipt(r2);
    console.log(`[R2] Prev: ${processedR2.proof.prev_receipt_hash.substring(0, 10)}...`);

    // Hash R1 manually to check link
    const signer = ReceiptSigner.getInstance();
    const { signature, ...payload1 } = processedR1;
    // We need to re-calc the hash that the chain manager used.
    // The chain manager used SHA256(canonical(payload)).
    const crypto = require('crypto');
    const c1 = signer.canonicalize(payload1);
    fs.writeFileSync('canonical_logic.txt', c1);
    console.log('[DEBUG] Canonical written to canonical_logic.txt');
    const h1 = crypto.createHash('sha256').update(c1).digest('base64');

    if (processedR2.proof.prev_receipt_hash === h1) {
        console.log('✅ PASS: R2 links correctly to R1 hash.');
        console.log(`\n📋 TENANT ID FOR VERIFICATION: ${tenantId}\n`);
    } else {
        console.error('❌ FAIL: Broken Link!');
        console.error('Expected:', h1);
        console.error('Actual:  ', processedR2.proof.prev_receipt_hash);
    }
    console.log(`\n📋 TENANT ID: ${tenantId}\n`);
}

function createDummyReceipt(tenantId: string, id: string) {
    const randomSuffix = Math.random().toString(36).substring(7);
    const finalId = `${id}-${randomSuffix}`;
    return {
        receipt_id: finalId,
        request_id: 'req-' + finalId,
        meta: { tenant_id: tenantId },
        operation: { tool_name: 'test', mcp_method: 'call' },
        proof: {
            request_hash: 'reqhash',
            response_hash: 'reshash',
            nonce: 'n-' + id
            // prev_receipt_hash will be injected
        },
        decision: { effect: 'allow', reason_codes: [] },
        economic: { cost_settled: 0.05, currency: 'EUR' },
        timestamps: { created_at: new Date().toISOString() },
        signature: { alg: 'ed25519', key_id: 'gateway-key-v1', sig: '' }
    };
}

verifyChain().catch(console.error);
