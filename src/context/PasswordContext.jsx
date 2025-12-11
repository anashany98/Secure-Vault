import { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { useAuth } from './AuthContext';
import { useUsage } from './UsageContext';
import { checkPasswordBreach } from '../lib/breachDetection';

const PasswordContext = createContext();

export const usePasswords = () => useContext(PasswordContext);

const ENCRYPTION_KEY = 'demo-secret-key-change-this-in-prod';
const AUDIT_KEY = 'secure_vault_audit_log';
const SHARES_KEY = 'secure_vault_shares';

export const PasswordProvider = ({ children }) => {
    const { user } = useAuth(); // Access current user for logging
    const { trackCreate, trackDelete } = useUsage();

    const [passwords, setPasswords] = useState(() => {
        const stored = localStorage.getItem('secure_vault_items');
        if (stored) {
            try {
                const bytes = CryptoJS.AES.decrypt(stored, ENCRYPTION_KEY);
                return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            } catch (e) {
                console.error("Failed to decrypt data", e);
                return [];
            }
        }
        return [];
    });

    const [auditLog, setAuditLog] = useState(() => {
        const stored = localStorage.getItem(AUDIT_KEY);
        return stored ? JSON.parse(stored) : [];
    });

    const [shares, setShares] = useState(() => {
        const stored = localStorage.getItem(SHARES_KEY);
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(passwords), ENCRYPTION_KEY).toString();
        localStorage.setItem('secure_vault_items', encrypted);
    }, [passwords]);

    useEffect(() => {
        localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLog));
    }, [auditLog]);

    useEffect(() => {
        localStorage.setItem(SHARES_KEY, JSON.stringify(shares));
    }, [shares]);

    const logAction = (action, targetTitle, details = '') => {
        const newEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            action, // 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'
            user: user ? user.name : 'Unknown', // Log who did it
            target: targetTitle,
            details
        };
        setAuditLog(prev => [newEntry, ...prev]);
    };

    const addPassword = (newPassword) => {
        setPasswords(prev => [
            {
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                isFavorite: false,
                isDeleted: false,
                ...newPassword
            },
            ...prev
        ]);
        logAction('CREATE', newPassword.title, `Usuario: ${newPassword.username}`);
        trackCreate(); // Track password creation
    };

    const bulkAddPasswords = (newPasswords) => {
        if (!Array.isArray(newPasswords) || newPasswords.length === 0) return;

        const formattedPasswords = newPasswords.map(p => ({
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            isFavorite: false,
            isDeleted: false,
            title: p.title || 'Untitled',
            username: p.username || '',
            password: p.password || '',
            url: p.url || '',
            meta_person: p.meta_person || ''
        }));

        setPasswords(prev => [...formattedPasswords, ...prev]);
        logAction('IMPORT', 'Importación Masiva', `${newPasswords.length} items importados`);
    };

    const deletePassword = (id) => {
        const target = passwords.find(p => p.id === id);
        setPasswords(prev => prev.map(p => p.id === id ? { ...p, isDeleted: true } : p));
        if (target) logAction('DELETE', target.title, 'Movido a papelera');
        trackDelete(); // Track password deletion
    };

    const restorePassword = (id) => {
        const target = passwords.find(p => p.id === id);
        setPasswords(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false } : p));
        if (target) logAction('RESTORE', target.title, 'Restaurado de papelera');
    };

    const permanentlyDeletePassword = (id) => {
        const target = passwords.find(p => p.id === id);
        setPasswords(prev => prev.filter(p => p.id !== id));
        if (target) logAction('PERMANENT_DELETE', target.title, 'Eliminado definitivamente');
    };

    const toggleFavorite = (id) => {
        // No logging for favorites to avoid spam
        setPasswords(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    };

    const updatePassword = (id, updates) => {
        const target = passwords.find(p => p.id === id);

        if (!target) return;

        // Store previous version in history
        const previousVersion = {
            password: target.password,
            username: target.username,
            title: target.title,
            url: target.url,
            changedAt: Date.now(),
            changedBy: user ? user.name : 'Unknown'
        };

        // Initialize history if it doesn't exist
        const currentHistory = target.history || [];

        // Add previous version to history (limit to 10)
        const newHistory = [previousVersion, ...currentHistory].slice(0, 10);

        setPasswords(prev => prev.map(p =>
            p.id === id
                ? { ...p, ...updates, history: newHistory, updatedAt: Date.now() }
                : p
        ));

        logAction('UPDATE', updates.title || target.title, 'Detalles modificados');
    };

    const restorePasswordVersion = (id, versionIndex) => {
        const target = passwords.find(p => p.id === id);

        if (!target || !target.history || !target.history[versionIndex]) {
            console.error('Version not found');
            return;
        }

        const versionToRestore = target.history[versionIndex];

        // Store current state before restoring
        const currentVersion = {
            password: target.password,
            username: target.username,
            title: target.title,
            url: target.url,
            changedAt: Date.now(),
            changedBy: user ? user.name : 'Unknown'
        };

        // Create new history without the restored version, but add current state
        const newHistory = [
            currentVersion,
            ...target.history.filter((_, idx) => idx !== versionIndex)
        ].slice(0, 10);

        setPasswords(prev => prev.map(p =>
            p.id === id
                ? {
                    ...p,
                    password: versionToRestore.password,
                    username: versionToRestore.username,
                    title: versionToRestore.title,
                    url: versionToRestore.url,
                    history: newHistory,
                    updatedAt: Date.now()
                }
                : p
        ));

        logAction('RESTORE_VERSION', target.title, `Versión restaurada de ${new Date(versionToRestore.changedAt).toLocaleString()}`);
    };

    // ===== PASSWORD SHARING FUNCTIONS =====

    const sharePassword = (passwordId, sharedWithUserId, permission = 'read', expiresIn = null) => {
        const password = passwords.find(p => p.id === passwordId);
        if (!password) {
            console.error('Password not found');
            return { success: false, error: 'Contraseña no encontrada' };
        }

        // Calculate expiration
        let expiresAt = null;
        if (expiresIn) {
            expiresAt = Date.now() + expiresIn;
        }

        const newShare = {
            id: crypto.randomUUID(),
            passwordId,
            sharedBy: user?.id || 'unknown',
            sharedWith: sharedWithUserId,
            permission, // 'read' | 'write'
            expiresAt,
            createdAt: Date.now(),
            lastAccessedAt: null
        };

        setShares(prev => [...prev, newShare]);
        logAction('SHARE', password.title, `Compartido con usuario ${sharedWithUserId}`);

        return { success: true, share: newShare };
    };

    const revokeShare = (shareId) => {
        const share = shares.find(s => s.id === shareId);
        if (share) {
            const password = passwords.find(p => p.id === share.passwordId);
            setShares(prev => prev.filter(s => s.id !== shareId));
            if (password) {
                logAction('UNSHARE', password.title, 'Acceso compartido revocado');
            }
        }
    };

    const getPasswordShares = (passwordId) => {
        return shares.filter(s => s.passwordId === passwordId && (!s.expiresAt || s.expiresAt > Date.now()));
    };

    const getSharedPasswords = () => {
        if (!user) return [];

        // Get shares where current user is the recipient
        const userShares = shares.filter(s =>
            s.sharedWith === user.id &&
            (!s.expiresAt || s.expiresAt > Date.now())
        );

        // Get the actual passwords
        return userShares.map(share => {
            const password = passwords.find(p => p.id === share.passwordId);
            return password ? { ...password, share } : null;
        }).filter(Boolean);
    };

    const updateShareAccess = (shareId) => {
        setShares(prev => prev.map(s =>
            s.id === shareId
                ? { ...s, lastAccessedAt: Date.now() }
                : s
        ));
    };

    // ===== BREACH DETECTION =====

    const checkPasswordForBreach = async (passwordId) => {
        const password = passwords.find(p => p.id === passwordId);
        if (!password) return;

        const result = await checkPasswordBreach(password.password);

        if (!result.error) {
            setPasswords(prev => prev.map(p =>
                p.id === passwordId
                    ? { ...p, breachCount: result.count, lastBreachCheck: Date.now() }
                    : p
            ));
        }

        return result;
    };

    const checkAllPasswordsForBreaches = async (onProgress = null) => {
        const activePasswords = passwords.filter(p => !p.isDeleted);
        const total = activePasswords.length;
        let checked = 0;

        for (const password of activePasswords) {
            await checkPasswordForBreach(password.id);
            checked++;

            if (onProgress) {
                onProgress({
                    current: checked,
                    total,
                    percentage: (checked / total) * 100
                });
            }
        }
    };

    return (
        <PasswordContext.Provider value={{
            passwords,
            auditLog,
            addPassword,
            bulkAddPasswords,
            deletePassword,
            restorePassword,
            permanentlyDeletePassword,
            toggleFavorite,
            updatePassword,
            restorePasswordVersion,
            // Sharing functions
            sharePassword,
            revokeShare,
            getPasswordShares,
            getSharedPasswords,
            updateShareAccess,
            shares,
            // Breach detection
            checkPasswordForBreach,
            checkAllPasswordsForBreaches
        }}>
            {children}
        </PasswordContext.Provider>
    );
};
