import { db } from '../../adapters/database';
import fs from 'fs';
import path from 'path';

export async function backupDatabase(targetPath: string) {
    const safePath = targetPath.replace(/\\/g, '/');
    if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
    }
    console.log(`[OPS] Starting atomic backup to: ${safePath}`);
    // VACUUM INTO is a command, use run()
    db.raw.run(`VACUUM INTO '${safePath}'`);
    console.log('[OPS] Backup completed successfully.');
}

if (require.main === module) {
    const backupPath = path.resolve(__dirname, `../../../backups/mcp_backup_${Date.now()}.sqlite`);
    if (!fs.existsSync(path.dirname(backupPath))) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }
    backupDatabase(backupPath).catch(console.error);
}
