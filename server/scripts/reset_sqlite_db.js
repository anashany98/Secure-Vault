const fs = require('fs');
const path = require('path');
const initSQLite = require('../init_sqlite');
const { resolveDbPath } = require('../sqlite_db');

function deleteIfExists(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function resetSqlite() {
    const dbPath = resolveDbPath();
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    deleteIfExists(walPath);
    deleteIfExists(shmPath);
    deleteIfExists(dbPath);

    await initSQLite();
    console.log(`SQLite reset complete at ${dbPath}`);
}

resetSqlite().catch((err) => {
    console.error('Failed to reset SQLite database:', err);
    process.exit(1);
});
