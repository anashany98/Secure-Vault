const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the SQLite database file
const dbPath = path.resolve(__dirname, 'secure_vault.db');

let db;

// Safe initialization function
function getDb() {
    if (!db) {
        // Create specific init function for extensions if needed
        db = new Database(dbPath, { verbose: null }); // Set verbose to console.log for debugging
        db.pragma('journal_mode = WAL');

        // Mock UUID generation if not present
        // Since we removed uuid-ossp, we need to handle UUID generation in the wrapper or SQL
        // We will register a custom function 'uuid_generate_v4' to mimic Postgres extension
        db.function('uuid_generate_v4', () => {
            return require('crypto').randomUUID();
        });
    }
    return db;
}

// Result Normalization
// Postgres returns { rows: [], rowCount: n }
// better-sqlite3 returns [] for all() and { changes: n, lastInsertRowid: n } for run()

class SQLitePool {
    constructor(config) {
        this.db = getDb();
        console.log(`SQLite Database connected at ${dbPath}`);
    }

    async query(text, params = []) {
        try {
            // Convert Postgres parameters ($1, $2) to SQLite parameters (?, ?)
            let sql = text;
            let paramCount = 0;

            // Basic regex to replace $1, $2... with ?
            // Need to be careful not to replace inside strings, but for now a simple regex works for most queries
            sql = sql.replace(/\$\d+/g, () => {
                return '?';
            });

            // Check if it's a SELECT or RETURNING query (implies returning rows)
            const isSelect = /^\s*(SELECT|WITH)/i.test(sql) || /RETURNING/i.test(sql);

            // Prepare the statement
            const stmt = this.db.prepare(sql);

            let result;
            if (isSelect) {
                // If it's a RETURNING clause in an INSERT/UPDATE, better-sqlite3 only supports it in .all() or .get()
                // dependent on if we expect one or multiple. .all() is safer.
                result = stmt.all(params);
                return {
                    rows: result,
                    rowCount: result.length
                };
            } else {
                const info = stmt.run(params);
                return {
                    rows: [],
                    rowCount: info.changes
                };
            }
        } catch (err) {
            console.error('SQL Error:', err.message);
            console.error('Query:', text);
            throw err;
        }
    }

    // Mock connect for index.js check
    connect(callback) {
        if (callback) {
            callback(null, { release: () => { } }, () => { });
        }
        return Promise.resolve({ release: () => { } });
    }

    // Cleanup
    end() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = {
    Pool: SQLitePool,
    getDb
};
