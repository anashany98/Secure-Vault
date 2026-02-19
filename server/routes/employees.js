const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get all employees
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees WHERE status = $1 ORDER BY full_name', ['active']);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Add new employee
router.post('/', auth, async (req, res) => {
    try {
        const { full_name, email, department, job_title } = req.body;
        const result = await pool.query(
            'INSERT INTO employees (full_name, email, department, job_title) VALUES ($1, $2, $3, $4) RETURNING *',
            [full_name, email, department, job_title]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Search "Assignable People" (Users + Employees)
// This endpoint unifies both sources for the Assignment Dropdown
router.get('/assignable', auth, async (req, res) => {
    try {
        // Fetch Users
        const users = await pool.query('SELECT id, name as label, email, \'user\' as type FROM users ORDER BY name');

        // Fetch Employees
        const employees = await pool.query('SELECT id, full_name as label, email, \'employee\' as type FROM employees WHERE status = \'active\' ORDER BY full_name');

        res.json([
            ...users.rows.map(u => ({ ...u, displayName: `[Usuario] ${u.label}` })),
            ...employees.rows.map(e => ({ ...e, displayName: `[Empleado] ${e.label}` }))
        ]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
