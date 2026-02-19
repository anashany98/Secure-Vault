const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
    try {
        const client = await pool.connect();
        console.log("Connected to DB.");

        console.log("\n--- Tables ---");
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        tables.rows.forEach(r => console.log(r.table_name));

        console.log("\n--- Columns in vault_items ---");
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'vault_items'
        `);
        columns.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

        client.release();
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

checkSchema();
