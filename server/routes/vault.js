const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');

// GET ALL ITEMS
router.get('/', verifyToken, async (req, res) => {
    try {
        // Get items owned by user OR shared with user
        // Simple version: just owned for now, adding sharing logic is complex SQL
        const userId = req.user.id;

        // 1. Owned items
        const ownedItems = await pool.query(
            'SELECT * FROM vault_items WHERE user_id = $1 AND is_deleted = false',
            [userId]
        );

        // 2. Shared items (Joined)
        const sharedItems = await pool.query(
            `SELECT v.*, s.permission, s.expires_at 
         FROM vault_items v
         JOIN shares s ON v.id = s.password_id
         WHERE s.shared_with = $1`,
            [userId]
        );

        // Combine
        // Note: This is a simplified view.
        res.json([...ownedItems.rows, ...sharedItems.rows]);
    } catch (err) {
        console.error("GET /vault FAILED:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});

const auditLog = require('../utils/auditLogger');

// CREATE ITEM
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields } = req.body;
        const newItem = await pool.query(
            `INSERT INTO vault_items (user_id, title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.user.id, title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields]
        );

        auditLog(req.user.id, 'CREATE_PASSWORD', 'PASSWORD', newItem.rows[0].id, `Created ${title}`, req);

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
        const { title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields } = req.body;

        // Check ownership
        const checkOwner = await pool.query('SELECT * FROM vault_items WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Item not found");
        if (checkOwner.rows[0].user_id !== req.user.id) return res.status(403).json("Not Authorized");

        const currentItem = checkOwner.rows[0];

        // Calculate Audit Diff
        const diff = {};
        const fieldsToCompare = ['title', 'username', 'url', 'notes', 'tags', 'custom_fields'];
        fieldsToCompare.forEach(field => {
            const oldValue = currentItem[field];
            const newValue = req.body[field];

            // Handle arrays and objects (tags, custom_fields)
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                diff[field] = {
                    old: oldValue,
                    new: newValue
                };
            }
        });

        // Password History Logic
        if (encrypted_password && encrypted_password !== currentItem.encrypted_password) {
            await pool.query(
                'INSERT INTO password_history (vault_item_id, encrypted_password) VALUES ($1, $2)',
                [id, currentItem.encrypted_password]
            );
            diff.password = { changed: true }; // Don't log actual encrypted keys in audit for extra security
        }

        const updateItem = await pool.query(
            `UPDATE vault_items SET title = $1, username = $2, encrypted_password = $3, url = $4, meta_person = $5, is_favorite = $6, tags = $7, custom_fields = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
            [title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields, id]
        );

        auditLog(req.user.id, 'UPDATE_PASSWORD', 'PASSWORD', id, diff, req);

        res.json(updateItem.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE ITEM (Soft or Hard Delete)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query; // ?force=true for permanent delete

        // Check ownership
        const checkOwner = await pool.query('SELECT user_id FROM vault_items WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Item not found");
        if (checkOwner.rows[0].user_id !== req.user.id) return res.status(403).json("Not Authorized");

        if (force === 'true') {
            // Hard Delete
            await pool.query('DELETE FROM vault_items WHERE id = $1', [id]);
            return res.json("Item permanently deleted");
        } else {
            // Soft Delete
            await pool.query(
                'UPDATE vault_items SET is_deleted = true, deleted_at = NOW() WHERE id = $1',
                [id]
            );
            return res.json("Item moved to trash");
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// RESTORE ITEM
router.put('/:id/restore', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const checkOwner = await pool.query('SELECT user_id FROM vault_items WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Item not found");
        if (checkOwner.rows[0].user_id !== req.user.id) return res.status(403).json("Not Authorized");

        await pool.query(
            'UPDATE vault_items SET is_deleted = false, deleted_at = NULL WHERE id = $1',
            [id]
        );

        res.json("Item restored");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// BULK IMPORT (Append)
router.post('/import', verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { items } = req.body; // Array of items

        let importedCount = 0;
        for (const item of items) {
            // Validate minimal fields
            if (!item.title || !item.encrypted_password) continue;

            await client.query(
                `INSERT INTO vault_items (user_id, title, username, encrypted_password, url, meta_person, is_favorite, tags, custom_fields, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                [
                    req.user.id,
                    item.title,
                    item.username,
                    item.encrypted_password,
                    item.url,
                    item.meta_person,
                    item.is_favorite || false,
                    item.tags || [],
                    item.custom_fields || []
                ]
            );
            );
importedCount++;

// Auto-create Employee/Person from meta_person or username
const personName = item.meta_person || item.username;
if (personName && typeof personName === 'string' && personName.length > 2) {
    // Determine if it's an email
    const isEmail = personName.includes('@');
    const emailVal = isEmail ? personName : null;
    const nameVal = personName;

    // Check and Insert if not exists (Basic check to avoid spamming duplicates in one batch)
    // Note: Ideally this should be a bulk insert or ON CONFLICT, but for now we do a quick check
    // We use a separate query ensuring we don't break the transaction if it fails (caught in try/catch internally or ignored)
    try {
        // Check if exists by name or email
        const checkEmp = await client.query(
            `SELECT id FROM employees WHERE full_name = $1 OR (email IS NOT NULL AND email = $2)`,
            [nameVal, emailVal || '']
        );

        if (checkEmp.rows.length === 0) {
            await client.query(
                `INSERT INTO employees (full_name, email, status) VALUES ($1, $2, 'active')`,
                [nameVal, emailVal]
            );
            console.log(`Auto-created employee from import: ${nameVal}`);
        }
    } catch (empErr) {
        console.warn(`Failed to auto-create employee for ${personName}:`, empErr.message);
        // Do not fail the whole import for this
    }
}
        }

await client.query('COMMIT');

auditLog(req.user.id, 'IMPORT_CSV', 'VAULT', null, `Imported ${importedCount} items`, req);

res.json({ message: "Importación completada", count: importedCount });
    } catch (err) {
    await client.query('ROLLBACK');
    console.error("IMPORT FAILED:", err);
    res.status(500).send('Server Error during import: ' + err.message);
} finally {
    client.release();
}
});

// RESTORE FROM BACKUP (Wipe and Replace)
router.post('/restore', verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { items } = req.body; // Array of items with server-side encrypted passwords

        // 1. Delete all existing items for this user
        await client.query('DELETE FROM vault_items WHERE user_id = $1', [req.user.id]);

        // 2. Insert new items
        for (const item of items) {
            await client.query(
                `INSERT INTO vault_items (user_id, title, username, encrypted_password, url, meta_person, is_favorite, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                    req.user.id,
                    item.title,
                    item.username,
                    item.encrypted_password,
                    item.url,
                    item.meta_person,
                    item.is_favorite || false
                ]
            );
        }

        await client.query('COMMIT');
        res.json({ message: "Respaldo restaurado correctamente", count: items.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error during restore');
    } finally {
        client.release();
    }
});

// GET PASSWORD HISTORY
router.get('/:id/history', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check ownership
        const checkOwner = await pool.query('SELECT user_id FROM vault_items WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0) return res.status(404).json("Item not found");
        if (checkOwner.rows[0].user_id !== req.user.id) return res.status(403).json("Not Authorized");

        const history = await pool.query(
            'SELECT * FROM password_history WHERE vault_item_id = $1 ORDER BY changed_at DESC',
            [id]
        );
        res.json(history.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
