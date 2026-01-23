const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { loginLimiter } = require('../middleware/rateLimiter');
const auditLog = require('../utils/auditLogger');

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { email, name, password } = req.body;

        // Check if user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const newUser = await pool.query(
            'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
            [email, name, hashedPassword, 'user']
        );

        auditLog(newUser.rows[0].id, 'REGISTER', 'USER', newUser.rows[0].id, `Registered as ${newUser.rows[0].role}`, req);

        res.json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            // Log failed attempt info if possible (careful with non-existent users)
            auditLog(null, 'LOGIN_FAILED', 'USER', null, `Email: ${email}`, req);
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            // Update failed attempts
            await pool.query('UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1 WHERE id = $1', [user.rows[0].id]);
            auditLog(user.rows[0].id, 'LOGIN_FAILED', 'USER', user.rows[0].id, 'Bad Password', req);
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Reset failed attempts on success
        await pool.query('UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = $1', [user.rows[0].id]);

        // Generate Token
        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        auditLog(user.rows[0].id, 'LOGIN', 'USER', user.rows[0].id, 'Success', req);

        res.json({
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                name: user.rows[0].name,
                role: user.rows[0].role
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const verifyToken = require('../middleware/auth');

// GET ALL USERS (Admin only)
router.get('/users', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access Denied" });
        }
        const users = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(users.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE USER (Admin only)
router.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access Denied" });
        }
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json("User deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ADMIN RESET PASSWORD
router.put('/users/:id/reset-password', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access Denied" });
        }
        const { id } = req.params;
        const { newPassword } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
        res.json("Password reset successful");

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
