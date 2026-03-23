const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { writeBackupFile } = require('../services/disasterRecovery');

async function main() {
    const targetPath = process.argv[2];
    const result = await writeBackupFile(targetPath);

    console.log(`Backup written to ${result.backupPath}`);
    console.log(JSON.stringify(result.rowCounts, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
