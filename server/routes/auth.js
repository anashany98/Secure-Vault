const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { loginLimiter } = require('../middleware/rateLimiter');
const auditLog = require('../utils/auditLogger');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

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

        // Check if this is the first user
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const role = parseInt(usersCount.rows[0].count) === 0 ? 'admin' : 'user';

        // Insert user
        const newUser = await pool.query(
            'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
            [email, name, hashedPassword, role]
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

        // Generate Session ID
        const sessionId = crypto.randomUUID();

        // Generate Token including sessionId
        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role, sessionId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Register Session in DB
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Fix for SQLite: Convert Date to ISO String
        const expiresAtStr = expiresAt.toISOString();

        await pool.query(
            `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [sessionId, user.rows[0].id, 'JWT_SESSION', ipAddress, userAgent, expiresAtStr]
        );

        auditLog(user.rows[0].id, 'LOGIN', 'USER', user.rows[0].id, 'Success', req);

        // Check if 2FA is enabled
        if (user.rows[0].two_factor_enabled) {
            return res.json({
                requires2FA: true,
                tempToken: jwt.sign(
                    { id: user.rows[0].id, isPending2FA: true },
                    process.env.JWT_SECRET,
                    { expiresIn: '5m' }
                )
            });
        }

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
        console.error("LOGIN ERROR:", err);
        res.status(500).send('Server Error');
    }
});

// LOGIN VERIFY (2FA Challenge)
router.post('/login/verify', async (req, res) => {
    try {
        const { tempToken, token: totpToken } = req.body;

        const payload = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (!payload.isPending2FA) return res.status(401).json({ message: "Challenge inválido" });

        const user = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);

        const isValid = speakeasy.totp.verify({
            secret: user.rows[0].two_factor_secret,
            encoding: 'base32',
            token: totpToken
        });

        if (!isValid) return res.status(401).json({ message: "Código 2FA incorrecto" });

        // Proceed with full login
        const sessionId = crypto.randomUUID();
        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role, sessionId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const expiresAtStr = expiresAt.toISOString();

        await pool.query(
            `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [sessionId, user.rows[0].id, 'JWT_SESSION', ipAddress, userAgent, expiresAtStr]
        );

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
        res.status(401).json({ message: "Sesión expirada" });
    }
});

const verifyToken = require('../middleware/auth');

// GET ACTIVE SESSIONS
router.get('/sessions', verifyToken, async (req, res) => {
    try {
        const sessions = await pool.query(
            `SELECT id, ip_address, user_agent, last_active, created_at, 
             (id = $1) as is_current
             FROM sessions 
             WHERE user_id = $2
               AND is_revoked = false
               AND (expires_at IS NULL OR julianday(expires_at) > julianday('now'))
             ORDER BY created_at DESC`,
            [req.user.sessionId, req.user.id]
        );
        res.json(sessions.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// REVOKE SESSION
router.delete('/sessions/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'UPDATE sessions SET is_revoked = true WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        res.json({ message: "Sesión cerrada correctamente" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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

// 2FA SETUP (Generate Secret & QR)
router.post('/2fa/setup', verifyToken, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ name: `SecureVault (${req.user.email})` });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        // Temporarily store secret (unverified)
        await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);

        res.json({ secret: secret.base32, qrCode });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 2FA ENABLE (Verify and Finalize)
router.post('/2fa/enable', verifyToken, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [req.user.id]);

        if (!user.rows[0].two_factor_secret) {
            return res.status(400).json({ message: "No se ha configurado 2FA" });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.rows[0].two_factor_secret,
            encoding: 'base32',
            token
        });

        if (!isValid) {
            return res.status(400).json({ message: "Código inválido" });
        }

        // Generate recovery codes
        const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));

        await pool.query(
            'UPDATE users SET two_factor_enabled = true, recovery_codes = $1 WHERE id = $2',
            [JSON.stringify(recoveryCodes), req.user.id]
        );

        res.json({ message: "2FA habilitado correctamente", recoveryCodes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 2FA DISABLE
router.post('/2fa/disable', verifyToken, async (req, res) => {
    try {
        const { password, token } = req.body;

        // Check password first
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

        // Verify TOTP
        const isValid = speakeasy.totp.verify({
            secret: user.rows[0].two_factor_secret,
            encoding: 'base32',
            token
        });

        if (!isValid) return res.status(400).json({ message: "Código inválido" });

        await pool.query(
            'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, recovery_codes = $1 WHERE id = $2',
            ['[]', req.user.id]
        );

        res.json({ message: "2FA deshabilitado" });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
