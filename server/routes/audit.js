const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');

// GET ALL AUDIT LOGS FOR USER
router.get('/', verifyToken, async (req, res) => {
    try {
        const logs = await pool.query(
            'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000',
            [req.user.id]
        );
        res.json(logs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
