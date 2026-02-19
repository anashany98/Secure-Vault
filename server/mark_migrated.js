const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

(async () => {
    try {
        console.log('Creating _migrations table if not exists...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Marking 001_base.sql as applied...');
        await pool.query("INSERT INTO _migrations (name) VALUES ('001_base.sql') ON CONFLICT (name) DO NOTHING");

        console.log('Success.');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
})();
