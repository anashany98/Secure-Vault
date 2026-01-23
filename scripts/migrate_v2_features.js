import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'secure_vault',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Starting Migration V2...");

        // 1. Audit Logs Table
        console.log("Creating audit_logs table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(50) NOT NULL, -- 'LOGIN', 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'
                entity_type VARCHAR(50), -- 'PASSWORD', 'NOTE', 'USER'
                entity_id UUID,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Password History Table
        console.log("Creating password_history table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_history (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
                encrypted_password TEXT NOT NULL,
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Update Users Table (Security)
        console.log("Updating users table...");
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP WITH TIME ZONE;
        `);

        // 4. Update Vault Items Table (Features)
        console.log("Updating vault_items table...");
        await client.query(`
            ALTER TABLE vault_items 
            ADD COLUMN IF NOT EXISTS tags TEXT[],
            ADD COLUMN IF NOT EXISTS custom_fields JSONB;
        `);

        await client.query('COMMIT');
        console.log("Migration V2 (Features) Completed Successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration Failed:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
