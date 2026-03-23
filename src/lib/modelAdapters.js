const DEFAULT_TAG_COLOR = 'slate';

function toBoolean(value) {
    return value === true || value === 1 || value === '1';
}

function parseJson(value, fallback) {
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

function normalizeTag(tag) {
    if (!tag) {
        return null;
    }

    if (typeof tag === 'string') {
        const name = tag.trim().toLowerCase();
        return name ? { name, color: DEFAULT_TAG_COLOR } : null;
    }

    if (typeof tag === 'object') {
        const rawName = typeof tag.name === 'string' ? tag.name : '';
        const name = rawName.trim().toLowerCase();
        if (!name) {
            return null;
        }

        return {
            ...tag,
            name,
            color: typeof tag.color === 'string' && tag.color ? tag.color : DEFAULT_TAG_COLOR,
        };
    }

    return null;
}

export function normalizeTags(tags) {
    const parsed = parseJson(tags, []);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed.map(normalizeTag).filter(Boolean);
}

export function normalizeCustomFields(fields) {
    const parsed = parseJson(fields, []);
    return Array.isArray(parsed) ? parsed : [];
}

export function normalizePasswordAttachment(attachment) {
    if (!attachment || typeof attachment !== 'object') {
        return null;
    }

    const fileName = attachment.fileName ?? attachment.file_name ?? '';
    if (!fileName) {
        return null;
    }

    const mimeType = attachment.mimeType ?? attachment.mime_type ?? 'application/octet-stream';
    const sizeBytes = Number(attachment.sizeBytes ?? attachment.size_bytes ?? 0);
    const encryptedData = attachment.encryptedData ?? attachment.encrypted_data ?? '';
    const createdAt = attachment.createdAt ?? attachment.created_at ?? null;
    const updatedAt = attachment.updatedAt ?? attachment.updated_at ?? null;

    return {
        ...attachment,
        fileName,
        file_name: fileName,
        mimeType,
        mime_type: mimeType,
        sizeBytes,
        size_bytes: sizeBytes,
        encryptedData,
        encrypted_data: encryptedData,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
    };
}

export function normalizePasswordItem(item) {
    const owner = item.owner ?? item.meta_person ?? '';
    const tags = normalizeTags(item.tags);
    const customFields = normalizeCustomFields(item.customFields ?? item.custom_fields);
    const attachments = parseJson(item.attachments, [])
        .map(normalizePasswordAttachment)
        .filter(Boolean);
    const isFavorite = toBoolean(item.isFavorite ?? item.is_favorite);
    const isDeleted = toBoolean(item.isDeleted ?? item.is_deleted);
    const folderId = item.folderId ?? item.folder_id ?? '';
    const shareId = item.shareId ?? item.share_id ?? null;
    const permission = item.permission ?? null;
    const expiresAt = item.expiresAt ?? item.expires_at ?? null;
    const sharedBy = item.sharedBy ?? item.shared_by ?? null;
    const checkedOutBy = item.checkedOutBy ?? item.checked_out_by ?? null;
    const checkedOutByName = item.checkedOutByName ?? item.checked_out_by_name ?? null;
    const checkedOutAt = item.checkedOutAt ?? item.checked_out_at ?? null;
    const checkedOutUntil = item.checkedOutUntil ?? item.checked_out_until ?? null;
    const checkoutNote = item.checkoutNote ?? item.checkout_note ?? null;
    const nextReviewAt = item.nextReviewAt ?? item.next_review_at ?? null;
    const renewalIntervalDaysRaw = item.renewalIntervalDays ?? item.renewal_interval_days ?? null;
    const createdAt = item.createdAt ?? item.created_at ?? null;
    const updatedAt = item.updatedAt ?? item.updated_at ?? null;
    const deletedAt = item.deletedAt ?? item.deleted_at ?? null;
    const encryptedPassword = item.encryptedPassword ?? item.encrypted_password ?? '';
    const renewalIntervalDays = renewalIntervalDaysRaw === null || renewalIntervalDaysRaw === undefined
        ? null
        : Number(renewalIntervalDaysRaw);

    return {
        ...item,
        owner,
        meta_person: owner,
        tags,
        customFields,
        custom_fields: customFields,
        attachments,
        isFavorite,
        is_favorite: isFavorite,
        isDeleted,
        is_deleted: isDeleted,
        folderId,
        folder_id: folderId || null,
        shareId,
        share_id: shareId,
        permission,
        expiresAt,
        expires_at: expiresAt,
        sharedBy,
        shared_by: sharedBy,
        checkedOutBy,
        checked_out_by: checkedOutBy,
        checkedOutByName,
        checked_out_by_name: checkedOutByName,
        checkedOutAt,
        checked_out_at: checkedOutAt,
        checkedOutUntil,
        checked_out_until: checkedOutUntil,
        checkoutNote,
        checkout_note: checkoutNote,
        nextReviewAt,
        next_review_at: nextReviewAt,
        renewalIntervalDays,
        renewal_interval_days: renewalIntervalDays,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
        deletedAt,
        deleted_at: deletedAt,
        encryptedPassword,
        encrypted_password: encryptedPassword,
    };
}

export function normalizeNote(note) {
    const isFavorite = toBoolean(note.isFavorite ?? note.is_favorite);
    const isDeleted = toBoolean(note.isDeleted ?? note.is_deleted);
    const createdAt = note.createdAt ?? note.created_at ?? null;
    const updatedAt = note.updatedAt ?? note.updated_at ?? null;
    const deletedAt = note.deletedAt ?? note.deleted_at ?? null;

    return {
        ...note,
        isFavorite,
        is_favorite: isFavorite,
        isDeleted,
        is_deleted: isDeleted,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
        deletedAt,
        deleted_at: deletedAt,
    };
}

export function normalizeInventoryItem(item) {
    const serial = item.serial ?? item.serial_number ?? '';
    const assignedTo = item.assignedTo ?? item.assigned_to ?? '';
    const linkId = item.linkId ?? item.link_id ?? null;
    const nextReviewAt = item.nextReviewAt ?? item.next_review_at ?? null;
    const createdAt = item.createdAt ?? item.created_at ?? null;
    const updatedAt = item.updatedAt ?? item.updated_at ?? null;
    const history = Array.isArray(item.history) ? item.history : [];

    return {
        ...item,
        serial,
        serial_number: serial,
        assignedTo,
        assigned_to: assignedTo,
        linkId,
        link_id: linkId,
        nextReviewAt,
        next_review_at: nextReviewAt,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
        history,
    };
}

export function normalizeShare(share) {
    const expiresAt = share.expiresAt ?? share.expires_at ?? null;
    const sharedWith = share.sharedWith ?? share.shared_with ?? null;
    const passwordId = share.passwordId ?? share.password_id ?? null;
    const sharedWithName = share.sharedWithName ?? share.shared_with_name ?? share.name ?? null;
    const passwordTitle = share.passwordTitle ?? share.password_title ?? null;

    return {
        ...share,
        expiresAt,
        expires_at: expiresAt,
        sharedWith,
        shared_with: sharedWith,
        sharedWithName,
        shared_with_name: sharedWithName,
        passwordTitle,
        password_title: passwordTitle,
        passwordId,
        password_id: passwordId,
    };
}

export function normalizeAuditLog(log) {
    const createdAt = log.createdAt ?? log.created_at ?? null;
    const entityType = log.entityType ?? log.entity_type ?? null;

    return {
        ...log,
        createdAt,
        created_at: createdAt,
        entityType,
        entity_type: entityType,
    };
}

export function normalizeTemplate(template) {
    if (!template || typeof template !== 'object') {
        return null;
    }

    const tags = normalizeTags(template.tags);
    const customFields = normalizeCustomFields(template.customFields ?? template.custom_fields);
    const owner = template.owner ?? template.meta_person ?? '';
    const renewalIntervalDaysRaw = template.renewalIntervalDays ?? template.renewal_interval_days ?? null;
    const renewalIntervalDays = renewalIntervalDaysRaw === null || renewalIntervalDaysRaw === undefined
        ? null
        : Number(renewalIntervalDaysRaw);

    return {
        ...template,
        owner,
        meta_person: owner,
        tags,
        customFields,
        custom_fields: customFields,
        renewalIntervalDays,
        renewal_interval_days: renewalIntervalDays,
    };
}
