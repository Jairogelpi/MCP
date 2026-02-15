import { db } from '../adapters/database';
import fs from 'fs';
import path from 'path';

/**
 * Billing & Audit Export Tool
 */
async function exportBilling(tenantId?: string) {
    if (!tenantId) {
        console.error('Usage: npx tsx src/admin/billing_export.ts <tenant_id>');
        return;
    }

    console.log(`📊 Generating Billing Bundle for Tenant: ${tenantId}...`);
    const timestamp = Date.now();
    const outDir = 'exports';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    // 1. Usage Daily CSV (Aggregated)
    const usageQuery = `
        SELECT date(created_at/1000, 'unixepoch') as day, status as type, sum(amount_settled) as total 
        FROM ledger_transactions 
        WHERE tenant_id = ? AND status = "SETTLED"
        GROUP BY 1, 2
    `;
    const usage = db.raw.query(usageQuery, [tenantId]) as any[];
    const usageCsv = "day,type,total_amount\n" + usage.map(u => `${u.day},${u.type},${u.total}`).join('\n');
    fs.writeFileSync(path.join(outDir, `usage_${tenantId}_${timestamp}.csv`), usageCsv);

    // 2. Receipts NDJSON (Audit trail)
    const receipts = db.raw.query('SELECT receipt_json FROM ledger_receipts WHERE tenant_id = ?', [tenantId]) as any[];
    const receiptsNdjson = receipts.map(r => r.receipt_json).join('\n');
    fs.writeFileSync(path.join(outDir, `receipts_${tenantId}_${timestamp}.ndjson`), receiptsNdjson);

    // 3. Invoice Lines CSV
    const invoiceQuery = `
        SELECT tenant_id, "Platform Usage" as concept, sum(amount_settled) as qty, 1.0 as unit_price, sum(amount_settled) as total
        FROM ledger_transactions
        WHERE tenant_id = ? AND status = "SETTLED"
        GROUP BY 1
    `;
    const invoice = db.raw.query(invoiceQuery, [tenantId]) as any[];
    const invoiceCsv = "tenant,period,concept,qty,unit_price,total\n" +
        invoice.map(i => `${i.tenant_id},${new Date().toISOString().slice(0, 7)},${i.concept},${i.qty},${i.unit_price},${i.total}`).join('\n');
    fs.writeFileSync(path.join(outDir, `invoice_${tenantId}_${timestamp}.csv`), invoiceCsv);

    console.log(`✅ Exported bundle to ./${outDir}/ for period audit.`);
}

const target = process.argv[2];
exportBilling(target).catch(console.error);
