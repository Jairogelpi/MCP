
import * as crypto from 'crypto';

function generate() {
    console.log('--- Ed25519 KEY GENERATOR ---');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

    const pubBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    const privBase64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');

    console.log('\n[PUBLIC KEY (Base64 SPKI)]');
    console.log(pubBase64);

    console.log('\n[PRIVATE KEY (Base64 PKCS8)]');
    console.log(privBase64);
    console.log('\nSAVE THE PRIVATE KEY TO YOUR .env AS: GATEWAY_PRIVATE_KEY');
}

generate();
