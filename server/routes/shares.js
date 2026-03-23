const router = require('express').Router();
const crypto = require('crypto');

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { parseJsonValue, normalizeShare } = require('../utils/serializers');
const {
    TEAM_SCOPE,
    TEAM_VAULT_MODE,
    buildVaultAccess,
    isVaultConfigured,
} = require('../services/vaultAccessService');

async function getVaultOwner(passwordId) {
    const result = await pool.query(
        'SELECT id, user_id, title, crypto_scope FROM vault_items WHERE id = $1',
        [passwordId]
    );
    return result.rows[0] || null;
}

async function ensureShareOwner(req, res, next) {
    try {
        const share = await getVaultOwner(req.body.passwordId || req.params.passwordId);
        if (!share) {
            return res.status(404).json({ message: 'Vault item not found' });
        }

        if ((share.crypto_scope || 'user') === TEAM_SCOPE) {
            return res.status(422).json({
                message: 'Team vault items are already visible to every authorized team member.',
            });
        }

        if (share.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to share this item' });
        }

        req.vaultItem = share;
        return next();
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
}

// === INTERNAL SHARING (User-to-User) ===
router.post('/internal', verifyToken, ensureShareOwner, async (req, res) => {
    try {
        const { passwordId, targetId, permission, expiresIn } = req.body;
        if (!targetId) {
            return res.status(400).json({ message: 'Target user is required' });
        }

        if (targetId === req.user.id) {
            return res.status(400).json({ message: 'Cannot share with yourself' });
        }

        const targetUser = await pool.query('SELECT id FROM users WHERE id = $1', [targetId]);
        if (targetUser.rows.length === 0) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        const ownerUser = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const recipientUser = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
        const ownerVaultAccess = ownerUser.rows[0] ? await buildVaultAccess(ownerUser.rows[0]) : null;
        const recipientVaultAccess = recipientUser.rows[0] ? await buildVaultAccess(recipientUser.rows[0]) : null;
        if (
            ownerVaultAccess?.mode === TEAM_VAULT_MODE ||
            recipientVaultAccess?.mode === TEAM_VAULT_MODE ||
            isVaultConfigured(ownerUser.rows[0]) ||
            isVaultConfigured(recipientUser.rows[0])
        ) {
            return res.status(422).json({
                message: 'Internal sharing is disabled in team vault mode because authorized users already see the shared vault. Use a temporary public share for puntual delivery.',
            });
        }

        const safePermission = permission === 'write' ? 'write' : 'read';
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn).toISOString() : null;

        const existing = await pool.query(
            'SELECT id FROM shares WHERE password_id = $1 AND shared_with = $2',
            [passwordId, targetId]
        );

        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE shares
                 SET permission = $1, expires_at = $2
                 WHERE id = $3`,
                [safePermission, expiresAt, existing.rows[0].id]
            );
            return res.json({ success: true, message: 'Updated existing share' });
        }

        const newShare = await pool.query(
            `INSERT INTO shares (password_id, shared_by, shared_with, permission, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [passwordId, req.user.id, targetId, safePermission, expiresAt]
        );

        return res.json({ success: true, id: newShare.rows[0].id });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/internal/item/:passwordId', verifyToken, async (req, res) => {
    try {
        const item = await getVaultOwner(req.params.passwordId);
        if (!item) {
            return res.status(404).json({ message: 'Vault item not found' });
        }

        if (item.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const shares = await pool.query(
            `SELECT s.id, s.shared_with, s.permission, s.expires_at, u.name
             FROM shares s
             JOIN users u ON s.shared_with = u.id
             WHERE s.password_id = $1`,
            [req.params.passwordId]
        );

        return res.json(shares.rows.map(normalizeShare));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/internal/outgoing', verifyToken, async (req, res) => {
    try {
        const shares = await pool.query(
            `SELECT s.id,
                    s.password_id,
                    s.shared_with,
                    s.permission,
                    s.expires_at,
                    u.name AS shared_with_name,
                    v.title AS password_title
             FROM shares s
             JOIN users u ON s.shared_with = u.id
             JOIN vault_items v ON v.id = s.password_id
             WHERE s.shared_by = $1`,
            [req.user.id]
        );
        return res.json(shares.rows.map(normalizeShare));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/internal/:id', verifyToken, async (req, res) => {
    try {
        const check = await pool.query(
            'SELECT id, shared_by FROM shares WHERE id = $1',
            [req.params.id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Share not found' });
        }

        if (check.rows[0].shared_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await pool.query('DELETE FROM shares WHERE id = $1', [req.params.id]);
        return res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// CREATE PUBLIC SHARE
router.post('/', verifyToken, async (req, res) => {
    try {
        const { encryptedData, type, settings = {} } = req.body;
        const { expiration, views } = settings;

        if (!encryptedData) {
            return res.status(400).json({ message: 'Missing encrypted data' });
        }

        const id = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + (expiration || 3600 * 1000)).toISOString();
        const safeViews = Number.isFinite(Number(views)) ? Number(views) : 1;
        const data = typeof encryptedData === 'string'
            ? encryptedData
            : JSON.stringify(encryptedData);

        await pool.query(
            `INSERT INTO public_shares (id, data, type, expires_at, views_left, max_views)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, data, type || 'password', expiresAt, safeViews, safeViews]
        );

        return res.json({ id, expiresAt });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// GET PUBLIC SHARE METADATA
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, type, created_at, expires_at, views_left, max_views
             FROM public_shares
             WHERE id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or missing link' });
        }

        const share = result.rows[0];
        if (new Date() > new Date(share.expires_at)) {
            return res.status(410).json({ error: 'This link has expired' });
        }
        if (share.views_left <= 0) {
            return res.status(410).json({ error: 'This link has already been consumed' });
        }

        return res.json(share);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// REVEAL SECRET
router.post('/:id/reveal', async (req, res) => {
    try {
        const nowIso = new Date().toISOString();
        const update = await pool.query(
            `UPDATE public_shares
             SET views_left = views_left - 1
             WHERE id = $1 AND views_left > 0 AND expires_at > $2
             RETURNING data, type, views_left`,
            [req.params.id, nowIso]
        );

        if (update.rows.length === 0) {
            return res.status(410).json({ error: 'Link unavailable (expired or already viewed)' });
        }

        const share = update.rows[0];
        return res.json({
            encryptedData: parseJsonValue(share.data, share.data),
            type: share.type,
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
