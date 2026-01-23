const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');

// GET ALL NOTES
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await pool.query(
            'SELECT * FROM notes WHERE user_id = $1 AND is_deleted = false',
            [userId]
        );
        res.json(notes.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// CREATE NOTE
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, content, is_favorite } = req.body;
        const newNote = await pool.query(
            'INSERT INTO notes (user_id, title, content, is_favorite) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, title, content, is_favorite]
        );
        res.json(newNote.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// UPDATE NOTE
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, is_favorite } = req.body;

        // Check ownership
        const checkOwner = await pool.query('SELECT user_id FROM notes WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Note not found");
        if (checkOwner.rows[0].user_id !== req.user.id) return res.status(403).json("Not Authorized");

        const updateNote = await pool.query(
            'UPDATE notes SET title = $1, content = $2, is_favorite = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [title, content, is_favorite, id]
        );

        res.json(updateNote.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE NOTE
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const checkOwner = await pool.query('SELECT user_id FROM notes WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Note not found");
        if (checkOwner.rows[0].user_id !== req.user.id) return res.status(403).json("Not Authorized");

        await pool.query(
            'UPDATE notes SET is_deleted = true, deleted_at = NOW() WHERE id = $1',
            [id]
        );

        res.json("Note deleted");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
