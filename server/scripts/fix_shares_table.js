const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function fixShares() {
    try {
        const client = await pool.connect();

        console.log("Creating shares table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS shares (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                password_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
                shared_by UUID REFERENCES users(id) ON DELETE CASCADE,
                shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
                permission VARCHAR(50) DEFAULT 'read',
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating index...");
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with);
        `);

        console.log("Shares table fixed successfully.");
        client.release();
    } catch (err) {
        console.error("Error creating shares table:", err);
    } finally {
        await pool.end();
    }
}

fixShares();
