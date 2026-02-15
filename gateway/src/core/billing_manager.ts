import { db } from '../adapters/database';
import { logger } from './logger';

export class BillingManager {
    /**
     * Closes a billing period for a tenant and generates an invoice.
     * Seals the period to prevent further ledger entries.
     */
    static async closePeriod(tenantId: string, month: string) {
        console.log(`[BILLING] Closing period ${month} for tenant ${tenantId}...`);

        const periodId = `${tenantId}:${month}`;
        const now = Date.now();

        // 1. Ensure period exists or create it
        const period = db.raw.prepare('SELECT * FROM billing_periods WHERE period_id = ?').get([periodId]) as any;
        if (!period) {
            throw new Error(`BILLING_PERIOD_NOT_FOUND:${periodId}`);
        }

        if (period.status === 'CLOSED' || period.status === 'SEALED') {
            console.warn(`[BILLING] Period ${periodId} is already ${period.status}.`);
            return;
        }

        // 2. Aggregate settled totals from ledger
        const settlements = db.raw.query(`
            SELECT currency, SUM(amount) as total 
            FROM ledger_entries 
            WHERE tenant_id = ? 
              AND status = 'SETTLED' 
              AND created_at BETWEEN ? AND ?
            GROUP BY currency
        `, [tenantId, period.start_date, period.end_date]) as any[];

        if (settlements.length === 0) {
            console.log(`[BILLING] No settlements found for period ${periodId}.`);
        }

        // 3. Create Invoice
        const invoiceId = `inv_${Math.random().toString(36).substr(2, 9)}`;
        const totalAmount = settlements.reduce((acc, s) => acc + s.total, 0); // Simplified: assumes same currency for MVP

        db.raw.run(`
            INSERT INTO invoices (invoice_id, tenant_id, period_id, total_amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)
        `, [invoiceId, tenantId, periodId, totalAmount, settlements[0]?.currency || 'EUR', now]);

        // 4. Create Invoice Lines
        for (const s of settlements) {
            const lineId = `line_${Math.random().toString(36).substr(2, 9)}`;
            db.raw.run(`
                INSERT INTO invoice_lines (line_id, invoice_id, description, amount, created_at)
                VALUES (?, ?, ?, ?, ?)
            `, [lineId, invoiceId, `Settled usage for ${s.currency}`, s.total, now]);
        }

        // 5. Close Period
        db.raw.run("UPDATE billing_periods SET status = 'CLOSED' WHERE period_id = ?", [periodId]);

        console.log(`[BILLING] Period ${periodId} closed. Invoice ${invoiceId} generated.`);
        return invoiceId;
    }

    /**
     * Verifies that an invoice total matches the sum of its lines 
     * and corresponds to the ledger state for that period.
     */
    static async verifyConsistency(invoiceId: string): Promise<boolean> {
        const invoice = db.raw.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get([invoiceId]) as any;
        if (!invoice) return false;

        const linesSum = (db.raw.prepare('SELECT SUM(amount) as total FROM invoice_lines WHERE invoice_id = ?').get([invoiceId]) as any).total;

        // Check lines vs invoice total
        const internalMatch = Math.abs(invoice.total_amount - linesSum) < 0.0001;

        // Check vs Ledger
        const period = db.raw.prepare('SELECT * FROM billing_periods WHERE period_id = ?').get([invoice.period_id]) as any;
        const ledgerTotal = (db.raw.prepare(`
            SELECT SUM(amount) as total 
            FROM ledger_entries 
            WHERE tenant_id = ? AND status = 'SETTLED' AND created_at BETWEEN ? AND ?
        `).get([invoice.tenant_id, period.start_date, period.end_date]) as any).total;

        const ledgerMatch = Math.abs(invoice.total_amount - (ledgerTotal || 0)) < 0.0001;

        console.log(`[BILLING] Consistency check for ${invoiceId}: Internal=${internalMatch}, Ledger=${ledgerMatch}`);
        return internalMatch && ledgerMatch;
    }
}
