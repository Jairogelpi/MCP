import { db } from '../../adapters/database';
import { IdentityManager } from './identity_manager';

async function testRotation() {
    console.log('\n🧪 Testing API Key Rotation Flow...');

    // 1. Initial State
    const secret = 'rotate_me_secret_789';
    const hash = IdentityManager.hashKey(secret);
    const keyId = 'mcp_rotate_test';
    const now = Date.now();

    db.raw.run(`
        INSERT OR IGNORE INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [keyId, hash, 'u_admin', 'acme', '*', 'active', now + 100000, now]);

    const firstCheck = await IdentityManager.getIdentity(secret);
    console.log(`   [STEP 1] Initial key functional: ${!!firstCheck}`);

    // 2. Perform Rotation (Simulate API logic)
    // Revoke old
    db.raw.run("UPDATE iam_keys SET status = 'rotated' WHERE key_id = ?", [keyId]);

    // Create new
    const newSecret = 'new_secret_abc';
    const newHash = IdentityManager.hashKey(newSecret);
    const newKeyId = 'mcp_rotate_new';

    db.raw.run(`
        INSERT INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, expires_at, created_at, rotation_parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [newKeyId, newHash, 'u_admin', 'acme', '*', now + 100000, now, keyId]);

    // 3. Verify Old is Revoked and New works
    const oldCheck = await IdentityManager.getIdentity(secret);
    const newCheck = await IdentityManager.getIdentity(newSecret);

    console.log(`   [STEP 2] Old key revoked: ${oldCheck === null}`);
    console.log(`   [STEP 3] New key functional: ${!!newCheck}`);

    const status = (oldCheck === null && !!newCheck) ? '✅' : '❌';
    console.log(`\n📊 Rotation Result: ${status}`);
}

testRotation().catch(console.error);
