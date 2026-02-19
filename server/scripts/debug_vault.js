const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function debugVault() {
    try {
        const client = await pool.connect();

        // 1. Get Admin User
        const userRes = await client.query("SELECT id FROM users WHERE email = 'admin@securevault.com'");
        if (userRes.rows.length === 0) throw new Error("Admin not found");
        const userId = userRes.rows[0].id;
        console.log("Admin ID:", userId);

        // 2. Run Vault Query (Owned)
        console.log("Fetching Owned Items...");
        const ownedItems = await client.query(
            'SELECT * FROM vault_items WHERE user_id = $1 AND is_deleted = false',
            [userId]
        );
        console.log(`Owned items count: ${ownedItems.rows.length}`);
        if (ownedItems.rows.length > 0) {
            console.log("Sample Item:", JSON.stringify(ownedItems.rows[0], null, 2));
        }

        // 3. Run Shared Query
        console.log("Fetching Shared Items...");
        const sharedItems = await client.query(
            `SELECT v.*, s.permission, s.expires_at 
         FROM vault_items v
         JOIN shares s ON v.id = s.password_id
         WHERE s.shared_with = $1`,
            [userId]
        );
        console.log(`Shared items count: ${sharedItems.rows.length}`);

        client.release();
    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        await pool.end();
    }
}

debugVault();
