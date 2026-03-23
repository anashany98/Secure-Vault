const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const initSQLite = require('../init_sqlite');
const { readBackupFile, restoreBackupPayload } = require('../services/disasterRecovery');

async function main() {
    const backupArg = process.argv[2];
    if (!backupArg) {
        throw new Error('Usage: node scripts/restore_backup.js <backup-file>');
    }

    if (process.env.DB_CLIENT === 'sqlite') {
        await initSQLite();
    }

    const backupPath = path.resolve(backupArg);
    const { backupPayload } = readBackupFile(backupPath);
    const result = await restoreBackupPayload(backupPayload);

    console.log(`Backup restored from ${backupPath}`);
    console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
