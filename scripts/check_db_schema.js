import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getDb } = require('../server/sqlite_db.js');

const db = getDb();
try {
    const info = db.pragma('table_info(vault_items)');
    console.log("Schema for vault_items:", JSON.stringify(info, null, 2));
} catch (err) {
    console.error("Error:", err);
}
