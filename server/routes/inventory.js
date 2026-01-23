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

module.exports = router;
