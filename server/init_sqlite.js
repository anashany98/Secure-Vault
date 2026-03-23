const { getDb } = require('./sqlite_db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { bootstrapAdmin } = require('./config');

function ensureTableColumns(db, tableName, columnDefinitions) {
    const columns = new Set(
        db.prepare(`PRAGMA table_info('${tableName}')`).all().map((column) => column.name)
    );

    columnDefinitions.forEach(({ name, definition }) => {
        if (!columns.has(name)) {
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
        }
    });
}

async function initSQLite() {
    console.log('Initializing SQLite Database...');
    const db = getDb();

    // Read schema
    const schemaPath = path.join(__dirname, 'database_schema_sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const statements = schema
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);
    const deferredIndexes = [];

    statements.forEach((statement) => {
        if (/^CREATE INDEX/i.test(statement)) {
            deferredIndexes.push(statement);
            return;
        }

        db.exec(`${statement};`);
    });
    ensureTableColumns(db, 'vault_items', [
        { name: 'crypto_scope', definition: "crypto_scope TEXT DEFAULT 'user'" },
        { name: 'folder_id', definition: 'folder_id TEXT' },
        { name: 'next_review_at', definition: 'next_review_at DATETIME' },
        { name: 'renewal_interval_days', definition: 'renewal_interval_days INTEGER' },
        { name: 'checked_out_by', definition: 'checked_out_by TEXT' },
        { name: 'checked_out_at', definition: 'checked_out_at DATETIME' },
        { name: 'checked_out_until', definition: 'checked_out_until DATETIME' },
        { name: 'checkout_note', definition: 'checkout_note TEXT' },
    ]);
    ensureTableColumns(db, 'users', [
        { name: 'vault_kdf_salt', definition: 'vault_kdf_salt TEXT' },
        { name: 'vault_kdf_iterations', definition: 'vault_kdf_iterations INTEGER' },
        { name: 'vault_wrapped_vault_key', definition: 'vault_wrapped_vault_key TEXT' },
        { name: 'vault_wrapped_notes_key', definition: 'vault_wrapped_notes_key TEXT' },
        { name: 'vault_key_verifier', definition: 'vault_key_verifier TEXT' },
        { name: 'notes_key_verifier', definition: 'notes_key_verifier TEXT' },
        { name: 'vault_crypto_migrated_at', definition: 'vault_crypto_migrated_at DATETIME' },
        { name: 'vault_access_scope', definition: 'vault_access_scope TEXT' },
    ]);
    ensureTableColumns(db, 'notes', [
        { name: 'crypto_scope', definition: "crypto_scope TEXT DEFAULT 'user'" },
    ]);
    ensureTableColumns(db, 'devices', [
        { name: 'next_review_at', definition: 'next_review_at DATETIME' },
    ]);
    deferredIndexes.forEach((statement) => {
        db.exec(`${statement};`);
    });
    db.exec("UPDATE vault_items SET crypto_scope = 'user' WHERE crypto_scope IS NULL;");
    db.exec("UPDATE notes SET crypto_scope = 'user' WHERE crypto_scope IS NULL;");
    console.log('Schema applied successfully.');

    if (bootstrapAdmin.email && bootstrapAdmin.password) {
        console.log(`Ensuring bootstrap admin user ${bootstrapAdmin.email} exists...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(bootstrapAdmin.password, salt);
        const id = require('crypto').randomUUID();

        db.prepare(`
            INSERT INTO users (id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO NOTHING
        `).run(id, bootstrapAdmin.email, bootstrapAdmin.name, hashedPassword, 'admin');
    } else {
        console.log('No bootstrap admin configured. Skipping admin creation.');
    }

    console.log('SQLite Initialization Complete.');
}

if (require.main === module) {
    initSQLite();
}

module.exports = initSQLite;
