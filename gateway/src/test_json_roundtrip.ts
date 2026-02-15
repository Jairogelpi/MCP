
import { ReceiptSigner } from './core/receipt/signer';
import crypto from 'crypto';

const signer = ReceiptSigner.getInstance();

const original = {
    receipt_id: "r1-7iak73",
    request_id: "req-r1-7iak73",
    meta: { tenant_id: "test_tenant" },
    operation: { tool_name: "test", mcp_method: "call" },
    proof: {
        request_hash: "reqhash",
        response_hash: "reshash",
        nonce: "n-r1",
        prev_receipt_hash: "0000000000000000000000000000000000000000000000000000000000000000"
    },
    decision: { effect: "allow", reason_codes: [] },
    economic: { cost_settled: 0.05, currency: "EUR" },
    timestamps: { created_at: "2026-02-13T15:09:52.736Z" },
    signature: { alg: "ed25519", key_id: "gateway-key-v1", sig: "dul..." }
};

// 1. Calculate Hash on Original (Logic from chain.ts)
const { signature: _sig1, ...payload1 } = original;
const c1 = signer.canonicalize(payload1);
const h1 = crypto.createHash('sha256').update(c1).digest('base64');
console.log('Original Hash:', h1);
console.log('Original Canonical:', c1);

// 2. Simulate DB Round Trip
const json = JSON.stringify(original);
const stored = JSON.parse(json);

// 3. Calculate Hash on Stored (Logic from verify_chain.ts)
const { signature: _sig2, ...payload2 } = stored;
const c2 = signer.canonicalize(payload2);
const h2 = crypto.createHash('sha256').update(c2).digest('base64');
console.log('Stored Hash:  ', h2);
console.log('Stored Canonical:  ', c2);

if (h1 !== h2) {
    console.error('❌ MISMATCH!');
    // Find diff
    for (let i = 0; i < c1.length; i++) {
        if (c1[i] !== c2[i]) {
            console.log(`Diff at index ${i}: ${c1.charCodeAt(i)} vs ${c2.charCodeAt(i)}`);
            console.log(`Context: ${c1.substring(i - 10, i + 10)}`);
            break;
        }
    }
} else {
    console.log('✅ MATCH');
}
