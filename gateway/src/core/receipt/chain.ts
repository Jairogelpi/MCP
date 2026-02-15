
import { db } from '../../adapters/database';
import { ReceiptSigner } from './signer';
import crypto from 'crypto';

/**
 * PROCESS:
 * 1. Determine Scope (Tenant ID)
 * 2. DB Transaction:
 *    a. Read Head (Last Hash)
 *    b. Link: receipt.prev = Head
 *    c. Hash: Calculate New Hash
 *    d. Sign: Generate Signature
 *    e. Advance: Update Head = New Hash (Optimistic Lock)
 *    f. Store: Insert Receipt
 */
export async function processReceipt(receipt: any): Promise<any> {
    const scopeId = `tenant:${receipt.meta.tenant_id}`;
    const signer = ReceiptSigner.getInstance();

    // Using serialized async transaction
    return await db.raw.transaction(async () => {
        // 1. Get Head
        const head = await db.chain.getHead(scopeId) as any;
        let prevHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis

        if (head) {
            prevHash = head.last_hash;
        }

        // 2. Link
        receipt.proof.prev_receipt_hash = prevHash;

        // 3. Hash (Canonical body without signature)
        const { signature: _unusedSig, ...payload } = receipt;
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        const canonicalJson = signer.canonicalize(cleanPayload);
        console.log(`[CHAIN] Hash Canonical Start: ${canonicalJson.substring(0, 50)}`);

        // Generate SHA-256 of the content (This is the "Receipt Hash" used for chaining)
        const receiptHash = crypto.createHash('sha256').update(canonicalJson).digest('base64');

        // 4. Sign
        const cleanReceipt = JSON.parse(JSON.stringify(receipt));
        const signature = signer.sign(cleanReceipt);
        receipt.signature.sig = signature;

        // 5. Advance Chain
        if (!head) {
            await db.chain.initChain(scopeId, receiptHash, receipt.receipt_id);
        } else {
            await db.chain.advance(scopeId, receiptHash, receipt.receipt_id, prevHash);
        }

        // 6. Store
        await db.chain.storeReceipt(receipt, receiptHash, signature);

        return receipt;
    });
}
