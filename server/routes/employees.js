const express = require('express');
const router = express.Router();

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM employees
             WHERE status = $1
             ORDER BY full_name`,
            ['active']
        );
        return res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', async (req, res) => {
    try {
        const { full_name, email, department, job_title } = req.body;
        const result = await pool.query(
            `INSERT INTO employees (full_name, email, department, job_title)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [full_name, email || null, department || null, job_title || null]
        );
        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/assignable', async (req, res) => {
    try {
        const users = await pool.query(
            `SELECT id, name AS label, email, 'user' AS type
             FROM users
             ORDER BY name`
        );
        const employees = await pool.query(
            `SELECT id, full_name AS label, email, 'employee' AS type
             FROM employees
             WHERE status = 'active'
             ORDER BY full_name`
        );

        return res.json([
            ...users.rows.map((user) => ({ ...user, displayName: `[Usuario] ${user.label}` })),
            ...employees.rows.map((employee) => ({ ...employee, displayName: `[Empleado] ${employee.label}` })),
        ]);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
