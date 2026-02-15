import { db } from '../adapters/database';
import { ReceiptSigner } from '../core/receipt/signer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Tenant Provisioning CLI
 * Usage: npx tsx src/admin/provision_tenant.ts <tenant_name> [budget_limit] [role] [scopes]
 */
async function provision(tenantName: string, budgetLimit: number = 50, role: string = 'tenant', scopes: string = '*') {
    console.log(`\n🏗️  Provisioning New Tenant: ${tenantName} (${role})`);

    // 1. Generate API Keys & Signing Keys
    const signer = ReceiptSigner.getInstance();
    const apiKey = `mcp_${crypto.randomBytes(16).toString('hex')}`;
    const { publicKey, privateKey } = signer.generateKeyPair();

    // 2. Insert Tenant & Keys
    db.raw.run('INSERT OR IGNORE INTO key_registry (key_id, public_key, status, created_at, role, scopes) VALUES (?, ?, ?, ?, ?, ?)',
        [`key_${tenantName}`, publicKey, 'active', Date.now(), role, scopes]);

    // In a real system we'd store the API key hash, for MVP we just log it
    console.log(`   🔑 API Key:     ${apiKey}`);
    console.log(`   🛡️ Public Key:  ${publicKey}`);

    // 3. Apply Policy Template
    const policyPath = path.join('templates', 'policies', 'default.yaml');
    if (fs.existsSync(policyPath)) {
        console.log(`   📜 Applying default policy template...`);
        // In real logic, we'd parse YAML and insert into DB/fs
        const targetDir = path.join('policies', 'tenant', tenantName);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(policyPath, path.join(targetDir, 'ruleset_v1.yaml'));
    }

    // 4. Initialize Budget
    console.log(`   💰 Initializing budget scope with ${budgetLimit} EUR limit...`);
    const now = Date.now();
    db.raw.run(`
        INSERT OR IGNORE INTO budgets (id, scope_type, scope_id, period, hard_limit, soft_limit, currency, active_from, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [`tenant:${tenantName}`, 'tenant', tenantName, 'monthly', budgetLimit, budgetLimit * 0.8, 'EUR', now, now]);

    // Initialize spending record
    db.raw.run('INSERT OR IGNORE INTO budget_spending (budget_id, spent_estimated, last_updated_at) VALUES (?, ?, ?)',
        [`tenant:${tenantName}`, 0, now]);

    console.log(`\n✅ Tenant ${tenantName} successfully provisioned.`);
}

const name = process.argv[2];
const limit = parseFloat(process.argv[3] || '50');
const role = process.argv[4] || 'tenant';
const scopes = process.argv[5] || '*';

if (!name) {
    console.log('Usage: npx tsx src/admin/provision_tenant.ts <tenant_name> [budget_limit] [role] [scopes]');
} else {
    provision(name, limit, role, scopes).catch(console.error);
}
