import { db } from './adapters/database';
import { IdentityManager } from './core/auth/identity_manager';

export function seedEnterpriseIAM() {
    console.log('[SEED] Seeding Enterprise IAM...');

    // 1. Create Users
    db.raw.run("INSERT OR IGNORE INTO iam_users (user_id, name) VALUES ('u_admin', 'Master Admin')");
    db.raw.run("INSERT OR IGNORE INTO iam_users (user_id, name) VALUES ('u_viewer', 'Auditor Viewer')");

    // 2. Assign Roles
    db.raw.run("INSERT OR IGNORE INTO iam_user_roles (user_id, role_id) VALUES ('u_admin', 'role_admin')");
    db.raw.run("INSERT OR IGNORE INTO iam_user_roles (user_id, role_id) VALUES ('u_viewer', 'role_viewer')");

    // 3. Create Keys (These will be printed so we can use them in tests)
    const adminSecret = 'admin_secret_123';
    const viewerSecret = 'viewer_secret_456';

    const adminHash = IdentityManager.hashKey(adminSecret);
    const viewerHash = IdentityManager.hashKey(viewerSecret);

    const now = Date.now();
    const expiry = now + 365 * 24 * 60 * 60 * 1000;

    db.raw.run(`
        INSERT OR IGNORE INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['mcp_admin_01', adminHash, 'u_admin', 'acme', '*', 'active', expiry, now]);

    db.raw.run(`
        INSERT OR IGNORE INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['mcp_viewer_01', viewerHash, 'u_viewer', 'acme', 'read_receipts,verify_receipts', 'active', expiry, now]);

    console.log('[SEED] Done.');
    console.log(`   Admin Key Secret:  ${adminSecret}`);
    console.log(`   Viewer Key Secret: ${viewerSecret}`);

    // 4. Demo Key (For Claude Desktop)
    const demoSecret = 'demo-key';
    const demoHash = IdentityManager.hashKey(demoSecret);
    db.raw.run("INSERT OR IGNORE INTO iam_users (user_id, name) VALUES ('u_demo', 'Demo Client')");
    db.raw.run("INSERT OR IGNORE INTO iam_user_roles (user_id, role_id) VALUES ('u_demo', 'role_admin')"); // Grant admin for full demo access
    db.raw.run(`
        INSERT OR IGNORE INTO iam_keys (key_id, key_hash, user_id, tenant_id, scopes, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['mcp_demo_01', demoHash, 'u_demo', 'demo-client', '*', 'active', expiry, now]);
    console.log(`   Demo Key Secret:   ${demoSecret}`);
}
