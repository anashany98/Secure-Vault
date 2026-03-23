const router = require('express').Router();

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { parseArrayValue } = require('../utils/serializers');

function normalizeTemplate(row) {
    return {
        ...row,
        customFields: parseArrayValue(row.custom_fields),
        custom_fields: parseArrayValue(row.custom_fields),
        owner: row.meta_person || '',
        renewalIntervalDays: row.renewal_interval_days ?? null,
        renewal_interval_days: row.renewal_interval_days ?? null,
        tags: parseArrayValue(row.tags),
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

function buildTemplatePayload(body = {}) {
    return {
        customFields: parseArrayValue(body.custom_fields ?? body.customFields),
        name: (body.name || '').trim(),
        owner: body.meta_person ?? body.owner ?? '',
        renewalIntervalDays: body.renewal_interval_days ?? body.renewalIntervalDays ?? null,
        tags: parseArrayValue(body.tags),
        title: (body.title || '').trim(),
        url: body.url || '',
        username: body.username || '',
    };
}

router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM vault_templates
             WHERE user_id = $1
             ORDER BY name ASC, created_at DESC`,
            [req.user.id]
        );

        return res.json(result.rows.map(normalizeTemplate));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', async (req, res) => {
    try {
        const payload = buildTemplatePayload(req.body);
        if (!payload.name || !payload.title) {
            return res.status(400).json({ message: 'Name and title are required' });
        }

        const result = await pool.query(
            `INSERT INTO vault_templates (
                user_id, name, title, username, url, meta_person, renewal_interval_days, tags, custom_fields
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                req.user.id,
                payload.name,
                payload.title,
                payload.username || null,
                payload.url || null,
                payload.owner || null,
                payload.renewalIntervalDays ? Number(payload.renewalIntervalDays) : null,
                payload.tags,
                payload.customFields,
            ]
        );

        return res.json(normalizeTemplate(result.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM vault_templates WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Template not found' });
        }

        return res.json({ message: 'Template deleted' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
