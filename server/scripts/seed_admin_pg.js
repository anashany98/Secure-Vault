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
        const email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
        const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

        if (!email || !password) {
            throw new Error('BOOTSTRAP_ADMIN_EMAIL/ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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
        console.log(`Email: ${email}`);
        console.log('Password: [provided via environment]');

        client.release();
    } catch (err) {
        console.error("Error seeding admin:", err);
    } finally {
        await pool.end();
    }
}

seedAdmin();
