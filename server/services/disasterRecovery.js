const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { pool } = require('../db');
const { getDb } = require('../sqlite_db');
const { getClientCryptoFingerprints } = require('./clientCryptoService');
const { backupRequiresLegacyCrypto } = require('./vaultAccessService');

const BACKUP_ENVELOPE_FORMAT = 'securevault-encrypted-backup';
const BACKUP_ENVELOPE_VERSION = 1;
const BACKUP_FILE_EXTENSION = '.json.enc';
const BACKUP_KDF = 'scrypt';

const TABLE_ORDER = [
    '_migrations',
    'app_config',
    'users',
    'employees',
    'groups',
    'vault_items',
    'notes',
    'devices',
    'public_shares',
    'sessions',
    'audit_logs',
    'group_members',
    'vault_item_attachments',
    'password_history',
    'device_history',
    'shares',
];

function assertSafeIdentifier(value, kind = 'identifier') {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new Error(`Unsafe ${kind}: ${value}`);
    }

    return value;
}

function quoteIdentifier(value) {
    return `"${assertSafeIdentifier(value).replace(/"/g, '""')}"`;
}

function resolveBackupDirectory() {
    const backupDir = process.env.BACKUP_PATH || path.join(__dirname, '../backups');
    fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
}

function resolveBackupFilePath(targetPath, backupDir = resolveBackupDirectory()) {
    const resolvedTarget = targetPath
        ? path.resolve(targetPath)
        : path.join(
            backupDir,
            `backup-${new Date().toISOString().replace(/[:.]/g, '-')}${BACKUP_FILE_EXTENSION}`
        );

    return resolvedTarget.endsWith('.enc') ? resolvedTarget : `${resolvedTarget}.enc`;
}

function getBackupEncryptionSecret() {
    const secret = process.env.BACKUP_ENCRYPTION_KEY?.trim();
    if (!secret) {
        throw new Error('Missing required BACKUP_ENCRYPTION_KEY for encrypted backups.');
    }

    return secret;
}

function deriveBackupKey(saltBuffer) {
    return crypto.scryptSync(getBackupEncryptionSecret(), saltBuffer, 32);
}

function encodeBuffer(value) {
    return value.toString('base64');
}

function decodeBuffer(name, value, expectedLength) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid encrypted backup metadata: missing ${name}.`);
    }

    const buffer = Buffer.from(value, 'base64');
    if (expectedLength && buffer.length !== expectedLength) {
        throw new Error(`Invalid encrypted backup metadata: ${name} has an unexpected length.`);
    }

    return buffer;
}

function isEncryptedBackupEnvelope(payload) {
    return Boolean(
        payload &&
        typeof payload === 'object' &&
        payload.format === BACKUP_ENVELOPE_FORMAT &&
        payload.algorithm === 'aes-256-gcm' &&
        payload.kdf === BACKUP_KDF &&
        typeof payload.ciphertext === 'string'
    );
}

function orderTables(tables = []) {
    const indexMap = new Map(TABLE_ORDER.map((table, index) => [table, index]));
    return [...new Set(tables)]
        .map((table) => assertSafeIdentifier(table, 'table name'))
        .sort((left, right) => {
            const leftIndex = indexMap.has(left) ? indexMap.get(left) : Number.MAX_SAFE_INTEGER;
            const rightIndex = indexMap.has(right) ? indexMap.get(right) : Number.MAX_SAFE_INTEGER;

            if (leftIndex !== rightIndex) {
                return leftIndex - rightIndex;
            }

            return left.localeCompare(right);
        });
}

async function listApplicationTables() {
    if (process.env.DB_CLIENT === 'sqlite') {
        const result = await pool.query(
            `SELECT name
             FROM sqlite_master
             WHERE type = 'table'
               AND name NOT LIKE 'sqlite_%'
             ORDER BY name`
        );

        return orderTables(result.rows.map((row) => row.name));
    }

    const result = await pool.query(
        `SELECT tablename AS name
         FROM pg_tables
         WHERE schemaname = 'public'
         ORDER BY tablename`
    );

    return orderTables(result.rows.map((row) => row.name));
}

function normalizeBackupPayload(payload) {
    if (payload && typeof payload === 'object' && payload.tables && typeof payload.tables === 'object') {
        return {
            createdAt: payload.createdAt || null,
            cryptoKeyFingerprints: payload.cryptoKeyFingerprints || null,
            dbClient: payload.dbClient || null,
            tables: payload.tables,
            version: payload.version || 2,
        };
    }

    const legacyTables = Object.entries(payload || {}).reduce((accumulator, [key, value]) => {
        if (Array.isArray(value)) {
            accumulator[key] = value;
        }
        return accumulator;
    }, {});

    return {
        createdAt: null,
        cryptoKeyFingerprints: payload?.cryptoKeyFingerprints || null,
        dbClient: payload?.dbClient || null,
        tables: legacyTables,
        version: 1,
    };
}

function assertBackupCompatible(payload) {
    const expected = payload.cryptoKeyFingerprints;
    if (!expected) {
        return;
    }

    const current = getClientCryptoFingerprints();
    if (
        expected.vaultKeyFingerprint !== current.vaultKeyFingerprint ||
        expected.notesKeyFingerprint !== current.notesKeyFingerprint
    ) {
        throw new Error(
            'Backup was created with different client crypto keys. ' +
            'Restore the original CLIENT_VAULT_KEY and CLIENT_NOTES_KEY values first.'
        );
    }
}

async function createBackupPayload() {
    const tables = {};
    const tableNames = await listApplicationTables();
    const requiresLegacyCrypto = await backupRequiresLegacyCrypto();

    for (const tableName of tableNames) {
        const result = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
        tables[tableName] = result.rows;
    }

    return {
        createdAt: new Date().toISOString(),
        cryptoKeyFingerprints: requiresLegacyCrypto ? getClientCryptoFingerprints() : null,
        dbClient: process.env.DB_CLIENT === 'sqlite' ? 'sqlite' : 'postgres',
        tables,
        version: 2,
    };
}

function encryptBackupPayload(backupPayload) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = deriveBackupKey(salt);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const serializedPayload = Buffer.from(JSON.stringify(backupPayload), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(serializedPayload), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        algorithm: 'aes-256-gcm',
        authTag: encodeBuffer(authTag),
        ciphertext: encodeBuffer(ciphertext),
        createdAt: backupPayload.createdAt,
        format: BACKUP_ENVELOPE_FORMAT,
        kdf: BACKUP_KDF,
        salt: encodeBuffer(salt),
        version: BACKUP_ENVELOPE_VERSION,
        iv: encodeBuffer(iv),
    };
}

function decryptBackupEnvelope(encryptedEnvelope) {
    if (!isEncryptedBackupEnvelope(encryptedEnvelope)) {
        throw new Error('Unsupported encrypted backup format.');
    }

    const salt = decodeBuffer('salt', encryptedEnvelope.salt);
    const iv = decodeBuffer('iv', encryptedEnvelope.iv, 12);
    const authTag = decodeBuffer('authTag', encryptedEnvelope.authTag, 16);
    const ciphertext = decodeBuffer('ciphertext', encryptedEnvelope.ciphertext);
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveBackupKey(salt), iv);

    decipher.setAuthTag(authTag);

    try {
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
        return normalizeBackupPayload(JSON.parse(plaintext));
    } catch (_error) {
        throw new Error('Unable to decrypt backup file. Verify BACKUP_ENCRYPTION_KEY and the backup integrity.');
    }
}

function readBackupFile(backupFilePath) {
    const resolvedPath = path.resolve(backupFilePath);
    const fileContents = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = JSON.parse(fileContents);
    const backupPayload = isEncryptedBackupEnvelope(parsed)
        ? decryptBackupEnvelope(parsed)
        : normalizeBackupPayload(parsed);

    return {
        backupPath: resolvedPath,
        backupPayload,
    };
}

async function writeBackupFile(targetPath) {
    const backupPayload = await createBackupPayload();
    const backupDir = resolveBackupDirectory();
    const backupPath = resolveBackupFilePath(targetPath, backupDir);
    const encryptedEnvelope = encryptBackupPayload(backupPayload);

    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, JSON.stringify(encryptedEnvelope, null, 2), 'utf8');

    return {
        backupPath,
        backupPayload,
        rowCounts: Object.fromEntries(
            Object.entries(backupPayload.tables).map(([table, rows]) => [table, rows.length])
        ),
    };
}

function normalizeInsertValue(value) {
    if (value === undefined) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        return JSON.stringify(value);
    }

    return value;
}

function insertRowsIntoSQLite(db, tableName, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return 0;
    }

    const columns = Object.keys(rows[0]).map((column) => assertSafeIdentifier(column, 'column name'));
    const columnList = columns.map(quoteIdentifier).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const statement = db.prepare(
        `INSERT INTO ${quoteIdentifier(tableName)} (${columnList}) VALUES (${placeholders})`
    );

    rows.forEach((row) => {
        statement.run(columns.map((column) => normalizeInsertValue(row[column])));
    });

    return rows.length;
}

async function insertRowsIntoPostgres(tableName, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return 0;
    }

    const columns = Object.keys(rows[0]).map((column) => assertSafeIdentifier(column, 'column name'));
    const columnList = columns.map(quoteIdentifier).join(', ');

    for (const row of rows) {
        const values = columns.map((column) => normalizeInsertValue(row[column]));
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        await pool.query(
            `INSERT INTO ${quoteIdentifier(tableName)} (${columnList}) VALUES (${placeholders})`,
            values
        );
    }

    return rows.length;
}

async function restoreSqliteBackup(currentTables, tablesToRestore, payloadTables) {
    const db = getDb();
    const restoredCounts = {};
    const restoreTransaction = db.transaction(() => {
        for (const tableName of [...currentTables].reverse()) {
            db.prepare(`DELETE FROM ${quoteIdentifier(tableName)}`).run();
        }

        for (const tableName of tablesToRestore) {
            restoredCounts[tableName] = insertRowsIntoSQLite(db, tableName, payloadTables[tableName]);
        }
    });

    db.pragma('foreign_keys = OFF');
    try {
        restoreTransaction();
    } finally {
        db.pragma('foreign_keys = ON');
    }

    return restoredCounts;
}

async function restorePostgresBackup(currentTables, tablesToRestore, payloadTables) {
    const restoredCounts = {};
    await pool.query('BEGIN');

    try {
        if (currentTables.length > 0) {
            await pool.query(
                `TRUNCATE TABLE ${currentTables.map(quoteIdentifier).join(', ')} RESTART IDENTITY CASCADE`
            );
        }

        for (const tableName of tablesToRestore) {
            restoredCounts[tableName] = await insertRowsIntoPostgres(tableName, payloadTables[tableName]);
        }

        await pool.query('COMMIT');
        return restoredCounts;
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
}

async function restoreBackupPayload(payload) {
    const normalized = normalizeBackupPayload(payload);
    assertBackupCompatible(normalized);

    const currentTables = await listApplicationTables();
    const currentTableSet = new Set(currentTables);
    const backupTables = orderTables(Object.keys(normalized.tables || {}));
    const tablesToRestore = backupTables.filter((tableName) => currentTableSet.has(tableName));
    const skippedTables = backupTables.filter((tableName) => !currentTableSet.has(tableName));

    const restoredCounts = process.env.DB_CLIENT === 'sqlite'
        ? await restoreSqliteBackup(currentTables, tablesToRestore, normalized.tables)
        : await restorePostgresBackup(currentTables, tablesToRestore, normalized.tables);

    return {
        restoredCounts,
        skippedTables,
        tablesCleared: currentTables.length,
    };
}

module.exports = {
    createBackupPayload,
    listApplicationTables,
    normalizeBackupPayload,
    readBackupFile,
    resolveBackupDirectory,
    resolveBackupFilePath,
    restoreBackupPayload,
    writeBackupFile,
};
