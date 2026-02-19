import { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { useAuth } from './AuthContext';
import { useUsage } from './UsageContext';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const PasswordContext = createContext();

export const usePasswords = () => useContext(PasswordContext);

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'fallback-dev-key';

export const PasswordProvider = ({ children }) => {
    const { user } = useAuth();
    const { trackCreate, trackDelete } = useUsage();
    const [passwords, setPasswords] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [filterTag, setFilterTag] = useState(null); // null means no filter

    // Helper to persist to local storage for offline capability
    const syncToLocal = (data) => {
        if (user?.email) {
            localStorage.setItem(`vault_${user.email}`, JSON.stringify(data));
        }
    };

    const refreshVault = async () => {
        if (!user) return;
        try {
            const items = await api.get('/vault');
            const decrypted = items.map(item => {
                try {
                    const bytes = CryptoJS.AES.decrypt(item.encrypted_password, ENCRYPTION_KEY);
                    const originalPassword = bytes.toString(CryptoJS.enc.Utf8);

                    // Decrypt custom fields
                    let decryptedFields = [];
                    if (item.custom_fields && Array.isArray(item.custom_fields)) {
                        decryptedFields = item.custom_fields.map(f => {
                            try {
                                const fb = CryptoJS.AES.decrypt(f.value, ENCRYPTION_KEY);
                                return { ...f, value: fb.toString(CryptoJS.enc.Utf8) };
                            } catch (e) { return f; }
                        });
                    }

                    return { ...item, password: originalPassword, custom_fields: decryptedFields };
                } catch (e) {
                    console.error("Decryption failed for item", item.id);
                    return { ...item, password: 'ERROR' };
                }
            });
            setPasswords(prev => {
                const prevMap = new Map(prev.map(p => [p.id, p.breachCount || 0]));
                return decrypted.map(item => ({
                    ...item,
                    breachCount: prevMap.get(item.id) || 0
                }));
            });
            syncToLocal(decrypted);
        } catch (err) {
            console.warn("API Vault failed, falling back to LocalStorage", err);
            const localData = localStorage.getItem(`vault_${user.email}`);
            if (localData) {
                setPasswords(JSON.parse(localData));
                if (passwords.length === 0) toast('Modo Offline: Usando datos locales', { icon: '📂' });
            }
        }
    };

    // Fetch passwords on mount or user change
    useEffect(() => {
        if (user) {
            refreshVault();
            fetchAuditLogs();
        } else {
            setPasswords([]);
        }
    }, [user]);

    const fetchAuditLogs = async () => {
        try {
            const items = await api.get('/audit');
            setAuditLogs(items);
        } catch (err) {
            console.error("Fetch audit logs failed", err);
        }
    };

    const bulkAddPasswords = async (items) => {
        const toastId = toast.loading('Encriptando e importando...');
        try {
            // Encrypt client-side before sending
            const encryptedItems = items.map(item => {
                const encrypted = CryptoJS.AES.encrypt(item.password || '', ENCRYPTION_KEY).toString();
                return {
                    title: item.title,
                    username: item.username,
                    encrypted_password: encrypted,
                    url: item.url,
                    meta_person: item.meta_person,
                    is_favorite: false,
                    tags: [],
                    custom_fields: JSON.stringify([])
                };
            });

            const response = await api.post('/vault/import', { items: encryptedItems });

            toast.success(`Importadas ${response.count} contraseñas`, { id: toastId });

            // Refresh list to get IDs
            await refreshVault();
            trackCreate();

        } catch (err) {
            console.error("Bulk Import Failed", err);
            toast.error("Error al importar. Revisa el formato.", { id: toastId });
        }
    };

    const addPassword = async (newPassword) => {
        try {
            const encrypted = CryptoJS.AES.encrypt(newPassword.password, ENCRYPTION_KEY).toString();

            // Encrypt custom fields
            const encryptedCustomFields = newPassword.custom_fields ? newPassword.custom_fields.map(f => ({
                ...f,
                value: CryptoJS.AES.encrypt(f.value, ENCRYPTION_KEY).toString()
            })) : [];

            const payload = {
                title: newPassword.title,
                username: newPassword.username,
                encrypted_password: encrypted,
                url: newPassword.website || newPassword.url,
                meta_person: newPassword.notes,
                is_favorite: newPassword.isFavorite || false,
                tags: newPassword.tags || [],
                custom_fields: JSON.stringify(encryptedCustomFields)
            };

            const savedItem = await api.post('/vault', payload);
            setPasswords(prev => {
                const newState = [{ ...savedItem, password: newPassword.password, custom_fields: newPassword.custom_fields }, ...prev];
                syncToLocal(newState);
                return newState;
            });
            trackCreate();
            toast.success('Contraseña guardada');
        } catch (err) {
            console.error("API Add failed", err);
            toast.error('Error al guardar. Verifica tu conexión.');
        }
    };

    const updatePassword = async (id, updates) => {
        try {
            const current = passwords.find(p => p.id === id);
            if (!current) return;

            const merged = { ...current, ...updates };
            const passwordToEncrypt = updates.password !== undefined ? updates.password : current.password;

            const encrypted = CryptoJS.AES.encrypt(passwordToEncrypt, ENCRYPTION_KEY).toString();

            // Encrypt custom fields if updated
            let processedCustomFields = current.custom_fields; // Default to existing
            if (updates.custom_fields) {
                processedCustomFields = updates.custom_fields.map(f => ({
                    ...f,
                    value: CryptoJS.AES.encrypt(f.value, ENCRYPTION_KEY).toString()
                }));
            } else if (current.custom_fields) {
                // If not updating custom fields but they exist, we must re-encrypt/preserve? 
                // Wait, if we send stored encrypted payload back to server it's fine.
                // But here we need to know if we are sending raw or encrypted.
                // API expects custom_fields.
                // If we don't send custom_fields in payload, backend might keep old? 
                // My backend UPDATE query SETS tags checks if provided.
                // But my backend code: `const { ... custom_fields } = req.body`.
                // If I send undefined, `custom_fields` will be NULL/Undefined in SQL?
                // `custom_fields = $8`. If undefined, it sets NULL.
                // So I MUST send the existing ones if not updated.
                // But `current.custom_fields` in state is DECRYPTED.
                // So I must RE-ENCRYPT them if I send them back.
                processedCustomFields = current.custom_fields.map(f => ({
                    ...f,
                    value: CryptoJS.AES.encrypt(f.value, ENCRYPTION_KEY).toString()
                }));
            }

            const payload = {
                title: merged.title,
                username: merged.username,
                encrypted_password: encrypted,
                url: merged.url,
                meta_person: merged.meta_person,
                is_favorite: merged.isFavorite,
                tags: merged.tags,
                custom_fields: JSON.stringify(processedCustomFields)
            };

            await api.put(`/vault/${id}`, payload);

            setPasswords(prev => {
                const newState = prev.map(p => p.id === id ? { ...merged, password: passwordToEncrypt, custom_fields: updates.custom_fields || current.custom_fields } : p);
                syncToLocal(newState);
                return newState;
            });
            toast.success('Contraseña actualizada');
        } catch (err) {
            console.error("API Update failed", err);
            toast.error('Error al actualizar');
        }
    };

    const deletePassword = async (id) => {
        try {
            await api.delete(`/vault/${id}`); // Soft delete by default

            setPasswords(prev => {
                // Determine behavior: move to trash implies keeping it in state but marked isDeleted?
                // Or remove from active list? 
                // The API soft delete sets is_deleted=true. GET /vault filters out is_deleted=false usually?
                // Let's check api.js: GET /vault usually returns active items. 
                // But context often keeps all. 
                // Let's mark it as deleted in local state.
                const newState = prev.map(p => p.id === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p);
                syncToLocal(newState);
                return newState;
            });

            trackDelete();
            toast.success('Contraseña movida a papelera');
        } catch (err) {
            console.error("API Delete failed", err);
            toast.error('Error al eliminar');
        }
    };

    // Restore from Trash
    const restorePassword = async (id) => {
        try {
            await api.put(`/vault/${id}/restore`);

            setPasswords(prev => {
                const newState = prev.map(p => p.id === id ? { ...p, isDeleted: false, deletedAt: null } : p);
                syncToLocal(newState);
                return newState;
            });
            toast.success('Contraseña restaurada');
        } catch (err) {
            console.error("Restore failed", err);
            toast.error('Error al restaurar');
        }
    };

    const permanentlyDeletePassword = async (id) => {
        try {
            await api.delete(`/vault/${id}?force=true`);

            setPasswords(prev => {
                const newState = prev.filter(p => p.id !== id);
                syncToLocal(newState);
                return newState;
            });
            toast.success('Eliminado permanentemente');
        } catch (err) {
            console.error("Hard delete failed", err);
            toast.error('Error al eliminar permanentemente');
        }
    };

    const getPasswordHistory = async (id) => {
        try {
            const history = await api.get(`/vault/${id}/history`);
            const decryptedHistory = history.map(item => {
                try {
                    const bytes = CryptoJS.AES.decrypt(item.encrypted_password, ENCRYPTION_KEY);
                    const originalPassword = bytes.toString(CryptoJS.enc.Utf8);
                    return { ...item, password: originalPassword };
                } catch (e) {
                    return { ...item, password: 'ERROR' };
                }
            });
            return decryptedHistory;
        } catch (err) {
            console.error("Fetch history failed", err);
            return [];
        }
    };

    // Stubs
    const sharePassword = () => ({ success: false, message: "No disponible" });
    const getPasswordShares = () => [];
    const revokeShare = () => { };

    // Check single password against HIBP (k-Anonymity)
    const checkPasswordBreach = async (password) => {
        try {
            if (!password) return 0;

            // 1. Hash SHA-1
            const sha1 = CryptoJS.SHA1(password).toString(CryptoJS.enc.Hex).toUpperCase();

            // 2. Split Prefix (5 chars) and Suffix
            const prefix = sha1.substring(0, 5);
            const suffix = sha1.substring(5);

            // 3. Fetch Range
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            if (!response.ok) throw new Error('HIBP API Error');
            const text = await response.text();

            // 4. Parse Response to find suffix
            const lines = text.split('\n');
            const match = lines.find(line => line.startsWith(suffix));

            if (match) {
                // Format: SUFFIX:COUNT
                return parseInt(match.split(':')[1], 10);
            }
            return 0;
        } catch (err) {
            console.error("Breach check failed", err);
            return -1; // Error code
        }
    };

    const checkAllPasswordsForBreaches = async (onProgress) => {
        let checked = 0;
        const total = passwords.length;

        // Create a map of updates
        const updates = new Map();

        for (const item of passwords) {
            if (item.isDeleted) continue; // Skip deleted

            const count = await checkPasswordBreach(item.password);

            if (count > 0) {
                updates.set(item.id, count);
            }

            checked++;
            if (onProgress) {
                onProgress({
                    current: checked,
                    total: total,
                    percentage: (checked / total) * 100
                });
            }

            // Tiny delay to be nice to API
            await new Promise(r => setTimeout(r, 50));
        }

        // Batch update state
        if (updates.size > 0) {
            setPasswords(prev => {
                const newState = prev.map(p => {
                    if (updates.has(p.id)) {
                        return { ...p, breachCount: updates.get(p.id) };
                    }
                    return { ...p, breachCount: 0 }; // Clear previous breaches if safe now (unlikely for same pass but good logic)
                });
                syncToLocal(newState);
                return newState;
            });
            toast.error(`¡Alerta! Se encontraron ${updates.size} contraseñas comprometidas.`, { duration: 5000, icon: '🚨' });
        } else {
            toast.success('Análisis completado: No se encontraron filtraciones.', { duration: 5000, icon: '🛡️' });
        }
    };

    return (
        <PasswordContext.Provider value={{
            passwords,
            addPassword,
            bulkAddPasswords,
            updatePassword,
            deletePassword,
            sharePassword,
            getPasswordShares,
            revokeShare,
            checkPasswordBreach,
            checkAllPasswordsForBreaches,
            restorePassword,
            permanentlyDeletePassword,
            getPasswordHistory,
            auditLogs,
            fetchAuditLogs: async () => {
                try {
                    const items = await api.get('/audit');
                    setAuditLogs(items);
                } catch (err) { console.error(err); }
            },
            filterTag,
            setFilterTag
        }}>
            {children}
        </PasswordContext.Provider>
    );
};
