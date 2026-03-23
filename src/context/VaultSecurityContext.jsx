import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import {
    clearRuntimeCryptoConfig,
    hasRuntimeCryptoConfig,
    setRuntimeCryptoConfig,
} from '../lib/env';
import {
    createWrappedVaultSecrets,
    createWrappedVaultSecretsFromExistingKeys,
    decryptCustomFieldsWithKey,
    decryptStringWithKey,
    encryptCustomFieldsWithKey,
    encryptStringWithKey,
    unwrapVaultSecrets,
} from '../lib/secretCrypto';
import { normalizeNote, normalizePasswordItem } from '../lib/modelAdapters';

const TEAM_INVITATION_CHECK = 'securevault:team-vault-invitation:v1';

const VaultSecurityContext = createContext();

function buildLegacyMigrationPayload({
    legacyNotes,
    legacyNotesKey,
    legacyPasswordHistory,
    legacyVaultItems,
    legacyVaultKey,
    nextNotesKey,
    nextVaultKey,
}) {
    const vaultItems = legacyVaultItems.map((item) => {
        const normalized = normalizePasswordItem(item);
        const decryptedCustomFields = decryptCustomFieldsWithKey(normalized.customFields, legacyVaultKey);

        return {
            custom_fields: encryptCustomFieldsWithKey(decryptedCustomFields, nextVaultKey),
            encrypted_password: encryptStringWithKey(
                decryptStringWithKey(normalized.encryptedPassword, legacyVaultKey),
                nextVaultKey
            ),
            id: normalized.id,
        };
    });

    const attachments = legacyVaultItems.flatMap((item) => {
        const normalized = normalizePasswordItem(item);
        return normalized.attachments.map((attachment) => ({
            encrypted_data: encryptStringWithKey(
                decryptStringWithKey(attachment.encryptedData, legacyVaultKey),
                nextVaultKey
            ),
            id: attachment.id,
        }));
    });

    const notes = legacyNotes.map((note) => {
        const normalized = normalizeNote(note);
        return {
            content: encryptStringWithKey(
                decryptStringWithKey(normalized.content, legacyNotesKey),
                nextNotesKey
            ),
            id: normalized.id,
        };
    });

    const passwordHistory = legacyPasswordHistory.map((entry) => ({
        encrypted_password: encryptStringWithKey(
            decryptStringWithKey(entry.encrypted_password, legacyVaultKey),
            nextVaultKey
        ),
        id: entry.id,
    }));

    return {
        attachments,
        notes,
        passwordHistory,
        vaultItems,
    };
}

async function loadLegacyMigrationPayload(vaultAccess, nextKeys) {
    if (!vaultAccess?.migrationRequired) {
        return {
            attachments: [],
            notes: [],
            passwordHistory: [],
            vaultItems: [],
        };
    }

    const [legacyCrypto, legacyVaultItems, legacyNotes, legacyPasswordHistory] = await Promise.all([
        api.get('/auth/legacy-client-crypto'),
        api.get('/vault/export?migrationOnly=true'),
        api.get('/notes?migrationOnly=true'),
        api.get('/vault/history/export?migrationOnly=true'),
    ]);

    return buildLegacyMigrationPayload({
        legacyNotes: Array.isArray(legacyNotes) ? legacyNotes : [],
        legacyNotesKey: legacyCrypto.notesKey,
        legacyPasswordHistory: Array.isArray(legacyPasswordHistory) ? legacyPasswordHistory : [],
        legacyVaultItems: Array.isArray(legacyVaultItems) ? legacyVaultItems : [],
        legacyVaultKey: legacyCrypto.vaultKey,
        nextNotesKey: nextKeys.notesKey,
        nextVaultKey: nextKeys.vaultKey,
    });
}

function unwrapTeamInvitation(invitation, invitationSecret) {
    const decryptedVerifier = decryptStringWithKey(invitation?.encryptedVerifier, invitationSecret);
    if (decryptedVerifier !== TEAM_INVITATION_CHECK) {
        throw new Error('Codigo de invitacion invalido');
    }

    const vaultKey = decryptStringWithKey(invitation?.encryptedVaultKey, invitationSecret);
    const notesKey = decryptStringWithKey(invitation?.encryptedNotesKey, invitationSecret);
    if (!vaultKey || !notesKey) {
        throw new Error('Codigo de invitacion invalido');
    }

    return {
        notesKey,
        vaultKey,
    };
}

export function useVaultSecurity() {
    const context = useContext(VaultSecurityContext);
    if (!context) {
        throw new Error('useVaultSecurity must be used within a VaultSecurityProvider');
    }

    return context;
}

export function VaultSecurityProvider({ children }) {
    const { isAuthenticated, logout, setVaultAccess, user, vaultAccess } = useAuth();
    const [isVaultReady, setIsVaultReady] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            clearRuntimeCryptoConfig();
            setIsVaultReady(false);
            return;
        }

        if (!vaultAccess?.isConfigured) {
            clearRuntimeCryptoConfig();
            setIsVaultReady(false);
            return;
        }

        setIsVaultReady(hasRuntimeCryptoConfig());
    }, [
        isAuthenticated,
        user,
        vaultAccess?.isConfigured,
        vaultAccess?.kdf?.salt,
        vaultAccess?.wrappedKeys?.notes,
        vaultAccess?.wrappedKeys?.vault,
        vaultAccess?.teamInitialized,
    ]);

    const lockVault = useCallback(() => {
        clearRuntimeCryptoConfig();
        setIsVaultReady(false);
        toast('Boveda bloqueada');
    }, []);

    const unlockVault = useCallback(async (masterPassword) => {
        if (!vaultAccess?.isConfigured) {
            return { success: false, error: 'La cuenta todavia no tiene acceso configurado a la boveda del equipo' };
        }

        try {
            const keys = unwrapVaultSecrets(masterPassword, vaultAccess);
            setRuntimeCryptoConfig(keys);

            if (vaultAccess?.needsTeamBootstrap) {
                const response = await api.post('/auth/team-vault/bootstrap', {});
                setVaultAccess(response.vaultAccess || null);
                toast.success('Boveda de equipo inicializada');
            } else {
                toast.success('Boveda desbloqueada');
            }

            setIsVaultReady(true);
            return { success: true };
        } catch (error) {
            clearRuntimeCryptoConfig();
            setIsVaultReady(false);
            const message = error.message || 'No se pudo desbloquear la boveda';
            toast.error(message);
            return { success: false, error: message };
        }
    }, [setVaultAccess, vaultAccess]);

    const setupMasterPassword = useCallback(async (masterPassword) => {
        if (!user) {
            return { success: false, error: 'Sesion no disponible' };
        }

        if (!vaultAccess?.canInitialize && !vaultAccess?.needsTeamBootstrap) {
            return { success: false, error: 'Solo un administrador puede inicializar la boveda del equipo' };
        }

        if (masterPassword.length < 12) {
            return { success: false, error: 'La master password debe tener al menos 12 caracteres' };
        }

        try {
            const wrappedSecrets = createWrappedVaultSecrets(masterPassword);
            const migration = await loadLegacyMigrationPayload(vaultAccess, wrappedSecrets.keys);

            const response = await api.post('/auth/vault/setup', {
                kdfIterations: wrappedSecrets.metadata.kdf.iterations,
                kdfSalt: wrappedSecrets.metadata.kdf.salt,
                migration,
                notesKeyVerifier: wrappedSecrets.metadata.notesKeyVerifier,
                vaultKeyVerifier: wrappedSecrets.metadata.vaultKeyVerifier,
                wrappedNotesKey: wrappedSecrets.metadata.wrappedNotesKey,
                wrappedVaultKey: wrappedSecrets.metadata.wrappedVaultKey,
            });

            setRuntimeCryptoConfig(wrappedSecrets.keys);
            setVaultAccess(response.vaultAccess || null);
            setIsVaultReady(true);
            toast.success(
                vaultAccess?.migrationRequired
                    ? 'Boveda de equipo configurada y datos migrados'
                    : 'Boveda de equipo configurada'
            );

            return { success: true };
        } catch (error) {
            const message = error.message || 'No se pudo configurar la master password';
            toast.error(message);
            return { success: false, error: message };
        }
    }, [setVaultAccess, user, vaultAccess]);

    const acceptTeamVaultInvitation = useCallback(async ({ invitationSecret, masterPassword }) => {
        if (!user) {
            return { success: false, error: 'Sesion no disponible' };
        }

        if (masterPassword.length < 12) {
            return { success: false, error: 'La master password debe tener al menos 12 caracteres' };
        }

        if (vaultAccess?.legacyPersonalVault && vaultAccess?.migrationRequired) {
            return {
                success: false,
                error: 'Esta cuenta tiene datos cifrados con una vault personal anterior. Deben migrarse primero desde esa cuenta antes de unirse a la boveda del equipo.',
            };
        }

        try {
            const invitationResponse = await api.get('/auth/team-vault/invitation');
            const invitation = invitationResponse?.invitation;
            const teamKeys = unwrapTeamInvitation(invitation, invitationSecret);
            const wrappedSecrets = createWrappedVaultSecretsFromExistingKeys(masterPassword, teamKeys);
            const migration = await loadLegacyMigrationPayload(vaultAccess, wrappedSecrets.keys);

            const response = await api.post('/auth/team-vault/accept', {
                invitationId: invitation.id,
                kdfIterations: wrappedSecrets.metadata.kdf.iterations,
                kdfSalt: wrappedSecrets.metadata.kdf.salt,
                migration,
                notesKeyVerifier: wrappedSecrets.metadata.notesKeyVerifier,
                vaultKeyVerifier: wrappedSecrets.metadata.vaultKeyVerifier,
                wrappedNotesKey: wrappedSecrets.metadata.wrappedNotesKey,
                wrappedVaultKey: wrappedSecrets.metadata.wrappedVaultKey,
            });

            setRuntimeCryptoConfig(wrappedSecrets.keys);
            setVaultAccess(response.vaultAccess || null);
            setIsVaultReady(true);
            toast.success('Acceso a la boveda del equipo configurado');
            return { success: true };
        } catch (error) {
            clearRuntimeCryptoConfig();
            setIsVaultReady(false);
            const message = error.message || 'No se pudo aceptar la invitacion de la boveda';
            toast.error(message);
            return { success: false, error: message };
        }
    }, [setVaultAccess, user, vaultAccess]);

    const value = useMemo(() => ({
        acceptTeamVaultInvitation,
        awaitingTeamVaultAccess: Boolean(
            isAuthenticated &&
            user &&
            vaultAccess?.teamInitialized &&
            !vaultAccess?.isConfigured &&
            !vaultAccess?.invitationPending
        ),
        isVaultLocked: Boolean(isAuthenticated && user && vaultAccess?.isConfigured && !isVaultReady),
        isVaultReady,
        lockVault,
        logout,
        requiresTeamVaultInvitation: Boolean(
            isAuthenticated &&
            user &&
            vaultAccess?.teamInitialized &&
            !vaultAccess?.isConfigured &&
            vaultAccess?.invitationPending
        ),
        requiresVaultMigration: Boolean(vaultAccess?.migrationRequired),
        requiresVaultSetup: Boolean(
            isAuthenticated &&
            user &&
            !vaultAccess?.teamInitialized &&
            !vaultAccess?.isConfigured &&
            vaultAccess?.canInitialize
        ),
        setupMasterPassword,
        unlockVault,
        vaultAccess,
    }), [
        acceptTeamVaultInvitation,
        isAuthenticated,
        isVaultReady,
        lockVault,
        logout,
        setupMasterPassword,
        unlockVault,
        user,
        vaultAccess,
    ]);

    return (
        <VaultSecurityContext.Provider value={value}>
            {children}
        </VaultSecurityContext.Provider>
    );
}
