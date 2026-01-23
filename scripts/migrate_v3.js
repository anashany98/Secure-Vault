import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Starting Migration V3...");

        // 1. Convert audit_logs.details from TEXT to JSONB
        console.log("Converting audit_logs.details to JSONB...");
        // Use a safe conversion: if details is empty or invalid JSON, default to '{}'
        await client.query(`
            ALTER TABLE audit_logs 
            ALTER COLUMN details TYPE JSONB USING 
            CASE 
                WHEN details IS NULL OR details = '' THEN '{}'::JSONB
                ELSE details::JSONB 
            END;
        `);

        // 2. Create sessions table
        console.log("Creating sessions table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_revoked BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating index on sessions.user_id...");
        await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);');

        await client.query('COMMIT');
        console.log("Migration V3 (Advanced Features) Completed Successfully!");
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
