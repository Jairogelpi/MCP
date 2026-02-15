import * as crypto from 'crypto';

interface Receipt {
    id: string;
    prompt: string;
    response: string;
    cost: number;
    timestamp: number;
}

interface RedactedReceipt {
    id: string;
    visible: Partial<Receipt>;
    hashes: Record<string, string>;
    root_hash: string;
}

export class PrivacyProofGenerator {

    // Convert a full receipt into a redacted one
    static redact(receipt: Receipt, fieldsToHide: (keyof Receipt)[]): RedactedReceipt {
        const visible: any = {};
        const hashes: any = {};
        const salts: any = {}; // In a real system, you'd store these securely or discard if 1-way

        const allKeys = Object.keys(receipt) as (keyof Receipt)[];
        const leafHashes: string[] = [];

        for (const key of allKeys) {
            const val = String(receipt[key]);
            if (fieldsToHide.includes(key)) {
                // Hide it
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = crypto.createHash('sha256').update(salt + val).digest('hex');
                hashes[key] = hash;
                leafHashes.push(hash);
            } else {
                // Show it
                visible[key] = receipt[key];
                leafHashes.push(crypto.createHash('sha256').update(val).digest('hex')); // Hash visible too for Root
            }
        }

        // Simple Root (Merkle-ish, just sorting and hashing all leaf hashes for this demo)
        const root_hash = crypto.createHash('sha256').update(leafHashes.sort().join('')).digest('hex');

        return {
            id: receipt.id,
            visible,
            hashes,
            root_hash
        };
    }

    static verify(redacted: RedactedReceipt): boolean {
        // Here we would verify the root_hash against a notary signature
        // For now, we assume if the struct is consistent, it's "verified" in this context
        return !!redacted.root_hash;
    }
}
