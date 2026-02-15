import { db } from '../adapters/database';
import { logger } from './logger';

export class RetentionManager {
    static async runReaper() {
        console.log('[RETENTION] Starting Reaper Job...');
        const now = Date.now();
        const policies = db.raw.query('SELECT * FROM retention_policies') as any[];

        for (const policy of policies) {
            const { tenant_id, resource_type, retention_days } = policy;
            const threshold = now - (retention_days * 24 * 60 * 60 * 1000);
            const hold = db.raw.prepare('SELECT 1 FROM legal_holds WHERE (tenant_id = ? OR tenant_id = "*") AND resource_type = ? AND active = 1')
                .get([tenant_id, resource_type]);

            if (hold) {
                console.log(`[RETENTION] Skip purge for ${tenant_id}:${resource_type} due to Legal Hold.`);
                continue;
            }

            let deletedCount = 0;
            if (resource_type === 'audit') {
                const res = db.raw.run('DELETE FROM audit_events WHERE (tenant_id = ? OR ? = "*") AND created_at < ?', [tenant_id, tenant_id, threshold]);
                deletedCount = (res as any).changes || 0;
            } else if (resource_type === 'receipt') {
                const res = db.raw.run('DELETE FROM ledger_receipts WHERE (tenant_id = ? OR ? = "*") AND created_at < ?', [tenant_id, tenant_id, threshold]);
                deletedCount = (res as any).changes || 0;
            }

            if (deletedCount > 0) {
                console.log(`[RETENTION] Purged ${deletedCount} records for ${tenant_id}:${resource_type}.`);
                logger.info('retention_purged', { tenant_id, resource_type, count: deletedCount });
            }
        }
    }

    static async exportForensic(tenantId: string): Promise<string> {
        const audits = db.raw.query('SELECT * FROM audit_events WHERE tenant_id = ?', [tenantId]);
        const receipts = db.raw.query('SELECT * FROM ledger_receipts WHERE tenant_id = ?', [tenantId]);
        return [
            ...audits.map((a: any) => JSON.stringify({ type: 'audit', ...a })),
            ...receipts.map((r: any) => JSON.stringify({ type: 'receipt', ...r }))
        ].join('\n');
    }
}
