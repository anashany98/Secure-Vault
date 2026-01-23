import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Starting Migration V4...");

        // 1. Add 2FA fields to users table
        console.log("Adding 2FA fields to users table...");
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
            ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS recovery_codes JSONB DEFAULT '[]'::JSONB;
        `);

        await client.query('COMMIT');
        console.log("Migration V4 (Two-Factor Authentication) Completed Successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration Failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
