import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '../lib/api';
import { clearRuntimeCryptoConfig } from '../lib/env';

const AuthContext = createContext();

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

function clearPendingState(setPendingChallengeType, setPendingSetupUser) {
    setPendingChallengeType(null);
    setPendingSetupUser(null);
}

function persistSession(
    data,
    setUser,
    setVaultAccess,
    setPendingChallengeType,
    setPendingSetupUser,
    setPendingEnrollmentResult
) {
    clearPendingState(setPendingChallengeType, setPendingSetupUser);
    setPendingEnrollmentResult(null);
    setUser(data.user);
    setVaultAccess(data.vaultAccess || null);
}

function clearSession(
    setUser,
    setVaultAccess,
    setUsersList,
    setPendingChallengeType,
    setPendingSetupUser,
    setPendingEnrollmentResult
) {
    clearRuntimeCryptoConfig();
    clearPendingState(setPendingChallengeType, setPendingSetupUser);
    setPendingEnrollmentResult(null);
    setUser(null);
    setVaultAccess(null);
    setUsersList([]);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [vaultAccess, setVaultAccess] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [pendingChallengeType, setPendingChallengeType] = useState(null);
    const [pendingEnrollmentResult, setPendingEnrollmentResult] = useState(null);
    const [pendingSetupUser, setPendingSetupUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUsers = useCallback(async () => {
        if (!user || user.role !== 'admin') {
            setUsersList([]);
            return [];
        }

        const data = await api.get('/auth/users');
        const nextUsers = Array.isArray(data) ? data : [];
        setUsersList(nextUsers);
        return nextUsers;
    }, [user]);

    const restorePendingChallenge = useCallback(async () => {
        const pending = await api.get('/auth/pending-challenge');
        if (pending?.requires2FA) {
            setPendingChallengeType('login');
            setPendingSetupUser(null);
            return true;
        }

        if (pending?.requires2FASetup) {
            setPendingChallengeType('setup');
            setPendingSetupUser(pending.user || null);
            return true;
        }

        clearPendingState(setPendingChallengeType, setPendingSetupUser);
        return false;
    }, []);

    useEffect(() => {
        let isMounted = true;

        const restoreSession = async () => {
            try {
                const session = await api.get('/auth/me');
                if (!isMounted) {
                    return;
                }

                persistSession(
                    session,
                    setUser,
                    setVaultAccess,
                    setPendingChallengeType,
                    setPendingSetupUser,
                    setPendingEnrollmentResult
                );
            } catch (error) {
                clearRuntimeCryptoConfig();
                if (isMounted) {
                    setUser(null);
                    setVaultAccess(null);
                }

                if (error.status === 401 || error.status === 403) {
                    try {
                        await restorePendingChallenge();
                    } catch {
                        if (isMounted) {
                            clearPendingState(setPendingChallengeType, setPendingSetupUser);
                        }
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        restoreSession();

        return () => {
            isMounted = false;
        };
    }, [restorePendingChallenge]);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            setUsersList([]);
            return;
        }

        refreshUsers().catch((error) => {
            console.error('Error loading users', error);
            if (error.status === 401 || error.status === 403) {
                clearSession(
                    setUser,
                    setVaultAccess,
                    setUsersList,
                    setPendingChallengeType,
                    setPendingSetupUser,
                    setPendingEnrollmentResult
                );
            }
        });
    }, [refreshUsers, user]);

    const login = async (email, password) => {
        try {
            const data = await api.post('/auth/login', { email, password });

            if (data?.requires2FA) {
                setPendingChallengeType('login');
                setPendingSetupUser(null);
                return {
                    success: true,
                    requires2FA: true,
                };
            }

            if (data?.requires2FASetup) {
                setPendingChallengeType('setup');
                setPendingSetupUser(data.user || null);
                toast('Configura 2FA antes de acceder a la boveda');
                return {
                    success: true,
                    requires2FASetup: true,
                };
            }

            persistSession(
                data,
                setUser,
                setVaultAccess,
                setPendingChallengeType,
                setPendingSetupUser,
                setPendingEnrollmentResult
            );
            toast.success('Bienvenido de nuevo');
            return { success: true };
        } catch (error) {
            const message = error.message || 'Error al iniciar sesion';
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const verify2FA = async (token) => {
        try {
            const data = await api.post('/auth/login/verify', { token });
            persistSession(
                data,
                setUser,
                setVaultAccess,
                setPendingChallengeType,
                setPendingSetupUser,
                setPendingEnrollmentResult
            );
            toast.success('Acceso verificado');
            return { success: true };
        } catch (error) {
            const message = error.message || 'Codigo 2FA invalido';
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const startMandatory2FASetup = async () => {
        try {
            return await api.post('/auth/2fa/setup');
        } catch (error) {
            const message = error.message || 'No se pudo iniciar la configuracion 2FA';
            toast.error(message);
            throw error;
        }
    };

    const completeMandatory2FASetup = async (token) => {
        try {
            const data = await api.post('/auth/2fa/enable', { token });
            setPendingEnrollmentResult(data);
            return { recoveryCodes: data.recoveryCodes || [], success: true };
        } catch (error) {
            const message = error.message || 'No se pudo completar la configuracion 2FA';
            toast.error(message);
            return { success: false, error: message };
        }
    };

    const finalizeMandatory2FASetup = () => {
        if (!pendingEnrollmentResult) {
            return;
        }

        persistSession(
            pendingEnrollmentResult,
            setUser,
            setVaultAccess,
            setPendingChallengeType,
            setPendingSetupUser,
            setPendingEnrollmentResult
        );
        toast.success('2FA habilitado correctamente');
    };

    const cancelPendingChallenge = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore and clear pending state locally.
        } finally {
            clearPendingState(setPendingChallengeType, setPendingSetupUser);
            setPendingEnrollmentResult(null);
        }
    };

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Ignore logout errors and clear local state anyway.
        } finally {
            clearSession(
                setUser,
                setVaultAccess,
                setUsersList,
                setPendingChallengeType,
                setPendingSetupUser,
                setPendingEnrollmentResult
            );
            toast.success('Sesion cerrada');
        }
    }, []);

    const register = async (name, email, password, role = 'user') => {
        try {
            const createdUser = await api.post('/auth/register', { name, email, password, role });
            if (user?.role === 'admin') {
                await refreshUsers();
            }
            toast.success('Usuario creado correctamente');
            return { success: true, user: createdUser };
        } catch (error) {
            const message = error.message || 'No se pudo crear el usuario';
            toast.error(message);
            return { success: false, error: message };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                cancelPendingChallenge,
                completeMandatory2FASetup,
                finalizeMandatory2FASetup,
                isAdmin: user?.role === 'admin',
                isAuthenticated: Boolean(user),
                loading,
                login,
                logout,
                pendingChallengeType,
                pendingEnrollmentResult,
                pendingSetupUser,
                refreshUsers,
                register,
                startMandatory2FASetup,
                user,
                usersList,
                setVaultAccess,
                verify2FA,
                vaultAccess,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
}
