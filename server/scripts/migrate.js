const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create migrations table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        for (const file of files) {
            const { rows } = await client.query('SELECT * FROM _migrations WHERE name = $1', [file]);
            if (rows.length === 0) {
                console.log(`Applying migration: ${file}`);

                if (file.endsWith('.js')) {
                    const migration = require(path.join(migrationsDir, file));
                    // If migration exports a function, run it
                    if (typeof migration === 'function') {
                        await migration(client);
                    } else if (migration.migrate) {
                        await migration.migrate(client);
                    }
                } else if (file.endsWith('.sql')) {
                    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                    await client.query(sql);
                }

                await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
            }
        }

        await client.query('COMMIT');
        console.log("All migrations applied successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration runner failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
