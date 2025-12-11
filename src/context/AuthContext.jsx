import { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { useUsage } from './UsageContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const USERS_KEY = 'secure_vault_users';
const CURRENT_USER_KEY = 'secure_vault_current_session';
const DEFAULT_ADMIN = {
    id: 'admin-001',
    email: 'admin@company.com',
    name: 'Admin User',
    password: 'admin123', // In a real app, hash this!
    role: 'admin'
};

export const AuthProvider = ({ children }) => {
    const { trackLogin } = useUsage();
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem(CURRENT_USER_KEY);
    });

    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        return stored ? JSON.parse(stored) : null;
    });

    const [usersList, setUsersList] = useState(() => {
        const stored = localStorage.getItem(USERS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return [DEFAULT_ADMIN];
    });

    useEffect(() => {
        localStorage.setItem(USERS_KEY, JSON.stringify(usersList));
    }, [usersList]);

    const login = (email, password) => {
        const foundUser = usersList.find(u => u.email === email && u.password === password);

        if (foundUser) {
            const { password, ...safeUser } = foundUser;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
            setUser(safeUser);
            setIsAuthenticated(true);
            trackLogin(); // Track successful login
            return { success: true };
        }
        return { success: false, error: 'Credenciales inválidas' };
    };

    const register = (newUser) => {
        if (usersList.some(u => u.email === newUser.email)) {
            return { success: false, error: 'El email ya existe' };
        }
        const createdUser = {
            id: crypto.randomUUID(),
            role: 'user', // Default role
            createdAt: Date.now(),
            ...newUser
        };
        setUsersList(prev => [...prev, createdUser]);
        return { success: true };
    };

    const deleteUser = (userId) => {
        if (userId === DEFAULT_ADMIN.id) return { success: false, error: 'No se puede eliminar al admin' };
        setUsersList(prev => prev.filter(u => u.id !== userId));
        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem(CURRENT_USER_KEY);
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            usersList, // Exposed to Admin for management
            login,
            logout,
            register,
            deleteUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};
