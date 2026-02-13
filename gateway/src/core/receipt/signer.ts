import { ActionEnvelope } from '../contract';
import * as crypto from 'crypto';
import { db } from '../../adapters/database';

export class ReceiptSigner {
    private static instance: ReceiptSigner;
    private privateKey: Buffer | null = null;
    private keyId: string = 'gateway-key-v1';

    private constructor() {
        // In a real scenario, this would come from a vault or env
        // For Phase 5.4, we will use a seed key if not provided
        const envKey = process.env.GATEWAY_PRIVATE_KEY;
        if (envKey) {
            this.privateKey = Buffer.from(envKey, 'base64');
        }
    }

    public static getInstance(): ReceiptSigner {
        if (!ReceiptSigner.instance) {
            ReceiptSigner.instance = new ReceiptSigner();
        }
        return ReceiptSigner.instance;
    }

    /**
     * Canonicalizes an object for hashing (Key sorting, no whitespace)
     */
    public canonicalize(obj: any): string {
        if (Array.isArray(obj)) {
            return "[" + obj.map(item => this.canonicalize(item)).join(",") + "]";
        }
        if (typeof obj === "object" && obj !== null) {
            const sortedKeys = Object.keys(obj).sort();
            const pairs = sortedKeys.map(key => {
                return JSON.stringify(key) + ":" + this.canonicalize(obj[key]);
            });
            return "{" + pairs.join(",") + "}";
        }
        return JSON.stringify(obj);
    }

    public hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('base64');
    }

    public sign(receipt: any): string {
        if (!this.privateKey) {
            throw new Error('Private key not loaded. Cannot sign receipt.');
        }

        const { signature, ...payload } = receipt;
        const canonical = this.canonicalize(payload);

        // Prepare Key
        const key = crypto.createPrivateKey({
            key: this.privateKey,
            format: 'der',
            type: 'pkcs8'
        });

        // Ed25519 signing doesn't use a hash algorithm (it's built-in)
        const sig = crypto.sign(undefined, Buffer.from(canonical), key);

        return sig.toString('base64');
    }

    public verify(receipt: any, publicKey: string): boolean {
        const { signature, ...payload } = receipt;
        const canonical = this.canonicalize(payload);
        const sigBuffer = Buffer.from(signature.sig, 'base64');
        const pubKeyBuffer = Buffer.from(publicKey, 'base64');

        try {
            const key = crypto.createPublicKey({
                key: pubKeyBuffer,
                format: 'der',
                type: 'spki'
            });

            return crypto.verify(
                undefined,
                Buffer.from(canonical),
                key,
                sigBuffer
            );
        } catch (e) {
            console.error('[SIGNER] Verification error:', e);
            return false;
        }
    }

    // Helper for generating keys (Phase 5.4 only)
    public generateKeyPair(): { publicKey: string; privateKey: string } {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        return {
            publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
            privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')
        };
    }
}
