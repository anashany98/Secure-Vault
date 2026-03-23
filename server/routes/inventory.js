const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { normalizeInventoryItem, normalizeVaultItem } = require('../utils/serializers');

router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const devices = await pool.query(
            `SELECT *
             FROM devices
             WHERE status != 'baja'
             ORDER BY updated_at DESC, created_at DESC`
        );
        return res.json(devices.rows.map(normalizeInventoryItem));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            assignedTo,
            brand,
            location,
            model,
            nextReviewAt,
            notes,
            serial,
            status,
            type,
        } = req.body;

        const newItem = await pool.query(
            `INSERT INTO devices (
                type, brand, model, serial_number, status, assigned_to, location, next_review_at, notes
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                type,
                brand,
                model,
                serial || null,
                status,
                assignedTo || null,
                location || null,
                nextReviewAt || null,
                notes || null,
            ]
        );

        return res.json(normalizeInventoryItem(newItem.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            assignedTo,
            brand,
            location,
            model,
            nextReviewAt,
            notes,
            serial,
            status,
            type,
        } = req.body;

        const updatedItem = await pool.query(
            `UPDATE devices
             SET type = $1, brand = $2, model = $3, serial_number = $4, status = $5,
                 assigned_to = $6, location = $7, next_review_at = $8, notes = $9, updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING *`,
            [
                type,
                brand,
                model,
                serial || null,
                status,
                assignedTo || null,
                location || null,
                nextReviewAt || null,
                notes || null,
                req.params.id,
            ]
        );

        if (updatedItem.rows.length === 0) {
            return res.status(404).json({ message: 'Device not found' });
        }

        return res.json(normalizeInventoryItem(updatedItem.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING id', [req.params.id]);
        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: 'Device not found' });
        }

        return res.json({ message: 'Device deleted' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/:id/licenses', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT dl.id AS link_id, dl.assigned_at, v.*
             FROM device_licenses dl
             JOIN vault_items v ON dl.vault_item_id = v.id
             WHERE dl.device_id = $1`,
            [req.params.id]
        );
        return res.json(result.rows.map((row) => ({
            ...normalizeVaultItem(row),
            assignedAt: row.assigned_at ?? row.assignedAt ?? null,
            linkId: row.link_id ?? row.linkId ?? null,
        })));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/licenses', async (req, res) => {
    try {
        const result = await pool.query(
            `INSERT INTO device_licenses (device_id, vault_item_id)
             VALUES ($1, $2)
             RETURNING *`,
            [req.params.id, req.body.vault_item_id]
        );
        return res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505' || /UNIQUE/i.test(err.message)) {
            return res.status(409).json({ message: 'License already linked' });
        }

        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id/licenses/:linkId', async (req, res) => {
    try {
        await pool.query('DELETE FROM device_licenses WHERE id = $1', [req.params.linkId]);
        return res.json({ message: 'License unlinked' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
