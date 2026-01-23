const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const BACKUP_DIR = process.env.BACKUP_PATH || path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const runBackup = async () => {
    console.log('--- Starting automated backup ---');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);

    try {
        const tables = ['users', 'vault_items', 'audit_logs'];
        const backupData = {};

        for (const table of tables) {
            const result = await pool.query(`SELECT * FROM ${table}`);
            backupData[table] = result.rows;
        }

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`Backup successfully saved to: ${backupFile}`);

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
