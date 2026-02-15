import { backupDatabase } from './ops/backup';
import { db } from '../adapters/database';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function verifyDR() {
    console.log('\n🧪 Testing Disaster Recovery Flow (Phase 8.7)...');

    const backupPath = path.resolve(__dirname, '../../backups/dr_test.sqlite');

    // 1. Seed some critical data for the chain
    console.log('   [1] Seeding critical ledger records...');
    try {
        db.raw.run('INSERT OR REPLACE INTO ledger_accounts (account_id, tenant_id, scope_type, scope_id, currency, settled_total, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['dr_acc_1', 'dr-tenant', 'tenant', 'dr-tenant', 'EUR', 500.0, Date.now()]);
    } catch (e: any) {
        console.error('   ❌ Failed to seed ledger_accounts:', e.message);
    }

    try {
        db.raw.run('INSERT INTO ledger_entries (request_id, tenant_id, type, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['dr_req_1', 'dr-tenant', 'SETTLEMENT', 500.0, 'EUR', 'SETTLED', Date.now()]);
    } catch (e: any) {
        console.error('   ❌ Failed to seed ledger_entries:', e.message);
    }

    // 2. Perform Backup
    console.log('   [2] Performing Atomic Backup...');
    if (!fs.existsSync(path.dirname(backupPath))) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }
    await backupDatabase(backupPath);

    // 3. Verify Integrity on the "Restored" file via Subprocess
    console.log('   [3] Verifying Integrity of recovered data (Subprocess)...');

    // We must run validation in a new process so it loads the database adapter with the NEW path
    try {
        const output = execSync('npx tsx src/core/ops/verify_integrity.ts', {
            env: { ...process.env, TEST_DB_PATH: backupPath, FORCE_COLOR: '1' },
            encoding: 'utf-8'
        });
        console.log(output);
    } catch (e: any) {
        console.error('   ❌ Verification Subprocess Failed:');
        console.error(e.stdout);
        console.error(e.stderr);
        throw e;
    }

    console.log('   ✅ DR Flow Verified: Backup -> Consistent Clone -> Integrity OK.');
}

verifyDR().catch(console.error);
