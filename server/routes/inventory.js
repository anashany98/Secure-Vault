const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');

// GET ALL ITEMS
router.get('/', verifyToken, async (req, res) => {
    try {
        // For now, return all devices (simple inventory)
        const devices = await pool.query('SELECT * FROM devices WHERE status != \'baja\'');
        res.json(devices.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// CREATE ITEM
router.post('/', verifyToken, async (req, res) => {
    try {
        const { type, brand, model, serial_number, status, assigned_to, location, notes } = req.body;

        // Validate required fields?

        const newItem = await pool.query(
            `INSERT INTO devices (type, brand, model, serial_number, status, assigned_to, location, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [type, brand, model, serial_number, status, assigned_to, location, notes]
        );

        res.json(newItem.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// UPDATE ITEM
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, brand, model, serial_number, status, assigned_to, location, notes } = req.body;

        const updateItem = await pool.query(
            `UPDATE devices SET type = $1, brand = $2, model = $3, serial_number = $4, status = $5, assigned_to = $6, location = $7, notes = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
            [type, brand, model, serial_number, status, assigned_to, location, notes, id]
        );

        res.json(updateItem.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE ITEM
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM devices WHERE id = $1', [id]);
        res.json("Device deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- LICENSE LINKING ROUTES ---

// Get licenses for a device
router.get('/:id/licenses', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT dl.id as link_id, dl.assigned_at, v.* 
             FROM device_licenses dl
             JOIN vault_items v ON dl.vault_item_id = v.id
             WHERE dl.device_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Link license to device
router.post('/:id/licenses', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { vault_item_id } = req.body;

        const result = await pool.query(
            `INSERT INTO device_licenses (device_id, vault_item_id) VALUES ($1, $2) RETURNING *`,
            [id, vault_item_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        // Handle duplicate key error gracefully
        if (err.code === '23505') {
            return res.status(409).json({ message: 'License already linked' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Unlink license
router.delete('/:id/licenses/:linkId', verifyToken, async (req, res) => {
    try {
        const { linkId } = req.params; // Note: this is the ID of the link in device_licenses table
        await pool.query('DELETE FROM device_licenses WHERE id = $1', [linkId]);
        res.json({ message: "License unlinked" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
