const { getDb } = require('./sqlite_db');
const bcrypt = require('bcrypt');

async function resetPassword() {
    const db = getDb();
    const email = process.env.RESET_PASSWORD_EMAIL;
    const newPassword = process.env.RESET_PASSWORD_VALUE;

    if (!email || !newPassword) {
        throw new Error('Set RESET_PASSWORD_EMAIL and RESET_PASSWORD_VALUE before running this script');
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const result = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashedPassword, email);

        if (result.changes > 0) {
            console.log(`Password for ${email} has been reset from the provided environment variable.`);
        } else {
            console.log(`User ${email} not found.`);
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    }
}

resetPassword();
