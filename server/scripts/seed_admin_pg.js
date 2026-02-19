const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts dir

console.log("Using DB URL:", process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedAdmin() {
    try {
        const client = await pool.connect();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        const email = 'admin@securevault.com';

        // Check if exists
        const check = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (check.rows.length > 0) {
            console.log('Admin user exists. Updating password...');
            await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
        } else {
            console.log('Creating admin user...');
            await client.query(
                'INSERT INTO users (id, email, name, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
                [require('crypto').randomUUID(), email, 'Administrator', hashedPassword, 'admin']
            );
        }

        console.log('Admin seeded successfully:');
        console.log('Email: admin@securevault.com');
        console.log('Password: admin123');

        client.release();
    } catch (err) {
        console.error("Error seeding admin:", err);
    } finally {
        await pool.end();
    }
}

seedAdmin();
