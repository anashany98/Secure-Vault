const { getDb } = require('./sqlite_db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function initSQLite() {
    console.log('Initializing SQLite Database...');
    const db = getDb();

    // Read schema
    const schemaPath = path.join(__dirname, 'database_schema_sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    db.exec(schema);
    console.log('Schema applied successfully.');

    // Check if admin user exists
    const adminCheck = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
    if (!adminCheck) {
        console.log('Creating default admin user...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        const id = require('crypto').randomUUID();

        db.prepare(`
            INSERT INTO users (id, email, name, password_hash, role) 
            VALUES (?, ?, ?, ?, ?)
        `).run(id, 'admin@securevault.com', 'Administrator', hashedPassword, 'admin');
        console.log('Admin user created: admin@securevault.com / admin123');
    }

    console.log('SQLite Initialization Complete.');
}

if (require.main === module) {
    initSQLite();
}

module.exports = initSQLite;
