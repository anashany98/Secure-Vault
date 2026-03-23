const express = require('express');
const router = express.Router();

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM app_config');
        const config = result.rows.reduce((accumulator, row) => {
            accumulator[row.key] = row.value;
            return accumulator;
        }, {});
        return res.json(config);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', async (req, res) => {
    try {
        const { company_name } = req.body;
        if (company_name) {
            await pool.query(
                `INSERT INTO app_config (key, value)
                 VALUES ($1, $2)
                 ON CONFLICT (key)
                 DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
                ['company_name', company_name]
            );
        }

        return res.json({ success: true, message: 'Config updated' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
