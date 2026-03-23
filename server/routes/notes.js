const router = require('express').Router();
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { normalizeNote } = require('../utils/serializers');
const {
    TEAM_SCOPE,
    TEAM_VAULT_MODE,
    USER_SCOPE,
    buildVaultAccess,
} = require('../services/vaultAccessService');

function getCryptoScope(value) {
    return value === TEAM_SCOPE ? TEAM_SCOPE : USER_SCOPE;
}

async function loadVaultUserContext(userId) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0] || null;
    return {
        user,
        vaultAccess: user ? await buildVaultAccess(user) : null,
    };
}

async function getNoteAccess(noteId, user) {
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    const note = result.rows[0] || null;
    if (!note) {
        return null;
    }

    if (getCryptoScope(note.crypto_scope) === TEAM_SCOPE) {
        const context = await loadVaultUserContext(user.id);
        if (context.vaultAccess?.mode === TEAM_VAULT_MODE && context.vaultAccess?.isConfigured) {
            return { note, permission: 'owner', viaTeam: true };
        }
        return null;
    }

    if (note.user_id === user.id || user.role === 'admin') {
        return { note, permission: 'owner' };
    }

    return null;
}

router.get('/', verifyToken, async (req, res) => {
    try {
        const migrationOnly = req.query.migrationOnly === 'true';
        const { vaultAccess } = await loadVaultUserContext(req.user.id);
        const isTeamMember = !migrationOnly && vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured;

        const notes = await pool.query(
            `SELECT *
             FROM notes
             WHERE (
                ($2 = 1 AND COALESCE(crypto_scope, $3) = $4) OR
                (user_id = $1 AND (
                    ($5 = 1 AND COALESCE(crypto_scope, $3) <> $4) OR
                    ($5 = 0 AND ($2 = 0 OR COALESCE(crypto_scope, $3) <> $4))
                ))
             )
             ORDER BY updated_at DESC, created_at DESC`,
            [req.user.id, isTeamMember ? 1 : 0, USER_SCOPE, TEAM_SCOPE, migrationOnly ? 1 : 0]
        );
        return res.json(notes.rows.map(normalizeNote));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, content, is_favorite } = req.body;
        const { vaultAccess } = await loadVaultUserContext(req.user.id);
        const cryptoScope = vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured
            ? TEAM_SCOPE
            : USER_SCOPE;

        const newNote = await pool.query(
            `INSERT INTO notes (user_id, title, content, crypto_scope, is_favorite)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.id, title, content, cryptoScope, Boolean(is_favorite)]
        );
        return res.json(normalizeNote(newNote.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/:id', verifyToken, async (req, res) => {
    try {
        const access = await getNoteAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const { title, content, is_favorite } = req.body;
        const updatedNote = await pool.query(
            `UPDATE notes
             SET title = $1, content = $2, is_favorite = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [title, content, Boolean(is_favorite), req.params.id]
        );

        return res.json(normalizeNote(updatedNote.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const access = await getNoteAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Note not found' });
        }

        await pool.query(
            `UPDATE notes
             SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [req.params.id]
        );

        return res.json({ message: 'Note moved to trash' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/:id/restore', verifyToken, async (req, res) => {
    try {
        const access = await getNoteAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const restored = await pool.query(
            `UPDATE notes
             SET is_deleted = false, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        return res.json(normalizeNote(restored.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id/permanent', verifyToken, async (req, res) => {
    try {
        const access = await getNoteAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Note not found' });
        }

        await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
        return res.json({ message: 'Note permanently deleted' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
