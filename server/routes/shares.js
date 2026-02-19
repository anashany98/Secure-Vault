const router = require('express').Router();
const pool = require('../db');
const crypto = require('crypto');

// CREATE PUBLIC SHARE
router.post('/', async (req, res) => {
    try {
        const { encryptedData, type, settings } = req.body;
        const { expiration, views } = settings;

        if (!encryptedData) {
            return res.status(400).json({ message: "Missing encrypted data" });
        }

        const id = crypto.randomUUID();
        // Calculate expiration date
        const expirationMs = expiration || 3600 * 1000;
        const expiresAt = new Date(Date.now() + expirationMs);

        // Ensure data is string
        const dataString = typeof encryptedData === 'string' ? encryptedData : JSON.stringify(encryptedData);

        await pool.query(
            `INSERT INTO public_shares (id, data, type, expires_at, views_left, max_views) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, dataString, type || 'password', expiresAt, views || 1, views || 1]
        );

        res.json({ id, expiresAt });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET PUBLIC SHARE METADATA (Safe check)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT id, type, created_at, expires_at, views_left, max_views FROM public_shares WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Enlace no válido o inexistente" });
        }

        const share = result.rows[0];

        // Check expiration
        if (new Date() > new Date(share.expires_at)) {
            return res.status(410).json({ error: "Este enlace ha caducado" });
        }

        // Check views
        if (share.views_left <= 0) {
            return res.status(410).json({ error: "Este enlace ya ha sido visualizado y destruido" });
        }

        res.json(share);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// REVEAL SECRET (Burn view)
router.post('/:id/reveal', async (req, res) => {
    try {
        const { id } = req.params;

        // Atomic check and update
        const update = await pool.query(
            `UPDATE public_shares 
             SET views_left = views_left - 1 
             WHERE id = $1 AND views_left > 0 AND expires_at > NOW()
             RETURNING data, type, views_left`,
            [id]
        );

        if (update.rows.length === 0) {
            // Could be not found, expired, or views exhausted
            return res.status(410).json({ error: "Enlace no disponible (caducado o ya visto)" });
        }

        const share = update.rows[0];

        res.json({
            encryptedData: JSON.parse(share.data),
            type: share.type
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
