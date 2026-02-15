
import crypto from 'crypto';
import fs from 'fs';

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' }
});

const fs = require('fs');
fs.writeFileSync('private.pem', privateKey);
fs.writeFileSync('public.pem', publicKey);
console.log('Keys written to private.pem and public.pem');

// Verify immediately
const data = Buffer.from('test');
const sig = crypto.sign(null, data, crypto.createPrivateKey(privateKey));
const valid = crypto.verify(null, data, crypto.createPublicKey(publicKey), sig);
console.log('Pair Valid:', valid);
