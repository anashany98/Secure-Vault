const router = require('express').Router();
const pool = require('../db');
const crypto = require('crypto');

// CREATE PUBLIC SHARE
router.post('/', async (req, res) => {
    try {
        const { encryptedData, type, settings } = req.body;
        const { expiration, views } = settings;

        if (!encryptedData) {
            return res.status(400).json({ message: "Missing encrypted data" });
        }

        const id = crypto.randomUUID();
        // Calculate expiration date
        const expirationMs = expiration || 3600 * 1000;
        const expiresAt = new Date(Date.now() + expirationMs);

        // Ensure data is string
        const dataString = typeof encryptedData === 'string' ? encryptedData : JSON.stringify(encryptedData);

        await pool.query(
            `INSERT INTO public_shares (id, data, type, expires_at, views_left, max_views) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, dataString, type || 'password', expiresAt, views || 1, views || 1]
        );

        res.json({ id, expiresAt });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET PUBLIC SHARE METADATA (Safe check)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT id, type, created_at, expires_at, views_left, max_views FROM public_shares WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Enlace no válido o inexistente" });
        }

        const share = result.rows[0];

        // Check expiration
        if (new Date() > new Date(share.expires_at)) {
            return res.status(410).json({ error: "Este enlace ha caducado" });
        }

        // Check views
        if (share.views_left <= 0) {
            return res.status(410).json({ error: "Este enlace ya ha sido visualizado y destruido" });
        }

        res.json(share);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// REVEAL SECRET (Burn view)
router.post('/:id/reveal', async (req, res) => {
    try {
        const { id } = req.params;
        const nowIso = new Date().toISOString();

        // Atomic check and update
        const update = await pool.query(
            `UPDATE public_shares 
             SET views_left = views_left - 1 
             WHERE id = $1 AND views_left > 0 AND expires_at > $2
             RETURNING data, type, views_left`,
            [id, nowIso]
        );

        if (update.rows.length === 0) {
            // Could be not found, expired, or views exhausted
            return res.status(410).json({ error: "Enlace no disponible (caducado o ya visto)" });
        }

        const share = update.rows[0];

        res.json({
            encryptedData: JSON.parse(share.data),
            type: share.type
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const verifyToken = require('../middleware/auth');

// === INTERNAL SHARING (User-to-User) ===

// SHARE PASSWORD WITH USER
router.post('/internal', verifyToken, async (req, res) => {
    try {
        const { passwordId, targetId, permission, expiresIn } = req.body;
        const sharedBy = req.user.id; // From token

        // Calculate expiration proper
        // expiresIn is ms coming from frontend? or date?
        // Frontend sends ms (e.g. 7*24*60... or null)
        let expiresAt = null;
        if (expiresIn) {
            expiresAt = new Date(Date.now() + expiresIn);
        }

        // Check if already shared
        const existing = await pool.query(
            'SELECT id FROM shares WHERE password_id = $1 AND shared_with = $2',
            [passwordId, targetId]
        );

        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(
                'UPDATE shares SET permission = $1, expires_at = $2 WHERE id = $3',
                [permission, expiresAt, existing.rows[0].id]
            );
            return res.json({ success: true, message: "Updated existing share" });
        }

        // Create new
        const newShare = await pool.query(
            `INSERT INTO shares (password_id, shared_by, shared_with, permission, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [passwordId, sharedBy, targetId, permission, expiresAt]
        );

        res.json({ success: true, id: newShare.rows[0].id });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET SHARES FOR A PASSWORD
router.get('/internal/item/:passwordId', verifyToken, async (req, res) => {
    try {
        const { passwordId } = req.params;
        // Verify ownership or permission?
        // For now, allow if user has access to the vault item.
        // TODO: Strict check if user is owner or admin

        const shares = await pool.query(
            `SELECT s.id, s.shared_with as "sharedWith", s.permission, s.expires_at as "expiresAt", u.name
             FROM shares s
             JOIN users u ON s.shared_with = u.id
             WHERE s.password_id = $1`,
            [passwordId]
        );

        res.json(shares.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET ALL SHARES CREATED BY ME (Outgoing)
router.get('/internal/outgoing', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const shares = await pool.query(
            `SELECT s.id, s.password_id, s.shared_with, s.permission, s.expires_at, u.name
             FROM shares s
             JOIN users u ON s.shared_with = u.id
             WHERE s.shared_by = $1`,
            [userId]
        );
        res.json(shares.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// REVOKE SHARE
router.delete('/internal/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Ensure user owns the share or the item?
        // Simple check: shared_by must be current user
        const check = await pool.query('SELECT shared_by FROM shares WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Share not found" });

        if (check.rows[0].shared_by !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await pool.query('DELETE FROM shares WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
