import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
    const { user } = useAuth();
    const [config, setConfig] = useState({ company_name: 'Mi Empresa' });
    const [assignablePeople, setAssignablePeople] = useState([]);
    const isAdmin = user?.role === 'admin';

    const fetchConfig = useCallback(async () => {
        if (!isAdmin) {
            setConfig({ company_name: 'Mi Empresa' });
            return null;
        }

        try {
            const data = await api.get('/config');
            if (data) setConfig(data);
            return data;
        } catch (error) {
            console.error("Error loading config", error);
            return null;
        }
    }, [isAdmin]);

    const fetchAssignablePeople = useCallback(async () => {
        if (!isAdmin) {
            setAssignablePeople([]);
            return [];
        }

        try {
            const data = await api.get('/employees/assignable');
            setAssignablePeople(data);
            return data;
        } catch (error) {
            console.error("Error loading people", error);
            return [];
        }
    }, [isAdmin]);

    const updateConfig = async (newConfig) => {
        if (!isAdmin) {
            return false;
        }

        try {
            await api.post('/config', newConfig);
            setConfig(prev => ({ ...prev, ...newConfig }));
            return true;
        } catch (error) {
            console.error("Error updating config", error);
            return false;
        }
    };

    const addEmployee = async (employeeData) => {
        if (!isAdmin) {
            return false;
        }

        try {
            await api.post('/employees', employeeData);
            await fetchAssignablePeople();
            return true;
        } catch (_err) {
            return false;
        }
    };

    useEffect(() => {
        if (!user) {
            setConfig({ company_name: 'Mi Empresa' });
            setAssignablePeople([]);
            return;
        }

        if (isAdmin) {
            fetchConfig();
            fetchAssignablePeople();
            return;
        }

        setConfig({ company_name: 'Mi Empresa' });
        setAssignablePeople([]);
    }, [fetchAssignablePeople, fetchConfig, isAdmin, user]);

    return (
        <ConfigContext.Provider value={{
            config,
            updateConfig,
            assignablePeople,
            refreshPeople: fetchAssignablePeople,
            addEmployee
        }}>
            {children}
        </ConfigContext.Provider>
    );
};
