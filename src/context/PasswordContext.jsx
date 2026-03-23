import CryptoJS from 'crypto-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from './AuthContext';
import { useVaultSecurity } from './VaultSecurityContext';
import { useUsage } from './UsageContext';
import { api } from '../lib/api';
import {
    buildEncryptedAttachmentPayload,
    MAX_ATTACHMENTS_PER_ITEM,
} from '../lib/attachments';
import { getVaultKey } from '../lib/env';
import {
    decryptCustomFieldsWithKey,
    decryptStringWithKey,
    encryptCustomFieldsWithKey,
    encryptStringWithKey,
} from '../lib/secretCrypto';
import {
    normalizeAuditLog,
    normalizePasswordAttachment,
    normalizePasswordItem,
    normalizeShare,
    normalizeTemplate,
    normalizeTags,
} from '../lib/modelAdapters';

const PasswordContext = createContext();

export function usePasswords() {
    const context = useContext(PasswordContext);
    if (!context) {
        throw new Error('usePasswords must be used within a PasswordProvider');
    }

    return context;
}

function encryptValue(value) {
    return encryptStringWithKey(value, getVaultKey());
}

function decryptValue(value) {
    return decryptStringWithKey(value, getVaultKey());
}

function encryptCustomFields(fields = []) {
    return encryptCustomFieldsWithKey(fields, getVaultKey());
}

function decryptCustomFields(fields = []) {
    return decryptCustomFieldsWithKey(fields, getVaultKey());
}

function hydratePassword(item, previousBreachCount = 0) {
    const normalized = normalizePasswordItem(item);
    const decryptedPassword = decryptValue(normalized.encryptedPassword);
    const decryptedCustomFields = decryptCustomFields(normalized.customFields);
    const share = normalized.permission
        ? {
            id: normalized.shareId,
            permission: normalized.permission,
            expiresAt: normalized.expiresAt,
            sharedBy: normalized.sharedBy,
        }
        : null;

    return {
        ...normalized,
        attachments: Array.isArray(normalized.attachments) ? normalized.attachments : [],
        breachCount: normalized.breachCount ?? previousBreachCount ?? 0,
        customFields: decryptedCustomFields,
        custom_fields: decryptedCustomFields,
        password: decryptedPassword,
        share,
    };
}

function buildPasswordPayload(password) {
    const renewalIntervalDays = password.renewalIntervalDays
        ?? password.renewal_interval_days
        ?? null;
    const nextReviewAt = password.nextReviewAt
        ?? password.next_review_at
        ?? null;

    return {
        custom_fields: encryptCustomFields(password.custom_fields ?? password.customFields ?? []),
        encrypted_password: encryptValue(password.password),
        folder_id: password.folderId ?? password.folder_id ?? null,
        is_favorite: Boolean(password.isFavorite ?? password.is_favorite),
        meta_person: password.owner ?? password.meta_person ?? password.notes ?? '',
        next_review_at: nextReviewAt || null,
        renewal_interval_days: renewalIntervalDays === '' || renewalIntervalDays === undefined
            ? null
            : Number(renewalIntervalDays),
        tags: normalizeTags(password.tags),
        title: password.title,
        url: password.website ?? password.url ?? '',
        username: password.username ?? '',
    };
}

function buildTemplatePayload(template) {
    return {
        custom_fields: template.custom_fields ?? template.customFields ?? [],
        meta_person: template.owner ?? template.meta_person ?? template.notes ?? '',
        name: template.name,
        renewal_interval_days: template.renewalIntervalDays ?? template.renewal_interval_days ?? null,
        tags: normalizeTags(template.tags),
        title: template.title,
        url: template.website ?? template.url ?? '',
        username: template.username ?? '',
    };
}

function summarizeAttachmentFailures(failures) {
    if (!Array.isArray(failures) || failures.length === 0) {
        return '';
    }

    if (failures.length === 1) {
        return failures[0].fileName;
    }

    return `${failures[0].fileName} y ${failures.length - 1} mas`;
}

export function PasswordProvider({ children }) {
    const { user } = useAuth();
    const { isVaultReady } = useVaultSecurity();
    const { trackCreate, trackDelete } = useUsage();
    const [passwords, setPasswords] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [shares, setShares] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [filterTag, setFilterTag] = useState(null);

    const refreshVault = useCallback(async () => {
        if (!user || !isVaultReady) {
            setPasswords([]);
            return [];
        }

        const items = await api.get('/vault');
        const nextItems = Array.isArray(items) ? items : [];

        setPasswords((previous) => {
            const breachMap = new Map(previous.map((item) => [item.id, item.breachCount || 0]));
            return nextItems.map((item) => hydratePassword(item, breachMap.get(item.id)));
        });

        return nextItems;
    }, [isVaultReady, user]);

    const refreshShares = useCallback(async () => {
        if (!user || !isVaultReady) {
            setShares([]);
            return [];
        }

        const data = await api.get('/shares/internal/outgoing');
        const nextShares = (Array.isArray(data) ? data : []).map(normalizeShare);
        setShares(nextShares);
        return nextShares;
    }, [isVaultReady, user]);

    const fetchAuditLogs = useCallback(async () => {
        if (!user || !isVaultReady) {
            setAuditLogs([]);
            return [];
        }

        const items = await api.get('/audit');
        const nextLogs = (Array.isArray(items) ? items : []).map(normalizeAuditLog);
        setAuditLogs(nextLogs);
        return nextLogs;
    }, [isVaultReady, user]);

    const refreshTemplates = useCallback(async () => {
        if (!user || !isVaultReady) {
            setTemplates([]);
            return [];
        }

        const data = await api.get('/templates');
        const nextTemplates = (Array.isArray(data) ? data : [])
            .map(normalizeTemplate)
            .filter(Boolean);
        setTemplates(nextTemplates);
        return nextTemplates;
    }, [isVaultReady, user]);

    useEffect(() => {
        if (!user || !isVaultReady) {
            setPasswords([]);
            setShares([]);
            setAuditLogs([]);
            setTemplates([]);
            return;
        }

        Promise.all([refreshVault(), refreshShares(), fetchAuditLogs(), refreshTemplates()]).catch((error) => {
            console.error('Error loading vault data', error);
            toast.error(error.message || 'No se pudo cargar la boveda');
        });
    }, [fetchAuditLogs, isVaultReady, refreshShares, refreshTemplates, refreshVault, user]);

    const getPasswordAttachments = async (passwordId) => {
        try {
            const data = await api.get(`/vault/${passwordId}/attachments`);
            return (Array.isArray(data) ? data : [])
                .map(normalizePasswordAttachment)
                .filter(Boolean);
        } catch (error) {
            console.error('Error loading attachments', error);
            throw error;
        }
    };

    const uploadPasswordAttachment = async (passwordId, file, options = {}) => {
        const { quiet = false } = options;
        const payload = await buildEncryptedAttachmentPayload(file);
        const data = await api.post(`/vault/${passwordId}/attachments`, payload);
        const attachment = normalizePasswordAttachment(data);

        if (!quiet) {
            toast.success(`Adjunto ${attachment.fileName} subido`);
        }

        return attachment;
    };

    const deletePasswordAttachment = async (passwordId, attachmentId, options = {}) => {
        const { quiet = false } = options;
        await api.delete(`/vault/${passwordId}/attachments/${attachmentId}`);

        if (!quiet) {
            toast.success('Adjunto eliminado');
        }
    };

    const processAttachmentChanges = async (
        passwordId,
        { attachments = [], attachmentsToAdd = [], attachmentsToDelete = [] } = {}
    ) => {
        const filesToAdd = [...attachmentsToAdd, ...attachments].filter(Boolean);
        const idsToDelete = attachmentsToDelete.filter(Boolean);
        const failures = [];

        for (const attachmentId of idsToDelete) {
            try {
                await deletePasswordAttachment(passwordId, attachmentId, { quiet: true });
            } catch (error) {
                failures.push({
                    action: 'delete',
                    fileName: attachmentId,
                    message: error.message || 'No se pudo eliminar el adjunto',
                });
            }
        }

        for (const file of filesToAdd) {
            try {
                await uploadPasswordAttachment(passwordId, file, { quiet: true });
            } catch (error) {
                failures.push({
                    action: 'upload',
                    fileName: file.name,
                    message: error.message || 'No se pudo subir el adjunto',
                });
            }
        }

        return {
            failures,
            processedCount: filesToAdd.length + idsToDelete.length,
        };
    };

    const addPassword = async (newPassword) => {
        try {
            const attachments = Array.isArray(newPassword.attachments) ? newPassword.attachments : [];
            if (attachments.length > MAX_ATTACHMENTS_PER_ITEM) {
                throw new Error(`Maximo ${MAX_ATTACHMENTS_PER_ITEM} adjuntos por contrasena`);
            }

            const created = await api.post('/vault', buildPasswordPayload(newPassword));
            const attachmentResult = await processAttachmentChanges(created.id, { attachments });

            await refreshVault();
            await fetchAuditLogs();
            trackCreate();

            if (attachmentResult.failures.length > 0) {
                toast.success('Contrasena guardada');
                toast.error(`Algunos adjuntos no se subieron: ${summarizeAttachmentFailures(attachmentResult.failures)}`);
            } else {
                toast.success('Contrasena guardada');
            }

            return {
                success: true,
                partial: attachmentResult.failures.length > 0,
                item: hydratePassword(created),
                attachmentFailures: attachmentResult.failures,
            };
        } catch (error) {
            console.error('Error adding password', error);
            toast.error(error.message || 'No se pudo guardar la contrasena');
            return { success: false, error: error.message };
        }
    };

    const bulkAddPasswords = async (items) => {
        const toastId = toast.loading('Encriptando e importando...');

        try {
            const payload = items.map((item) => buildPasswordPayload({
                ...item,
                custom_fields: item.custom_fields ?? item.customFields ?? [],
                notes: item.meta_person ?? item.owner ?? item.notes ?? '',
                tags: item.tags ?? [],
            }));

            const response = await api.post('/vault/import', { items: payload });
            await refreshVault();
            await fetchAuditLogs();
            trackCreate();
            toast.success(`Importadas ${response?.count || payload.length} contrasenas`, { id: toastId });
            return { success: true };
        } catch (error) {
            console.error('Bulk import failed', error);
            toast.error(error.message || 'Error al importar el archivo', { id: toastId });
            return { success: false, error: error.message };
        }
    };

    const updatePassword = async (id, updates) => {
        const current = passwords.find((item) => item.id === id);
        if (!current) {
            return { success: false, error: 'Contrasena no encontrada' };
        }

        const merged = {
            ...current,
            ...updates,
            custom_fields: updates.custom_fields ?? updates.customFields ?? current.custom_fields,
            folderId: updates.folderId ?? updates.folder_id ?? current.folderId,
            isFavorite: updates.isFavorite ?? updates.is_favorite ?? current.isFavorite,
            meta_person: updates.meta_person ?? updates.owner ?? updates.notes ?? current.meta_person,
            password: updates.password ?? current.password,
            tags: updates.tags ?? current.tags,
        };

        const newAttachments = Array.isArray(updates.attachmentsToAdd) ? updates.attachmentsToAdd : [];
        const attachmentDeleteIds = Array.isArray(updates.attachmentsToDelete) ? updates.attachmentsToDelete : [];
        const totalAttachments = (updates.existingAttachmentsCount ?? 0) - attachmentDeleteIds.length + newAttachments.length;

        if (totalAttachments > MAX_ATTACHMENTS_PER_ITEM) {
            return { success: false, error: `Maximo ${MAX_ATTACHMENTS_PER_ITEM} adjuntos por contrasena` };
        }

        try {
            await api.put(`/vault/${id}`, buildPasswordPayload(merged));
            const attachmentResult = await processAttachmentChanges(id, {
                attachmentsToAdd: newAttachments,
                attachmentsToDelete: attachmentDeleteIds,
            });

            await refreshVault();
            await fetchAuditLogs();

            if (attachmentResult.failures.length > 0) {
                toast.success('Contrasena actualizada');
                toast.error(`Algunos adjuntos no se procesaron: ${summarizeAttachmentFailures(attachmentResult.failures)}`);
            } else {
                toast.success('Contrasena actualizada');
            }

            return {
                success: true,
                partial: attachmentResult.failures.length > 0,
                attachmentFailures: attachmentResult.failures,
            };
        } catch (error) {
            console.error('Error updating password', error);
            toast.error(error.message || 'No se pudo actualizar la contrasena');
            return { success: false, error: error.message };
        }
    };

    const duplicatePassword = async (id, options = {}) => {
        try {
            const response = await api.post(`/vault/${id}/duplicate`, options.title ? { title: options.title } : {});
            await refreshVault();
            await fetchAuditLogs();
            toast.success('Contrasena duplicada');
            return { success: true, item: hydratePassword(response) };
        } catch (error) {
            console.error('Error duplicating password', error);
            toast.error(error.message || 'No se pudo duplicar la contrasena');
            return { success: false, error: error.message };
        }
    };

    const checkoutPassword = async (id, payload = {}) => {
        try {
            const response = await api.post(`/vault/${id}/checkout`, payload);
            await refreshVault();
            await fetchAuditLogs();
            toast.success('Credencial reservada');
            return { success: true, item: hydratePassword(response) };
        } catch (error) {
            console.error('Error checking out password', error);
            toast.error(error.message || 'No se pudo reservar la credencial');
            return { success: false, error: error.message };
        }
    };

    const checkinPassword = async (id) => {
        try {
            const response = await api.post(`/vault/${id}/checkin`, {});
            await refreshVault();
            await fetchAuditLogs();
            toast.success('Credencial liberada');
            return { success: true, item: hydratePassword(response) };
        } catch (error) {
            console.error('Error checking in password', error);
            toast.error(error.message || 'No se pudo liberar la credencial');
            return { success: false, error: error.message };
        }
    };

    const getLinkedDevices = async (passwordId) => {
        try {
            const data = await api.get(`/vault/${passwordId}/linked-devices`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error loading linked devices', error);
            throw error;
        }
    };

    const linkDeviceToPassword = async (passwordId, deviceId) => {
        try {
            const response = await api.post(`/vault/${passwordId}/linked-devices`, { device_id: deviceId });
            toast.success('Dispositivo vinculado');
            return { success: true, link: response };
        } catch (error) {
            console.error('Error linking device', error);
            toast.error(error.message || 'No se pudo vincular el dispositivo');
            return { success: false, error: error.message };
        }
    };

    const unlinkDeviceFromPassword = async (passwordId, linkId) => {
        try {
            await api.delete(`/vault/${passwordId}/linked-devices/${linkId}`);
            toast.success('Dispositivo desvinculado');
            return { success: true };
        } catch (error) {
            console.error('Error unlinking device', error);
            toast.error(error.message || 'No se pudo desvincular el dispositivo');
            return { success: false, error: error.message };
        }
    };

    const createTemplate = async (template) => {
        try {
            const response = await api.post('/templates', buildTemplatePayload(template));
            const normalized = normalizeTemplate(response);
            setTemplates((previous) => [normalized, ...previous]);
            toast.success('Plantilla guardada');
            return { success: true, template: normalized };
        } catch (error) {
            console.error('Error creating template', error);
            toast.error(error.message || 'No se pudo guardar la plantilla');
            return { success: false, error: error.message };
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await api.delete(`/templates/${id}`);
            setTemplates((previous) => previous.filter((template) => template.id !== id));
            toast.success('Plantilla eliminada');
            return { success: true };
        } catch (error) {
            console.error('Error deleting template', error);
            toast.error(error.message || 'No se pudo eliminar la plantilla');
            return { success: false, error: error.message };
        }
    };

    const toggleFavorite = async (id) => {
        const current = passwords.find((item) => item.id === id);
        if (!current) {
            return;
        }

        await updatePassword(id, { isFavorite: !current.isFavorite });
    };

    const deletePassword = async (id) => {
        try {
            await api.delete(`/vault/${id}`);
            await refreshVault();
            trackDelete();
            toast.success('Contrasena movida a papelera');
        } catch (error) {
            console.error('Error deleting password', error);
            toast.error(error.message || 'No se pudo eliminar la contrasena');
        }
    };

    const restorePassword = async (id) => {
        try {
            await api.put(`/vault/${id}/restore`);
            await refreshVault();
            toast.success('Contrasena restaurada');
        } catch (error) {
            console.error('Error restoring password', error);
            toast.error(error.message || 'No se pudo restaurar la contrasena');
        }
    };

    const permanentlyDeletePassword = async (id) => {
        try {
            await api.delete(`/vault/${id}?force=true`);
            await refreshVault();
            toast.success('Contrasena eliminada definitivamente');
        } catch (error) {
            console.error('Error permanently deleting password', error);
            toast.error(error.message || 'No se pudo eliminar la contrasena');
        }
    };

    const getPasswordHistory = async (id) => {
        try {
            const history = await api.get(`/vault/${id}/history`);
            return (Array.isArray(history) ? history : []).map((item) => ({
                ...item,
                changedAt: item.changedAt ?? item.changed_at,
                changed_at: item.changedAt ?? item.changed_at,
                password: decryptValue(item.encrypted_password),
            }));
        } catch (error) {
            console.error('Error loading password history', error);
            toast.error(error.message || 'No se pudo cargar el historial');
            return [];
        }
    };

    const getPasswordChangeLog = async (id) => {
        try {
            const history = await api.get(`/vault/${id}/change-log`);
            return Array.isArray(history) ? history : [];
        } catch (error) {
            console.error('Error loading password change log', error);
            toast.error(error.message || 'No se pudo cargar el historial de cambios');
            return [];
        }
    };

    const getExportablePasswords = async () => {
        const data = await api.get('/vault/export');
        return (Array.isArray(data) ? data : []).map((item) => {
            const hydrated = hydratePassword(item);
            const attachments = (Array.isArray(item.attachments) ? item.attachments : [])
                .map(normalizePasswordAttachment)
                .filter(Boolean);

            return {
                ...hydrated,
                attachments,
            };
        });
    };

    const getSharedPasswords = useCallback(() =>
        passwords.filter((item) => item.permission).map((item) => ({
            ...item,
            share: item.share || {
                id: item.shareId,
                permission: item.permission,
                expiresAt: item.expiresAt,
                sharedBy: item.sharedBy,
            },
        })), [passwords]);

    const updateShareAccess = useCallback(async () => null, []);

    const sharePassword = async (passwordId, targetId, permission, expiresIn) => {
        try {
            await api.post('/shares/internal', { passwordId, targetId, permission, expiresIn });
            await refreshShares();
            await refreshVault();
            return { success: true };
        } catch (error) {
            console.error('Error sharing password', error);
            toast.error(error.message || 'No se pudo compartir la contrasena');
            return { success: false, error: error.message };
        }
    };

    const revokeShare = async (shareId) => {
        try {
            await api.delete(`/shares/internal/${shareId}`);
            await refreshShares();
            await refreshVault();
            toast.success('Acceso revocado');
        } catch (error) {
            console.error('Error revoking share', error);
            toast.error(error.message || 'No se pudo revocar el acceso');
        }
    };

    const getPasswordShares = (passwordId) =>
        shares.filter((share) => share.passwordId === passwordId);

    const checkPasswordBreach = async (password) => {
        try {
            if (!password) {
                return 0;
            }

            const sha1 = CryptoJS.SHA1(password).toString(CryptoJS.enc.Hex).toUpperCase();
            const prefix = sha1.slice(0, 5);
            const suffix = sha1.slice(5);
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);

            if (!response.ok) {
                throw new Error('HIBP API Error');
            }

            const text = await response.text();
            const match = text.split('\n').find((line) => line.startsWith(suffix));
            return match ? Number.parseInt(match.split(':')[1], 10) : 0;
        } catch (error) {
            console.error('Error checking password breach', error);
            return -1;
        }
    };

    const checkAllPasswordsForBreaches = async (onProgress) => {
        const activePasswords = passwords.filter((item) => !item.isDeleted);
        const updates = new Map();

        for (const [index, item] of activePasswords.entries()) {
            const count = await checkPasswordBreach(item.password);
            updates.set(item.id, count > 0 ? count : 0);

            if (onProgress) {
                onProgress({
                    current: index + 1,
                    total: activePasswords.length,
                    percentage: activePasswords.length > 0
                        ? ((index + 1) / activePasswords.length) * 100
                        : 100,
                });
            }

            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        setPasswords((previous) =>
            previous.map((item) => ({
                ...item,
                breachCount: updates.get(item.id) ?? 0,
            }))
        );

        const compromised = [...updates.values()].filter((value) => value > 0).length;
        if (compromised > 0) {
            toast.error(`Se encontraron ${compromised} contrasenas comprometidas`, { duration: 5000 });
        } else {
            toast.success('Analisis completado: no se encontraron filtraciones', { duration: 5000 });
        }
    };

    return (
        <PasswordContext.Provider
            value={{
                addPassword,
                auditLogs,
                bulkAddPasswords,
                checkinPassword,
                checkAllPasswordsForBreaches,
                checkPasswordBreach,
                checkPasswordForBreach: checkPasswordBreach,
                checkoutPassword,
                createTemplate,
                deletePassword,
                deletePasswordAttachment,
                deleteTemplate,
                duplicatePassword,
                fetchAuditLogs,
                filterTag,
                getExportablePasswords,
                getPasswordAttachments,
                getPasswordChangeLog,
                getPasswordHistory,
                getPasswordShares,
                getLinkedDevices,
                getSharedPasswords,
                linkDeviceToPassword,
                passwords,
                permanentlyDeletePassword,
                refreshShares,
                refreshTemplates,
                refreshVault,
                restorePassword,
                revokeShare,
                setFilterTag,
                sharePassword,
                shares,
                templates,
                toggleFavorite,
                unlinkDeviceFromPassword,
                updatePassword,
                updateShareAccess,
                uploadPasswordAttachment,
            }}
        >
            {children}
        </PasswordContext.Provider>
    );
}
