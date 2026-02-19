import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
    const { user } = useAuth();
    const [config, setConfig] = useState({ company_name: 'Mi Empresa' });
    const [assignablePeople, setAssignablePeople] = useState([]);

    const fetchConfig = async () => {
        try {
            const data = await api.get('/config');
            if (data) setConfig(data);
        } catch (err) {
            console.error("Error loading config", err);
        }
    };

    const fetchAssignablePeople = async () => {
        try {
            const data = await api.get('/employees/assignable');
            setAssignablePeople(data);
        } catch (err) {
            console.error("Error loading people", err);
        }
    };

    const updateConfig = async (newConfig) => {
        try {
            await api.post('/config', newConfig);
            setConfig(prev => ({ ...prev, ...newConfig }));
            return true;
        } catch (err) {
            console.error("Error updating config", err);
            return false;
        }
    };

    const addEmployee = async (employeeData) => {
        try {
            await api.post('/employees', employeeData);
            fetchAssignablePeople(); // Refresh list
            return true;
        } catch (err) {
            return false;
        }
    };

    useEffect(() => {
        if (user) {
            fetchConfig();
            fetchAssignablePeople();
        }
    }, [user]);

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
