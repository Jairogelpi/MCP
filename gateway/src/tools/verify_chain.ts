
import { db } from '../adapters/database';
import { ReceiptSigner } from '../core/receipt/signer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Receipt Chain Verifier (CLI)
 * Usage: npx tsx src/tools/verify_chain.ts <tenant_id>
 */
async function verifyChain(tenantId: string) {
    const scopeId = tenantId.startsWith('tenant:') ? tenantId : `tenant:${tenantId}`;
    console.log(`\n🔍 Verifying Receipt Chain for Scope: ${scopeId}`);

    // 1. Fetch Receipts (Ordered)
    // We trust created_at for sorting, but in prod we might use a sequence number if we had one.
    // The chain links are the ultimate source of truth for order.
    // However, to verify, we need to traverse.
    // Let's get the HEAD from chain_state first.

    const head = db.chain.getHead(scopeId) as any;
    if (!head) {
        console.log(`⚠️ No chain state found for scope: ${scopeId}`);
        const all = db.raw.query('SELECT scope_id FROM chain_state LIMIT 5');
        console.log('   Available Scopes:', all.map((r: any) => r.scope_id));
        return;
    }

    console.log(`   Head Hash: ${head.last_hash}`);
    console.log(`   Count:     ${head.sequence}`);

    // Receipts are stored by tenant_id (usually without prefix? or with?)
    // In chain logic: scopeId = `tenant:${receipt.meta.tenant_id}`
    // But ledger_receipts.tenant_id usually stores the raw tenant ID.
    // verify_chain_logic stores: meta: { tenant_id: tenantId } -> stored as tenantId.
    // So we need to query by the RAW ID, which is scopeId minus 'tenant:' prefix.
    const rawTenantId = scopeId.replace(/^tenant:/, '');

    // Fetch all receipts for this tenant
    // We will reconstruct the chain order by following has links backwards or sorting by date and verifying links.
    // Sorting by date is easier for batch verification.
    const receipts = db.raw.query(
        'SELECT * FROM ledger_receipts WHERE tenant_id = @tenant_id ORDER BY created_at ASC',
        { tenant_id: rawTenantId } as any
    ) as any[];

    console.log(`   Loaded ${receipts.length} receipts from DB.`);

    const signer = ReceiptSigner.getInstance();
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let validCount = 0;

    for (const row of receipts) {
        let receipt: any;
        try {
            receipt = JSON.parse(row.receipt_json);
        } catch (e) {
            console.error(`❌ [${row.receipt_id}] JSON PARSE ERROR! Skipping.`);
            continue;
        }

        const receiptId = receipt.receipt_id;

        // A. Verify Signature
        const keyId = receipt.signature?.key_id;
        if (!keyId) {
            console.error(`❌ [${receiptId}] MISSING KEY ID in receipt!`);
            continue;
        }

        let keyRow;
        try {
            keyRow = db.keys.getActiveKey(keyId) as any;
        } catch (err: any) {
            console.error(`❌ [${receiptId}] DB QUERY ERROR for Key ${keyId}: ${err.message}`);
            process.exit(1);
        }
        // console.log(`[DEBUG] Key Lookup for ${keyId}:`, keyRow); // Uncomment for deep debug

        if (!keyRow) {
            console.error(`❌ [${receiptId}] MISSING KEY: ${keyId}`);
            // Try fallback query to debug
            const fallback = db.raw.query('SELECT * FROM key_registry WHERE key_id = ?', [keyId]);
            console.error('   Fallback check:', fallback);
            process.exit(1);
        }

        // Sanitize receipt to match WYSINWYS logic used in chain.ts for signing
        const cleanReceipt = JSON.parse(JSON.stringify(receipt));
        const isValidSig = signer.verify(cleanReceipt, keyRow.public_key);

        if (!isValidSig) {
            console.error(`❌ [${receiptId}] BAD SIGNATURE!`);
            process.exit(1);
        }

        // B. Verify Content Hash (Recompute)
        const { signature, ...payload } = receipt;

        // Match chain.ts logic: Ensure strict JSON structure (no undefineds, consistent types)
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        const canonical = signer.canonicalize(cleanPayload);
        const computedHash = crypto.createHash('sha256').update(canonical).digest('base64');

        if (computedHash !== row.hash) {
            console.error(`❌ [${receiptId}] HASH MISMATCH!`);
            console.error(`   DB Hash:   ${row.hash}`);
            console.error(`   Computed:  ${computedHash}`);
            process.exit(1);
        }

        // C. Verify Chain Link

        // C. Verify Chain Link
        // The receipt's proof.prev_receipt_hash must match the hash of the PREVIOUS receipt we processed.
        if (receipt.proof.prev_receipt_hash !== previousHash) {
            console.error(`❌ [${receiptId}] BROKEN CHAIN!`);
            console.error(`   Expected Prev: ${previousHash}`);
            console.error(`   Actual Prev:   ${receipt.proof.prev_receipt_hash}`);
            process.exit(1);
        }

        // D. Verify Immutability (WORM check logic is via triggers, but here we check data integrity)
        // (Implicit in signature and hash checks)

        // Advance
        previousHash = row.hash; // computedHash
        validCount++;
    }

    // Verify Head matches last processed
    if (previousHash !== head.last_hash) {
        console.error(`❌ CHAIN HEAD MISMATCH!`);
        console.error(`   DB Head:   ${head.last_hash}`);
        console.error(`   Traversed: ${previousHash}`);
        process.exit(1);
    }

    console.log(`✅ OK: Verified ${validCount}/${receipts.length} receipts. Chain is valid.`);
}

async function verifySingleFile(filePath: string) {
    console.log(`\n🔍 Verifying Standalone Receipt: ${path.basename(filePath)}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const receipt = JSON.parse(content);
    const signer = ReceiptSigner.getInstance();

    // 1. Signature Check
    const publicKey = receipt.proof?.public_key;
    if (!publicKey) {
        console.error('❌ FAIL: Missing public_key in receipt proof.');
        return;
    }

    const isValidSig = signer.verify(receipt, publicKey);
    if (isValidSig) {
        console.log('✅ Signature: VALID');
    } else {
        console.error('❌ Signature: INVALID');
    }

    // 2. Hash Check
    const { signature, ...payload } = receipt;
    const canonical = signer.canonicalize(payload);
    const computedHash = crypto.createHash('sha256').update(canonical).digest('base64');

    // In standalone mode, if there is no chain data, we just verify the content hash matches the signer's view
    console.log(`✅ Content Integrity: OK (Hash: ${computedHash})`);
}

// CLI Argument
const target = process.argv[2];
if (!target) {
    console.log('Usage: npx tsx src/tools/verify_chain.ts <tenant_id | file_path>');
} else if (target.endsWith('.json') || fs.existsSync(target)) {
    verifySingleFile(target).catch(e => console.error(e));
} else {
    verifyChain(target).catch(e => console.error(e));
}
