const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function resolveDbPath() {
    const configuredPath = process.env.SQLITE_DB_PATH;
    if (!configuredPath) {
        return path.resolve(__dirname, 'secure_vault.db');
    }

    return path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(__dirname, configuredPath);
}

let db;
let activeDbPath;

function normalizeSqlAndParams(text, params = []) {
    const orderedParams = [];

    const normalizedSql = text.replace(/\$(\d+)/g, (_, indexText) => {
        const index = Number(indexText) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= params.length) {
            throw new Error(`Missing parameter value for $${indexText}`);
        }
        orderedParams.push(params[index]);
        return '?';
    });

    // If query has no postgres-style placeholders, keep original positional params.
    const finalParams = orderedParams.length > 0 ? orderedParams : params;
    return { normalizedSql, finalParams };
}

// Safe initialization function
function getDb() {
    if (!db) {
        activeDbPath = resolveDbPath();
        fs.mkdirSync(path.dirname(activeDbPath), { recursive: true });

        // Create specific init function for extensions if needed
        db = new Database(activeDbPath, { verbose: null }); // Set verbose to console.log for debugging
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
        console.log(`SQLite Database connected at ${activeDbPath}`);
    }

    async query(text, params = []) {
        try {
            const { normalizedSql, finalParams } = normalizeSqlAndParams(text, params);

            // Check if it's a SELECT or RETURNING query (implies returning rows)
            const isSelect = /^\s*(SELECT|WITH)/i.test(normalizedSql) || /RETURNING/i.test(normalizedSql);

            // Prepare the statement
            const stmt = this.db.prepare(normalizedSql);

            // Convert params (stringify objects/arrays for SQLite text interaction)
            const safeParamsFinal = finalParams.map(p => {
                if (p === undefined) return null;
                if (typeof p === 'boolean') return p ? 1 : 0;
                if (p instanceof Date) return p.toISOString();
                if (typeof p === 'object' && p !== null && !Buffer.isBuffer(p)) {
                    // Check if it is valid Date? better-sqlite3 handles Date strings?
                    // better-sqlite3 handles Buffer.
                    // It does NOT handle plain objects/arrays.
                    return JSON.stringify(p);
                }
                return p;
            });

            let result;
            if (isSelect) {
                // If it's a RETURNING clause in an INSERT/UPDATE, better-sqlite3 only supports it in .all() or .get()
                // dependent on if we expect one or multiple. .all() is safer.
                result = stmt.all(safeParamsFinal);
                return {
                    rows: result,
                    rowCount: result.length
                };
            } else {
                const info = stmt.run(safeParamsFinal);
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
        const client = {
            query: (text, params) => this.query(text, params),
            release: () => { }
        };

        if (callback) {
            callback(null, client, () => { });
        }
        return Promise.resolve(client);
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
    getDb,
    resolveDbPath
};
