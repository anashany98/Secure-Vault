const router = require('express').Router();

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const groups = await pool.query(
            `SELECT DISTINCT g.*
             FROM groups g
             LEFT JOIN group_members gm ON g.id = gm.group_id
             WHERE g.created_by = $1 OR gm.user_id = $2`,
            [req.user.id, req.user.id]
        );
        return res.json(groups.rows);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        const newGroup = await pool.query(
            `INSERT INTO groups (name, description, created_by)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, description || null, req.user.id]
        );

        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [newGroup.rows[0].id, req.user.id, 'admin']
        );

        return res.json(newGroup.rows[0]);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/:id/members', requireAdmin, async (req, res) => {
    try {
        const members = await pool.query(
            'SELECT * FROM group_members WHERE group_id = $1',
            [req.params.id]
        );
        return res.json(members.rows);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/members', requireAdmin, async (req, res) => {
    try {
        const { userId, role } = req.body;
        const newMember = await pool.query(
            `INSERT INTO group_members (group_id, user_id, role)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [req.params.id, userId, role || 'member']
        );
        return res.json(newMember.rows[0]);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id/members/:userId', requireAdmin, async (req, res) => {
    try {
        const deletedMember = await pool.query(
            `DELETE FROM group_members
             WHERE group_id = $1 AND user_id = $2
             RETURNING *`,
            [req.params.id, req.params.userId]
        );

        if (deletedMember.rowCount === 0) {
            return res.status(404).json({ message: 'Group member not found' });
        }

        return res.json({ success: true, member: deletedMember.rows[0] });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const deletedGroup = await pool.query(
            'DELETE FROM groups WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        if (deletedGroup.rowCount === 0) {
            return res.status(404).json({ message: 'Group not found' });
        }

        return res.json({ success: true, group: deletedGroup.rows[0] });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
