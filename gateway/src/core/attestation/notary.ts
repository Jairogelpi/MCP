import * as crypto from 'crypto';

interface Attestation {
    issuer: string;
    issued_at: number;
    scope: string;
    subjects: string[];
    assertion: 'VALID' | 'REVOKED' | 'AUDITED';
    signature: string;
}

export class NotaryService {
    private privateKey: crypto.KeyObject;
    private publicKey: crypto.KeyObject;
    public issuerDid = 'did:web:notary.mcp.io';

    constructor() {
        // Generate ephemeral signing keys for this mock notary
        const keys = crypto.generateKeyPairSync('ed25519');
        this.privateKey = keys.privateKey;
        this.publicKey = keys.publicKey;
    }

    // Sign a list of receipt hashes
    signAttestation(scope: string, receiptHashes: string[]): Attestation {
        const attestation: Omit<Attestation, 'signature'> = {
            issuer: this.issuerDid,
            issued_at: Date.now(),
            scope,
            subjects: receiptHashes,
            assertion: 'VALID'
        };

        // Canonicalize (JCS-like sort)
        const canonical = JSON.stringify(attestation, Object.keys(attestation).sort());

        const signature = crypto.sign(null, Buffer.from(canonical), this.privateKey).toString('hex');

        return {
            ...attestation,
            signature
        };
    }

    verify(attestation: Attestation): boolean {
        const { signature, ...body } = attestation;
        const canonical = JSON.stringify(body, Object.keys(body).sort());

        return crypto.verify(null, Buffer.from(canonical), this.publicKey, Buffer.from(signature, 'hex'));
    }
}
