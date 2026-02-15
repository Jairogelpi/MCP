
const fs = require('fs');

try {
    const s1 = fs.readFileSync('canonical_logic.txt', 'utf8');
    let s2;
    let mode = '';

    if (fs.existsSync('canonical_sig_fail.txt')) {
        s2 = fs.readFileSync('canonical_sig_fail.txt', 'utf8');
        console.log('found_sig_fail');
        mode = 'SIG_FAIL';
    } else if (fs.existsSync('canonical_db.txt')) {
        s2 = fs.readFileSync('canonical_db.txt', 'utf8');
        console.log('found_hash_mismatch');
        mode = 'HASH_FAIL';
    } else {
        console.log('no_debug_files');
        process.exit(0);
    }

    console.log(`Logic Len: ${s1.length}`);
    console.log(`DB Len:    ${s2.length}`);

    if (s1 === s2) {
        console.log('MATCH');
    } else {
        console.log('MISMATCH');
        const len = Math.min(s1.length, s2.length);
        for (let i = 0; i < len; i++) {
            if (s1[i] !== s2[i]) {
                console.log(`Diff at ${i}: L '${s1[i]}' vs D '${s2[i]}'`);
                console.log(`Context: ${s1.substring(i - 10, i + 10)}`);
                break;
            }
        }
    }
} catch (e) {
    console.error('Error:', e.message);
}
