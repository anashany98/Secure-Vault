const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');

// GET MY GROUPS
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Groups I created OR am a member of
        const groups = await pool.query(
            `SELECT DISTINCT g.* 
         FROM groups g
         LEFT JOIN group_members gm ON g.id = gm.group_id
         WHERE g.created_by = $1 OR gm.user_id = $1`,
            [userId]
        );
        res.json(groups.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// CREATE GROUP
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        const newGroup = await pool.query(
            'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name, description, req.user.id]
        );

        // Add creator as admin
        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [newGroup.rows[0].id, req.user.id, 'admin']
        );

        res.json(newGroup.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET MEMBERS
router.get('/:id/members', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check access? For now assume public inside org or strictly member
        const members = await pool.query('SELECT * FROM group_members WHERE group_id = $1', [id]);
        res.json(members.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error');
    }
});

// ADD MEMBER
router.post('/:id/members', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;

        // TODO: Check if requester is admin of group

        const newMember = await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
            [id, userId, role || 'member']
        );
        res.json(newMember.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error');
    }
});

module.exports = router;
