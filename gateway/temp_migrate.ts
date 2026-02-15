import { db } from './src/adapters/database';

async function migrate() {
    console.log('Running Manual Migration for Phase 8.2...');
    try {
        db.raw.query("ALTER TABLE key_registry ADD COLUMN role TEXT DEFAULT 'tenant'");
        db.raw.query("ALTER TABLE key_registry ADD COLUMN scopes TEXT DEFAULT '*'");
        db.raw.query("ALTER TABLE key_registry ADD COLUMN expires_at INTEGER");
        db.raw.query("ALTER TABLE key_registry ADD COLUMN rotation_parent_id TEXT");
        console.log('✅ Columns added successfully.');
    } catch (e: any) {
        if (e.message.includes('duplicate column')) {
            console.log('⚠️  Columns already exist.');
        } else {
            console.error('❌ Migration failed:', e.message);
        }
    }
}

migrate();
