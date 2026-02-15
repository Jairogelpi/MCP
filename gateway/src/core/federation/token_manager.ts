import * as crypto from 'crypto';

interface DelegationToken {
    iss: string; // Issuer (Client)
    sub: string; // Subject (Agency)
    scope: string;
    budget_cap: number; // Micro-USD
    expiry: number;
}

export class FederationTokenManager {
    private keys: Record<string, { privateKey: crypto.KeyObject, publicKey: crypto.KeyObject }> = {};

    constructor() {
        // Mock keys for 'client_corp' and 'agency_inc'
        this.keys['client_corp'] = crypto.generateKeyPairSync('ed25519');
        this.keys['agency_inc'] = crypto.generateKeyPairSync('ed25519');
    }

    issueToken(issuerIds: string, subjectId: string, scope: string, cap: number): string {
        const payload: DelegationToken = {
            iss: issuerIds,
            sub: subjectId,
            scope,
            budget_cap: cap,
            expiry: Date.now() + 3600000 // 1 hour
        };

        const canonical = JSON.stringify(payload);
        const sig = crypto.sign(null, Buffer.from(canonical), this.keys[issuerIds].privateKey).toString('base64');

        return Buffer.from(canonical).toString('base64') + '.' + sig;
    }

    verifyToken(tokenString: string): DelegationToken | null {
        const [payloadB64, sigB64] = tokenString.split('.');
        const payloadJson = Buffer.from(payloadB64, 'base64').toString();
        const payload = JSON.parse(payloadJson) as DelegationToken;

        // Verify Expiry
        if (Date.now() > payload.expiry) {
            console.error('Federation Token Expired');
            return null;
        }

        // Verify Signature
        const issuerKey = this.keys[payload.iss]?.publicKey;
        if (!issuerKey) {
            console.error('Unknown Issuer');
            return null;
        }

        const isValid = crypto.verify(null, Buffer.from(payloadJson), issuerKey, Buffer.from(sigB64, 'base64'));
        if (!isValid) return null;

        return payload;
    }
}
