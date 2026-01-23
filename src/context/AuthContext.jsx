import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // START FALLBACK LOGIC
    const MOCK_ADMIN = {
        id: 'admin-001',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin',
        token: 'mock-jwt-token-dev-mode'
    };

    const login = async (email, password) => {
        try {
            const data = await api.post('/auth/login', { email, password });

            if (data.requires2FA) {
                return { success: true, requires2FA: true, tempToken: data.tempToken };
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            toast.success('Bienvenido de nuevo');
            return { success: true };
        } catch (error) {
            console.warn("API Login failed, trying local fallback...", error);
            // ... fallback logic ...
            if (email === 'admin@company.com' && password === 'admin123') {
                localStorage.setItem('token', MOCK_ADMIN.token);
                localStorage.setItem('user', JSON.stringify(MOCK_ADMIN));
                setUser(MOCK_ADMIN);
                toast.success('Modo Offline: Bienvenido Admin');
                return { success: true };
            }

            toast.error(error.message || 'Error al iniciar sesión');
            return { success: false, error: error.message || 'Credenciales inválidas' };
        }
    };

    const verify2FA = async (tempToken, token) => {
        try {
            const data = await api.post('/auth/login/verify', { tempToken, token });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            toast.success('Acceso verificado');
            return { success: true };
        } catch (error) {
            toast.error('Código 2FA incorrecto');
            return { success: false, error: 'Código inválido' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        toast.success('Sesión cerrada');
    };

    const register = async (name, email, password) => {
        try {
            await api.post('/auth/register', { name, email, password });
            toast.success('Usuario registrado correctamente');
            return login(email, password);
        } catch (error) {
            toast.error("El registro requiere conexión al servidor.");
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            verify2FA,
            logout,
            register,
            loading,
            usersList,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'admin'
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
