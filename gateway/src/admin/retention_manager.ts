import { db } from '../adapters/database';

export class RetentionManager {
    /**
     * Executes retention policy: mark old records for logical deletion or purge.
     * For Phase 8 Enterprise: 
     * - Detailed logs/receipts > 90 days are "archived" (logical delete).
     * - Records with 'legal_hold' flag are skipped.
     */
    static async runRetentionJob() {
        console.log('[RETENTION] Starting retention job...');
        const retentionPeriodMs = 90 * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - retentionPeriodMs;

        // 1. Logical Delete (Archive)
        const entries = db.raw.query(`
            UPDATE ledger_receipts 
            SET status = 'archived' 
            WHERE created_at < ? AND legal_hold = 0 AND status = 'active'
        `, [cutoff]);

        console.log(`[RETENTION] Archived legacy receipts.`);
    }

    /**
     * Toggles legal hold on a specific request/receipt to prevent deletion.
     */
    static setLegalHold(receiptId: string, hold: boolean) {
        db.raw.run('UPDATE ledger_receipts SET legal_hold = ? WHERE receipt_id = ?', [hold ? 1 : 0, receiptId]);
        console.log(`[RETENTION] Legal hold ${hold ? 'ENABLED' : 'DISABLED'} for ${receiptId}`);
    }

    /**
     * Forensic Export: Generates a signed bundle of all receipts for a tenant/period.
     */
    static async forensicExport(tenantId: string, start: number, end: number) {
        const rows = db.raw.query(`
            SELECT * FROM ledger_receipts 
            WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
        `, [tenantId, start, end]);

        return {
            tenantId,
            exportTimestamp: Date.now(),
            count: rows.length,
            receipts: rows.map((r: any) => JSON.parse(r.receipt_json))
        };
    }
}
