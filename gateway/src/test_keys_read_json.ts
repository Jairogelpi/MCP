
import fs from 'fs';
import crypto from 'crypto';

try {
    const content = fs.readFileSync('keys.json', 'utf8');
    console.log('File Content Length:', content.length);
    const keys = JSON.parse(content);

    let pk = keys.privateKey;
    console.log('Private Key Chars:', pk.length);
    console.log('First 20 chars:', pk.substring(0, 20));
    console.log('Has \\r:', pk.includes('\r'));
    console.log('Has \\n:', pk.includes('\n'));

    // Try raw
    try {
        crypto.createPrivateKey(pk);
        console.log('✅ RAW: Success');
    } catch (e) {
        console.log('❌ RAW: Fail', e.message);
    }

    // Try replace \r
    try {
        const clean = pk.replace(/\r/g, '');
        crypto.createPrivateKey(clean);
        console.log('✅ CLEAN (No CR): Success');
    } catch (e) {
        console.log('❌ CLEAN (No CR): Fail', e.message);
    }

    // Try trim
    try {
        const clean = pk.trim() + '\n';
        crypto.createPrivateKey(clean);
        console.log('✅ TRIM + NL: Success');
    } catch (e) {
        console.log('❌ TRIM + NL: Fail', e.message);
    }

} catch (e) {
    console.error('Fatal:', e);
}
