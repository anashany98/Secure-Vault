const router = require('express').Router();

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const auditLog = require('../utils/auditLogger');
const {
    normalizeInventoryItem,
    normalizeVaultAttachment,
    normalizeVaultItem,
    parseArrayValue,
    parseJsonValue,
} = require('../utils/serializers');
const {
    TEAM_SCOPE,
    TEAM_VAULT_MODE,
    USER_SCOPE,
    buildVaultAccess,
    isVaultConfigured,
} = require('../services/vaultAccessService');

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_ITEM = 10;
const VAULT_SELECT_FIELDS = `
    v.*,
    checkout_user.name AS checked_out_by_name
`;

function parseNullableDate(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseNullableInteger(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableString(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized ? normalized : null;
}

function buildVaultPayload(body) {
    return {
        customFields: parseArrayValue(body.custom_fields ?? body.customFields),
        encryptedPassword: body.encrypted_password ?? body.encryptedPassword ?? '',
        folderId: body.folder_id ?? body.folderId ?? null,
        isFavorite: Boolean(body.is_favorite ?? body.isFavorite),
        nextReviewAt: parseNullableDate(body.next_review_at ?? body.nextReviewAt),
        owner: normalizeNullableString(body.meta_person ?? body.owner),
        renewalIntervalDays: parseNullableInteger(
            body.renewal_interval_days ?? body.renewalIntervalDays
        ),
        tags: parseArrayValue(body.tags),
        title: normalizeNullableString(body.title),
        url: normalizeNullableString(body.url),
        username: normalizeNullableString(body.username),
    };
}

function buildAttachmentPayload(body = {}) {
    return {
        encryptedData: body.encrypted_data ?? body.encryptedData ?? '',
        fileName: body.file_name ?? body.fileName ?? '',
        mimeType: body.mime_type ?? body.mimeType ?? 'application/octet-stream',
        sizeBytes: Number(body.size_bytes ?? body.sizeBytes ?? 0),
    };
}

function buildAttachmentPayloads(value) {
    return parseArrayValue(value).map((item) => buildAttachmentPayload(item));
}

function validateAttachmentPayload(payload) {
    if (!payload.fileName || typeof payload.fileName !== 'string') {
        throw new Error('Attachment file name is required');
    }

    if (!payload.encryptedData || typeof payload.encryptedData !== 'string') {
        throw new Error('Attachment payload is required');
    }

    if (!Number.isFinite(payload.sizeBytes) || payload.sizeBytes <= 0) {
        throw new Error('Attachment size is invalid');
    }

    if (payload.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new Error(`Attachment ${payload.fileName} exceeds the 5 MB limit`);
    }

    if (payload.fileName.length > 255) {
        throw new Error('Attachment file name is too long');
    }
}

function ensureVaultPayload(payload) {
    if (!payload.title) {
        throw new Error('Title is required');
    }

    if (!payload.encryptedPassword) {
        throw new Error('Encrypted password is required');
    }
}

function canWriteItem(access) {
    return access && (access.permission === 'owner' || access.permission === 'write');
}

function requireAdmin(req, res) {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required' });
        return false;
    }

    return true;
}

function buildDuplicateTitle(title) {
    return title.endsWith(' (copia)') ? `${title} 2` : `${title} (copia)`;
}

async function getVaultItemById(id) {
    const result = await pool.query(
        `SELECT ${VAULT_SELECT_FIELDS}
         FROM vault_items v
         LEFT JOIN users checkout_user ON checkout_user.id = v.checked_out_by
         WHERE v.id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

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

async function getVaultAccess(id, user) {
    const item = await getVaultItemById(id);
    if (!item) {
        return null;
    }

    if (getCryptoScope(item.crypto_scope) === TEAM_SCOPE) {
        const context = await loadVaultUserContext(user.id);
        if (context.vaultAccess?.mode === TEAM_VAULT_MODE && context.vaultAccess?.isConfigured) {
            return { item, permission: 'owner', viaTeam: true };
        }
        return null;
    }

    if (item.user_id === user.id || user.role === 'admin') {
        return { item, permission: 'owner' };
    }

    const share = await pool.query(
        `SELECT permission, expires_at
         FROM shares
         WHERE password_id = $1 AND shared_with = $2`,
        [id, user.id]
    );

    if (share.rows.length === 0) {
        return null;
    }

    const access = share.rows[0];
    if (access.expires_at && new Date(access.expires_at) <= new Date()) {
        return null;
    }

    return { item, permission: access.permission };
}

async function getAttachmentsForItems(itemIds) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return new Map();
    }

    const placeholders = itemIds.map((_, index) => `$${index + 1}`).join(', ');
    const result = await pool.query(
        `SELECT *
         FROM vault_item_attachments
         WHERE vault_item_id IN (${placeholders})
         ORDER BY created_at ASC`,
        itemIds
    );

    const map = new Map(itemIds.map((id) => [id, []]));
    result.rows.forEach((row) => {
        const normalized = normalizeVaultAttachment(row);
        const key = normalized.vaultItemId;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(normalized);
    });

    return map;
}

async function listVaultAttachments(vaultItemId) {
    const result = await pool.query(
        `SELECT *
         FROM vault_item_attachments
         WHERE vault_item_id = $1
         ORDER BY created_at ASC`,
        [vaultItemId]
    );

    return result.rows.map(normalizeVaultAttachment);
}

async function countVaultAttachments(vaultItemId) {
    const result = await pool.query(
        'SELECT COUNT(*) AS total FROM vault_item_attachments WHERE vault_item_id = $1',
        [vaultItemId]
    );

    return Number(result.rows[0]?.total || 0);
}

async function insertAttachmentRecord(client, vaultItemId, rawAttachment) {
    const payload = buildAttachmentPayload(rawAttachment);
    validateAttachmentPayload(payload);

    const result = await client.query(
        `INSERT INTO vault_item_attachments (
            vault_item_id, file_name, mime_type, size_bytes, encrypted_data
         ) VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
            vaultItemId,
            payload.fileName,
            payload.mimeType,
            payload.sizeBytes,
            payload.encryptedData,
        ]
    );

    return normalizeVaultAttachment(result.rows[0]);
}

async function getAttachmentById(vaultItemId, attachmentId) {
    const result = await pool.query(
        `SELECT *
         FROM vault_item_attachments
         WHERE id = $1 AND vault_item_id = $2`,
        [attachmentId, vaultItemId]
    );

    return result.rows[0] || null;
}

async function getLinkedDevices(vaultItemId) {
    const result = await pool.query(
        `SELECT d.*, dl.id AS link_id, dl.assigned_at
         FROM device_licenses dl
         JOIN devices d ON d.id = dl.device_id
         WHERE dl.vault_item_id = $1
         ORDER BY dl.assigned_at DESC`,
        [vaultItemId]
    );

    return result.rows.map(normalizeInventoryItem);
}

router.get('/', verifyToken, async (req, res) => {
    try {
        const currentUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const currentUser = currentUserResult.rows[0];
        const vaultAccess = currentUser ? await buildVaultAccess(currentUser) : null;
        const isTeamMember = vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured;

        const visibleItems = await pool.query(
            `SELECT ${VAULT_SELECT_FIELDS}
             FROM vault_items v
             LEFT JOIN users checkout_user ON checkout_user.id = v.checked_out_by
             WHERE (
                ($2 = 1 AND COALESCE(v.crypto_scope, $3) = $4) OR
                (v.user_id = $1 AND COALESCE(v.crypto_scope, $3) <> $4)
             )
             ORDER BY v.updated_at DESC, v.created_at DESC`,
            [req.user.id, isTeamMember ? 1 : 0, USER_SCOPE, TEAM_SCOPE]
        );

        const sharedItems = !isTeamMember && !isVaultConfigured(currentUser)
            ? await pool.query(
                `SELECT ${VAULT_SELECT_FIELDS},
                        s.id AS share_id,
                        s.permission,
                        s.expires_at,
                        s.shared_by
                 FROM vault_items v
                 JOIN shares s ON v.id = s.password_id
                 LEFT JOIN users checkout_user ON checkout_user.id = v.checked_out_by
                 WHERE s.shared_with = $1`,
                [req.user.id]
            )
            : { rows: [] };

        const activeSharedItems = sharedItems.rows
            .filter((item) => !item.is_deleted)
            .filter((item) => !item.expires_at || new Date(item.expires_at) > new Date());

        const seenIds = new Set();
        const response = [...visibleItems.rows, ...activeSharedItems]
            .filter((item) => {
                if (seenIds.has(item.id)) {
                    return false;
                }

                seenIds.add(item.id);
                return true;
            })
            .map(normalizeVaultItem);

        return res.json(response);
    } catch (err) {
        console.error('GET /vault FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/export', verifyToken, async (req, res) => {
    try {
        const migrationOnly = req.query.migrationOnly === 'true';
        const currentUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const currentUser = currentUserResult.rows[0];
        const vaultAccess = currentUser ? await buildVaultAccess(currentUser) : null;
        const isTeamMember = !migrationOnly && vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured;

        const ownedItems = await pool.query(
            `SELECT ${VAULT_SELECT_FIELDS}
             FROM vault_items v
             LEFT JOIN users checkout_user ON checkout_user.id = v.checked_out_by
             WHERE (
                ($2 = 1 AND COALESCE(v.crypto_scope, $3) = $4) OR
                (v.user_id = $1 AND (
                    ($5 = 1 AND COALESCE(v.crypto_scope, $3) <> $4) OR
                    ($5 = 0 AND ($2 = 0 OR COALESCE(v.crypto_scope, $3) <> $4))
                ))
             )
             ORDER BY v.updated_at DESC, v.created_at DESC`,
            [req.user.id, isTeamMember ? 1 : 0, USER_SCOPE, TEAM_SCOPE, migrationOnly ? 1 : 0]
        );

        const attachmentsByItem = await getAttachmentsForItems(
            ownedItems.rows.map((item) => item.id)
        );

        const response = ownedItems.rows.map((item) => ({
            ...normalizeVaultItem(item),
            attachments: attachmentsByItem.get(item.id) || [],
        }));

        return res.json(response);
    } catch (err) {
        console.error('GET /vault/export FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/history/export', verifyToken, async (req, res) => {
    try {
        const migrationOnly = req.query.migrationOnly === 'true';
        const currentUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const currentUser = currentUserResult.rows[0];
        const vaultAccess = currentUser ? await buildVaultAccess(currentUser) : null;
        const isTeamMember = !migrationOnly && vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured;

        const history = await pool.query(
            `SELECT history.*
             FROM password_history history
             JOIN vault_items item ON item.id = history.vault_item_id
             WHERE (
                ($2 = 1 AND COALESCE(item.crypto_scope, $3) = $4) OR
                (item.user_id = $1 AND (
                    ($5 = 1 AND COALESCE(item.crypto_scope, $3) <> $4) OR
                    ($5 = 0 AND ($2 = 0 OR COALESCE(item.crypto_scope, $3) <> $4))
                ))
             )
             ORDER BY history.changed_at DESC`,
            [req.user.id, isTeamMember ? 1 : 0, USER_SCOPE, TEAM_SCOPE, migrationOnly ? 1 : 0]
        );

        return res.json(history.rows.map((row) => ({
            ...row,
            changedAt: row.changed_at,
        })));
    } catch (err) {
        console.error('GET /vault/history/export FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', verifyToken, async (req, res) => {
    try {
        const payload = buildVaultPayload(req.body);
        ensureVaultPayload(payload);
        const { vaultAccess } = await loadVaultUserContext(req.user.id);
        const cryptoScope = vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured
            ? TEAM_SCOPE
            : USER_SCOPE;

        const newItem = await pool.query(
            `INSERT INTO vault_items (
                user_id, title, username, encrypted_password, crypto_scope, url, meta_person,
                is_favorite, tags, custom_fields, folder_id, next_review_at, renewal_interval_days
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                req.user.id,
                payload.title,
                payload.username,
                payload.encryptedPassword,
                cryptoScope,
                payload.url,
                payload.owner,
                payload.isFavorite,
                payload.tags,
                payload.customFields,
                payload.folderId,
                payload.nextReviewAt,
                payload.renewalIntervalDays,
            ]
        );

        await auditLog(
            req.user.id,
            'CREATE_PASSWORD',
            'PASSWORD',
            newItem.rows[0].id,
            `Created ${payload.title}`,
            req
        );
        return res.json(normalizeVaultItem(newItem.rows[0]));
    } catch (err) {
        if (err.message === 'Title is required' || err.message === 'Encrypted password is required') {
            return res.status(400).json({ message: err.message });
        }

        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/:id', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!canWriteItem(access)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const payload = buildVaultPayload(req.body);
        const currentItem = normalizeVaultItem(access.item);
        const nextPayload = {
            ...payload,
            encryptedPassword: payload.encryptedPassword || currentItem.encryptedPassword,
            title: payload.title || currentItem.title,
        };
        ensureVaultPayload(nextPayload);

        const diff = {};
        const comparableFields = {
            custom_fields: nextPayload.customFields,
            folder_id: nextPayload.folderId,
            is_favorite: nextPayload.isFavorite,
            meta_person: nextPayload.owner,
            next_review_at: nextPayload.nextReviewAt,
            renewal_interval_days: nextPayload.renewalIntervalDays,
            tags: nextPayload.tags,
            title: nextPayload.title,
            url: nextPayload.url,
            username: nextPayload.username,
        };
        const currentComparable = {
            custom_fields: currentItem.customFields,
            folder_id: currentItem.folderId,
            is_favorite: currentItem.isFavorite,
            meta_person: currentItem.owner,
            next_review_at: currentItem.nextReviewAt,
            renewal_interval_days: currentItem.renewalIntervalDays,
            tags: currentItem.tags,
            title: currentItem.title,
            url: currentItem.url,
            username: currentItem.username,
        };

        Object.entries(comparableFields).forEach(([field, value]) => {
            if (JSON.stringify(currentComparable[field]) !== JSON.stringify(value)) {
                diff[field] = { old: currentComparable[field], new: value };
            }
        });

        if (
            nextPayload.encryptedPassword &&
            nextPayload.encryptedPassword !== currentItem.encryptedPassword
        ) {
            await pool.query(
                'INSERT INTO password_history (vault_item_id, encrypted_password) VALUES ($1, $2)',
                [req.params.id, currentItem.encryptedPassword]
            );
            diff.password = { changed: true };
        }

        const updatedItem = await pool.query(
            `UPDATE vault_items
             SET title = $1,
                 username = $2,
                 encrypted_password = $3,
                 url = $4,
                 meta_person = $5,
                 is_favorite = $6,
                 tags = $7,
                 custom_fields = $8,
                 folder_id = $9,
                 next_review_at = $10,
                 renewal_interval_days = $11,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $12
             RETURNING *`,
            [
                nextPayload.title,
                nextPayload.username,
                nextPayload.encryptedPassword,
                nextPayload.url,
                nextPayload.owner,
                nextPayload.isFavorite,
                nextPayload.tags,
                nextPayload.customFields,
                nextPayload.folderId,
                nextPayload.nextReviewAt,
                nextPayload.renewalIntervalDays,
                req.params.id,
            ]
        );

        await auditLog(req.user.id, 'UPDATE_PASSWORD', 'PASSWORD', req.params.id, diff, req);
        return res.json(normalizeVaultItem(updatedItem.rows[0]));
    } catch (err) {
        if (err.message === 'Title is required' || err.message === 'Encrypted password is required') {
            return res.status(400).json({ message: err.message });
        }

        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/duplicate', verifyToken, async (req, res) => {
    const client = await pool.connect();
    let hasTransaction = false;
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }

        const source = normalizeVaultItem(access.item);
        const duplicateTitle = normalizeNullableString(req.body?.title) || buildDuplicateTitle(source.title);
        const attachments = await listVaultAttachments(req.params.id);

        await client.query('BEGIN');
        hasTransaction = true;
        const { vaultAccess } = await loadVaultUserContext(req.user.id);
        const cryptoScope = vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured
            ? TEAM_SCOPE
            : USER_SCOPE;
        const created = await client.query(
            `INSERT INTO vault_items (
                user_id, title, username, encrypted_password, crypto_scope, url, meta_person,
                is_favorite, tags, custom_fields, folder_id, next_review_at, renewal_interval_days
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                req.user.id,
                duplicateTitle,
                source.username,
                source.encryptedPassword,
                cryptoScope,
                source.url,
                source.owner,
                false,
                source.tags,
                source.customFields,
                source.folderId,
                source.nextReviewAt,
                source.renewalIntervalDays,
            ]
        );

        for (const attachment of attachments) {
            await insertAttachmentRecord(client, created.rows[0].id, attachment);
        }

        await client.query('COMMIT');
        await auditLog(
            req.user.id,
            'DUPLICATE_PASSWORD',
            'PASSWORD',
            created.rows[0].id,
            { sourceId: req.params.id, title: duplicateTitle },
            req
        );

        return res.json(normalizeVaultItem(created.rows[0]));
    } catch (err) {
        if (hasTransaction) {
            await client.query('ROLLBACK');
        }
        console.error('POST /vault/:id/duplicate FAILED:', err.message);
        return res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

router.post('/:id/checkout', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!canWriteItem(access)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const item = normalizeVaultItem(access.item);
        const currentHolder = item.checkedOutBy;
        const canOverride = req.user.role === 'admin' || access.permission === 'owner';
        if (currentHolder && currentHolder !== req.user.id && !canOverride) {
            return res.status(409).json({ message: 'Item already checked out by another user' });
        }

        const until = parseNullableDate(req.body?.until ?? req.body?.checked_out_until);
        const note = normalizeNullableString(req.body?.note ?? req.body?.checkout_note);
        const updated = await pool.query(
            `UPDATE vault_items
             SET checked_out_by = $1,
                 checked_out_at = CURRENT_TIMESTAMP,
                 checked_out_until = $2,
                 checkout_note = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [req.user.id, until, note, req.params.id]
        );

        await auditLog(
            req.user.id,
            'CHECKOUT_PASSWORD',
            'PASSWORD',
            req.params.id,
            { until, note },
            req
        );

        const refreshed = await getVaultItemById(updated.rows[0].id);
        return res.json(normalizeVaultItem(refreshed));
    } catch (err) {
        console.error('POST /vault/:id/checkout FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/checkin', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!canWriteItem(access)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const item = normalizeVaultItem(access.item);
        const canOverride = req.user.role === 'admin' || access.permission === 'owner';
        if (item.checkedOutBy && item.checkedOutBy !== req.user.id && !canOverride) {
            return res.status(409).json({ message: 'Only the current holder can check in this item' });
        }

        const updated = await pool.query(
            `UPDATE vault_items
             SET checked_out_by = NULL,
                 checked_out_at = NULL,
                 checked_out_until = NULL,
                 checkout_note = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        await auditLog(req.user.id, 'CHECKIN_PASSWORD', 'PASSWORD', req.params.id, null, req);

        return res.json(normalizeVaultItem(updated.rows[0]));
    } catch (err) {
        console.error('POST /vault/:id/checkin FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access || access.permission !== 'owner') {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }

        if (req.query.force === 'true') {
            await pool.query('DELETE FROM vault_items WHERE id = $1', [req.params.id]);
            return res.json({ message: 'Item permanently deleted' });
        }

        await pool.query(
            `UPDATE vault_items
             SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [req.params.id]
        );

        return res.json({ message: 'Item moved to trash' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/:id/restore', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access || access.permission !== 'owner') {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }

        const restored = await pool.query(
            `UPDATE vault_items
             SET is_deleted = false, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        return res.json(normalizeVaultItem(restored.rows[0]));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/:id/attachments', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }

        const attachments = await listVaultAttachments(req.params.id);
        return res.json(attachments);
    } catch (err) {
        console.error('GET /vault/:id/attachments FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/attachments', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!canWriteItem(access)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const currentCount = await countVaultAttachments(req.params.id);
        if (currentCount >= MAX_ATTACHMENTS_PER_ITEM) {
            return res.status(400).json({ message: `Maximum ${MAX_ATTACHMENTS_PER_ITEM} attachments per item` });
        }

        const created = await insertAttachmentRecord(pool, req.params.id, req.body);
        await auditLog(req.user.id, 'ADD_ATTACHMENT', 'PASSWORD_ATTACHMENT', created.id, {
            fileName: created.fileName,
            passwordId: req.params.id,
            sizeBytes: created.sizeBytes,
        }, req);

        return res.json(created);
    } catch (err) {
        if (err.message && err.message.includes('Attachment')) {
            return res.status(400).json({ message: err.message });
        }

        console.error('POST /vault/:id/attachments FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id/attachments/:attachmentId', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!canWriteItem(access)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const attachment = await getAttachmentById(req.params.id, req.params.attachmentId);
        if (!attachment) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        await pool.query(
            'DELETE FROM vault_item_attachments WHERE id = $1 AND vault_item_id = $2',
            [req.params.attachmentId, req.params.id]
        );

        await auditLog(req.user.id, 'DELETE_ATTACHMENT', 'PASSWORD_ATTACHMENT', req.params.attachmentId, {
            fileName: attachment.file_name,
            passwordId: req.params.id,
        }, req);

        return res.json({ message: 'Attachment deleted' });
    } catch (err) {
        console.error('DELETE /vault/:id/attachments/:attachmentId FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/:id/linked-devices', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!requireAdmin(req, res)) {
            return undefined;
        }

        const devices = await getLinkedDevices(req.params.id);
        return res.json(devices);
    } catch (err) {
        console.error('GET /vault/:id/linked-devices FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/linked-devices', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!requireAdmin(req, res)) {
            return undefined;
        }

        const deviceId = req.body?.device_id ?? req.body?.deviceId;
        if (!deviceId) {
            return res.status(400).json({ message: 'device_id is required' });
        }

        const created = await pool.query(
            `INSERT INTO device_licenses (device_id, vault_item_id)
             VALUES ($1, $2)
             RETURNING *`,
            [deviceId, req.params.id]
        );

        await auditLog(
            req.user.id,
            'LINK_DEVICE_LICENSE',
            'PASSWORD',
            req.params.id,
            { deviceId, linkId: created.rows[0].id },
            req
        );

        return res.json({
            assignedAt: created.rows[0].assigned_at ?? created.rows[0].assignedAt ?? null,
            id: created.rows[0].id,
        });
    } catch (err) {
        if (err.code === '23505' || /UNIQUE/i.test(err.message)) {
            return res.status(409).json({ message: 'Device already linked' });
        }

        console.error('POST /vault/:id/linked-devices FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id/linked-devices/:linkId', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }
        if (!requireAdmin(req, res)) {
            return undefined;
        }

        await pool.query(
            'DELETE FROM device_licenses WHERE id = $1 AND vault_item_id = $2',
            [req.params.linkId, req.params.id]
        );

        await auditLog(
            req.user.id,
            'UNLINK_DEVICE_LICENSE',
            'PASSWORD',
            req.params.id,
            { linkId: req.params.linkId },
            req
        );

        return res.json({ message: 'Device unlinked' });
    } catch (err) {
        console.error('DELETE /vault/:id/linked-devices/:linkId FAILED:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/import', verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { items = [] } = req.body;
        let importedCount = 0;
        const { vaultAccess } = await loadVaultUserContext(req.user.id);
        const cryptoScope = vaultAccess?.mode === TEAM_VAULT_MODE && vaultAccess?.isConfigured
            ? TEAM_SCOPE
            : USER_SCOPE;

        for (const item of items) {
            const payload = buildVaultPayload(item);
            if (!payload.title || !payload.encryptedPassword) {
                continue;
            }

            const attachments = buildAttachmentPayloads(item.attachments);
            if (attachments.length > MAX_ATTACHMENTS_PER_ITEM) {
                throw new Error(`Item ${payload.title} exceeds the maximum attachment limit`);
            }

            const insertResult = await client.query(
                `INSERT INTO vault_items (
                    user_id, title, username, encrypted_password, crypto_scope, url, meta_person,
                    is_favorite, tags, custom_fields, folder_id, next_review_at, renewal_interval_days,
                    created_at
                 ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP
                 )
                 RETURNING id`,
                [
                    req.user.id,
                    payload.title,
                    payload.username,
                    payload.encryptedPassword,
                    cryptoScope,
                    payload.url,
                    payload.owner,
                    payload.isFavorite,
                    payload.tags,
                    payload.customFields,
                    payload.folderId,
                    payload.nextReviewAt,
                    payload.renewalIntervalDays,
                ]
            );

            const vaultItemId = insertResult.rows[0].id;
            for (const attachment of attachments) {
                await insertAttachmentRecord(client, vaultItemId, attachment);
            }

            importedCount += 1;
        }

        await client.query('COMMIT');
        await auditLog(req.user.id, 'IMPORT_VAULT', 'VAULT', null, `Imported ${importedCount} items`, req);

        return res.json({ count: importedCount, message: 'Import completed' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('IMPORT FAILED:', err.message);
        return res.status(500).send('Server Error during import');
    } finally {
        client.release();
    }
});

router.post('/restore', verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { items = [] } = req.body;

        await client.query('DELETE FROM vault_items WHERE user_id = $1', [req.user.id]);

        for (const item of items) {
            const payload = buildVaultPayload(item);
            if (!payload.title || !payload.encryptedPassword) {
                continue;
            }

            const attachments = buildAttachmentPayloads(item.attachments);
            if (attachments.length > MAX_ATTACHMENTS_PER_ITEM) {
                throw new Error(`Item ${payload.title} exceeds the maximum attachment limit`);
            }

            const insertResult = await client.query(
                `INSERT INTO vault_items (
                    user_id, title, username, encrypted_password, url, meta_person,
                    is_favorite, tags, custom_fields, folder_id, next_review_at, renewal_interval_days,
                    created_at
                 ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
                 )
                 RETURNING id`,
                [
                    req.user.id,
                    payload.title,
                    payload.username,
                    payload.encryptedPassword,
                    payload.url,
                    payload.owner,
                    payload.isFavorite,
                    payload.tags,
                    payload.customFields,
                    payload.folderId,
                    payload.nextReviewAt,
                    payload.renewalIntervalDays,
                ]
            );

            const vaultItemId = insertResult.rows[0].id;
            for (const attachment of attachments) {
                await insertAttachmentRecord(client, vaultItemId, attachment);
            }
        }

        await client.query('COMMIT');
        await auditLog(req.user.id, 'RESTORE_VAULT', 'VAULT', null, `Restored ${items.length} items`, req);

        return res.json({ count: items.length, message: 'Backup restored' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        return res.status(500).send('Server Error during restore');
    } finally {
        client.release();
    }
});

router.get('/:id/change-log', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access) {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }

        const changes = await pool.query(
            `SELECT audit.id,
                    audit.action,
                    audit.details,
                    audit.created_at,
                    audit.user_id,
                    users.name AS user_name,
                    users.email AS user_email
             FROM audit_logs audit
             LEFT JOIN users ON users.id = audit.user_id
             WHERE audit.entity_type = 'PASSWORD' AND audit.entity_id = $1
             ORDER BY audit.created_at DESC`,
            [req.params.id]
        );

        return res.json(changes.rows.map((row) => ({
            action: row.action,
            changedAt: row.created_at,
            details: parseJsonValue(row.details, row.details),
            id: row.id,
            userEmail: row.user_email || null,
            userName: row.user_name || null,
            userId: row.user_id || null,
        })));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/:id/history', verifyToken, async (req, res) => {
    try {
        const access = await getVaultAccess(req.params.id, req.user);
        if (!access || access.permission !== 'owner') {
            return res.status(404).json({ message: 'Item not found or access denied' });
        }

        const history = await pool.query(
            'SELECT * FROM password_history WHERE vault_item_id = $1 ORDER BY changed_at DESC',
            [req.params.id]
        );

        return res.json(history.rows.map((row) => ({
            ...row,
            changedAt: row.changed_at,
        })));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
