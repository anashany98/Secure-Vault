const jwt = require('jsonwebtoken');
const pool = require('../db');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;

        // Session Revocation Check
        if (verified.sessionId) {
            const sessionCheck = await pool.query(
                'SELECT is_revoked, expires_at FROM sessions WHERE id = $1',
                [verified.sessionId]
            );

            if (sessionCheck.rows.length === 0 ||
                sessionCheck.rows[0].is_revoked ||
                new Date(sessionCheck.rows[0].expires_at) < new Date()) {
                return res.status(401).json({ message: 'Session Expired or Revoked' });
            }
        }

        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid Token' });
    }
};

module.exports = verifyToken;
