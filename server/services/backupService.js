const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const { resolveBackupDirectory, resolveBackupFilePath, writeBackupFile } = require('./disasterRecovery');

const BACKUP_DIR = resolveBackupDirectory();

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const runBackup = async () => {
    console.log('--- Starting automated backup ---');

    try {
        const { backupPath, rowCounts } = await writeBackupFile(resolveBackupFilePath(
            path.join(
                BACKUP_DIR,
                `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`
            )
        ));
        console.log(`Backup successfully saved to: ${backupPath}`);
        console.log(`Backup tables: ${Object.keys(rowCounts).length}`);

        // Cleanup: keep only last 7 backups
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup-'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 7) {
            files.slice(7).forEach(f => {
                fs.unlinkSync(path.join(BACKUP_DIR, f.name));
                console.log(`Deleted old backup: ${f.name}`);
            });
        }

    } catch (err) {
        console.error('Backup error:', err.message);
    }
};

// Schedule: Daily at midnight (00:00)
const initBackupService = () => {
    cron.schedule('0 0 * * *', () => {
        runBackup();
    });
    console.log('Backup service initialized (Scheduled daily at 00:00)');

    // Run an initial backup if the folder is empty
    if (fs.readdirSync(BACKUP_DIR).length === 0) {
        console.log('First run: performing initial backup...');
        runBackup();
    }
};

module.exports = { initBackupService, runBackup };
