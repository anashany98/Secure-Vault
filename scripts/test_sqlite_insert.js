import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getDb, Pool } = require('../server/sqlite_db.js');

const pool = new Pool();

async function run() {
    try {
        const userId = 'f75dbeec-e50a-4c33-9cb1-e3ae385535e7'; // User 2 or similar (doesn't matter for FK if we don't check?)
        // Wait, FK constraint on users(id) exists.
        // I need a valid user ID. 
        // I'll fetch one first.
        const users = await pool.query('SELECT id FROM users LIMIT 1');
        if (users.rows.length === 0) {
            console.error("No users found to test with.");
            return;
        }
        const validUserId = users.rows[0].id;
        console.log("Using User ID:", validUserId);

        const params = [
            validUserId,
            "Shared Secret",
            "admin_secret",
            "U2FsdGVkX1+dummyEncrypted",
            "http://secret.com",
            undefined, // meta_person
            false,
            [], // tags (Array)
            "[]" // custom_fields (String)
        ];

        console.log("Params:", params);

        const query = `INSERT INTO vault_items (user_id, title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;

        const res = await pool.query(query, params);
        console.log("Insert Success:", res.rows[0]);
    } catch (err) {
        console.error("ERROR CODE:", err.code);
        console.error("ERROR MESSAGE:", err.message);
        console.error("FULL ERROR OBJECT:", err);
    }
}

run();
