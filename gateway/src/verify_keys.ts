
import crypto from 'crypto';

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIKFv98yK7h0f+fH1b5j9tW0vJ4zO2n7r6fW5n9uW2Y3S
-----END PRIVATE KEY-----`;

const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAixt6mRBe1N4vNIn6e9sR5f2D6Z0pExE2oF3U/9p79Xo=
-----END PUBLIC KEY-----`;

try {
    const privKey = crypto.createPrivateKey(privateKeyPem);
    const pubKey = crypto.createPublicKey(publicKeyPem);

    const data = Buffer.from('test message');
    const signature = crypto.sign(null, data, privKey);
    const verified = crypto.verify(null, data, pubKey, signature);

    console.log(`Pair Valid: ${verified}`);
} catch (e) {
    console.error('Key check error:', (e as Error).message);
}
