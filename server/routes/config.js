const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get config
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM app_config');
        // Convert array to object { company_name: "Value" }
        const config = result.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(config);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update config
router.post('/', auth, async (req, res) => {
    try {
        const { company_name } = req.body;

        if (company_name) {
            await pool.query(
                'INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                ['company_name', company_name]
            );
        }

        res.json({ success: true, message: 'Config updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
