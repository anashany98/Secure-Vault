function parseJsonValue(value, fallback) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    return value;
}

function parseArrayValue(value) {
    const parsed = parseJsonValue(value, []);
    return Array.isArray(parsed) ? parsed : [];
}

function asBoolean(value) {
    return value === true || value === 1 || value === '1';
}

function normalizeVaultItem(row) {
    const tags = parseArrayValue(row.tags);
    const customFields = parseArrayValue(row.custom_fields);
    const isFavorite = asBoolean(row.is_favorite ?? row.isFavorite);
    const isDeleted = asBoolean(row.is_deleted ?? row.isDeleted);
    const folderId = row.folder_id ?? row.folderId ?? '';
    const checkedOutBy = row.checked_out_by ?? row.checkedOutBy ?? null;
    const checkedOutAt = row.checked_out_at ?? row.checkedOutAt ?? null;
    const checkedOutUntil = row.checked_out_until ?? row.checkedOutUntil ?? null;
    const checkoutNote = row.checkout_note ?? row.checkoutNote ?? null;
    const nextReviewAt = row.next_review_at ?? row.nextReviewAt ?? null;
    const renewalIntervalDays = row.renewal_interval_days ?? row.renewalIntervalDays ?? null;
    const cryptoScope = row.crypto_scope ?? row.cryptoScope ?? 'user';

    return {
        ...row,
        custom_fields: customFields,
        customFields,
        encryptedPassword: row.encrypted_password,
        owner: row.meta_person || '',
        tags,
        is_favorite: isFavorite,
        isFavorite,
        is_deleted: isDeleted,
        isDeleted,
        deletedAt: row.deleted_at || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
        folder_id: folderId || null,
        folderId,
        shareId: row.share_id || null,
        expiresAt: row.expires_at || null,
        sharedBy: row.shared_by || null,
        checkedOutBy,
        checked_out_by: checkedOutBy,
        checkedOutByName: row.checked_out_by_name ?? row.checkedOutByName ?? null,
        checked_out_by_name: row.checked_out_by_name ?? row.checkedOutByName ?? null,
        checkedOutAt,
        checked_out_at: checkedOutAt,
        checkedOutUntil,
        checked_out_until: checkedOutUntil,
        checkoutNote,
        checkout_note: checkoutNote,
        nextReviewAt,
        next_review_at: nextReviewAt,
        renewalIntervalDays: renewalIntervalDays === null || renewalIntervalDays === undefined
            ? null
            : Number(renewalIntervalDays),
        renewal_interval_days: renewalIntervalDays === null || renewalIntervalDays === undefined
            ? null
            : Number(renewalIntervalDays),
        cryptoScope,
        crypto_scope: cryptoScope,
    };
}

function normalizeVaultAttachment(row) {
    return {
        ...row,
        fileName: row.file_name ?? row.fileName ?? '',
        mimeType: row.mime_type ?? row.mimeType ?? 'application/octet-stream',
        sizeBytes: Number(row.size_bytes ?? row.sizeBytes ?? 0),
        encryptedData: row.encrypted_data ?? row.encryptedData ?? '',
        createdAt: row.created_at || row.createdAt || null,
        updatedAt: row.updated_at || row.updatedAt || null,
        vaultItemId: row.vault_item_id ?? row.vaultItemId ?? null,
    };
}

function normalizeShare(row) {
    return {
        ...row,
        expiresAt: row.expires_at ?? row.expiresAt ?? null,
        passwordTitle: row.password_title ?? row.passwordTitle ?? null,
        sharedWithName: row.shared_with_name ?? row.sharedWithName ?? row.name ?? null,
        sharedWith: row.shared_with ?? row.sharedWith ?? null,
    };
}

function normalizeNote(row) {
    const isFavorite = asBoolean(row.is_favorite ?? row.isFavorite);
    const isDeleted = asBoolean(row.is_deleted ?? row.isDeleted);

    return {
        ...row,
        is_favorite: isFavorite,
        isFavorite,
        is_deleted: isDeleted,
        isDeleted,
        deletedAt: row.deleted_at || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
        cryptoScope: row.crypto_scope ?? row.cryptoScope ?? 'user',
        crypto_scope: row.crypto_scope ?? row.cryptoScope ?? 'user',
    };
}

function normalizeInventoryItem(row) {
    return {
        ...row,
        assignedTo: row.assigned_to || '',
        createdAt: row.created_at || null,
        linkId: row.link_id || null,
        nextReviewAt: row.next_review_at || row.nextReviewAt || null,
        serial: row.serial_number || '',
        updatedAt: row.updated_at || null,
    };
}

function normalizeAuditLog(row) {
    return {
        ...row,
        details: parseJsonValue(row.details, row.details),
        createdAt: row.created_at || null,
    };
}

module.exports = {
    normalizeAuditLog,
    normalizeInventoryItem,
    normalizeNote,
    normalizeShare,
    normalizeVaultAttachment,
    normalizeVaultItem,
    parseArrayValue,
    parseJsonValue,
};
