const { getDb } = require('./server/sqlite_db');
const path = require('path');

// Mock process.env for the db module if needed, but sqlite_db uses hardcoded path mostly
const db = getDb();

try {
    const users = db.prepare('SELECT id, email, role, password_hash FROM users').all();
    console.log('--- Users in DB ---');
    users.forEach(u => {
        console.log(`Email: ${u.email}, Role: ${u.role}, HashLength: ${u.password_hash ? u.password_hash.length : 0}`);
    });

    if (users.length === 0) {
        console.log('NO USERS FOUND.');
    }
} catch (err) {
    console.error('Error querying database:', err);
}
