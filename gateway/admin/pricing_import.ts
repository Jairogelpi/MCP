import { db } from '../src/adapters/database';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const CONFIG_DIR = path.resolve(__dirname, '../config/pricing');

async function importPricing() {
    console.log('[IMPORT] Starting Pricing Import...');

    if (!fs.existsSync(CONFIG_DIR)) {
        console.error(`[IMPORT] Config directory not found: ${CONFIG_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    // Clear existing? Or just append?
    // For "Source of Truth" sync, usually we might want to clear or update. 
    // Let's clear for this version to ensure clean slate.
    console.log('[IMPORT] Clearing existing pricing...');
    db.pricing.clear();

    let count = 0;

    for (const file of files) {
        console.log(`[IMPORT] Processing ${file}...`);
        const content = fs.readFileSync(path.join(CONFIG_DIR, file), 'utf-8');
        const doc: any = yaml.load(content);

        if (!doc.rates || !Array.isArray(doc.rates)) {
            console.warn(`[IMPORT] Skipping ${file}: No 'rates' array found.`);
            continue;
        }

        for (const rate of doc.rates) {
            db.pricing.upsert({
                provider: rate.provider,
                model: rate.model,
                endpoint: rate.endpoint,
                region: rate.region || 'global',
                tier: rate.tier || 'standard',
                input_price: rate.input_price,
                output_price: rate.output_price,
                flat_fee: rate.flat_fee || 0,
                effective_from: rate.effective_from || Date.now(),
                effective_to: rate.effective_to || null,
                created_at: Date.now()
            });
            count++;
        }
    }

    console.log(`[IMPORT] Successfully imported ${count} rates.`);
}

importPricing().catch(err => {
    console.error('[IMPORT] Failed:', err);
    process.exit(1);
});
