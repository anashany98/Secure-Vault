const jwt = require('jsonwebtoken');
const pool = require('../db');
const { jwtSecret, sessionCookieName } = require('../config');
const { parseCookies } = require('../utils/authCookies');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = parseCookies(req.headers.cookie)[sessionCookieName];
    const token = bearerToken || cookieToken;

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const verified = jwt.verify(token, jwtSecret);
        req.user = verified;

        // Session Revocation Check
        if (verified.sessionId) {
            const sessionCheck = await pool.query(
                'SELECT is_revoked, expires_at FROM sessions WHERE id = $1',
                [verified.sessionId]
            );

            if (sessionCheck.rows.length === 0 ||
                sessionCheck.rows[0].is_revoked ||
                (sessionCheck.rows[0].expires_at && new Date(sessionCheck.rows[0].expires_at) < new Date())) {
                return res.status(401).json({ message: 'Session Expired or Revoked' });
            }

            await pool.query(
                'UPDATE sessions SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
                [verified.sessionId]
            );
        }

        next();
    } catch {
        res.status(401).json({ message: 'Invalid Token' });
    }
};

module.exports = verifyToken;
