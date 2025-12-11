import { createContext, useContext, useState, useEffect } from 'react';

const UsageContext = createContext();

export const useUsage = () => {
    const context = useContext(UsageContext);
    if (!context) {
        throw new Error('useUsage must be used within UsageProvider');
    }
    return context;
};

const USAGE_KEY = 'secure_vault_usage_stats';

export const UsageProvider = ({ children }) => {
    const [stats, setStats] = useState(() => {
        const stored = localStorage.getItem(USAGE_KEY);
        return stored ? JSON.parse(stored) : {
            totalLogins: 0,
            passwordsCopied: 0,
            passwordsCreated: 0,
            passwordsDeleted: 0,
            searchesMade: 0,
            lastLogin: null,
            dailyActivity: {}, // format: { '2024-01-15': { logins: 1, copies: 5, ... } }
        };
    });

    useEffect(() => {
        localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
    }, [stats]);

    const trackLogin = () => {
        const today = new Date().toISOString().split('T')[0];
        setStats(prev => ({
            ...prev,
            totalLogins: prev.totalLogins + 1,
            lastLogin: Date.now(),
            dailyActivity: {
                ...prev.dailyActivity,
                [today]: {
                    ...(prev.dailyActivity[today] || {}),
                    logins: ((prev.dailyActivity[today]?.logins) || 0) + 1
                }
            }
        }));
    };

    const trackCopy = () => {
        const today = new Date().toISOString().split('T')[0];
        setStats(prev => ({
            ...prev,
            passwordsCopied: prev.passwordsCopied + 1,
            dailyActivity: {
                ...prev.dailyActivity,
                [today]: {
                    ...(prev.dailyActivity[today] || {}),
                    copies: ((prev.dailyActivity[today]?.copies) || 0) + 1
                }
            }
        }));
    };

    const trackCreate = () => {
        const today = new Date().toISOString().split('T')[0];
        setStats(prev => ({
            ...prev,
            passwordsCreated: prev.passwordsCreated + 1,
            dailyActivity: {
                ...prev.dailyActivity,
                [today]: {
                    ...(prev.dailyActivity[today] || {}),
                    creates: ((prev.dailyActivity[today]?.creates) || 0) + 1
                }
            }
        }));
    };

    const trackDelete = () => {
        setStats(prev => ({
            ...prev,
            passwordsDeleted: prev.passwordsDeleted + 1
        }));
    };

    const trackSearch = () => {
        setStats(prev => ({
            ...prev,
            searchesMade: prev.searchesMade + 1
        }));
    };

    return (
        <UsageContext.Provider value={{
            stats,
            trackLogin,
            trackCopy,
            trackCreate,
            trackDelete,
            trackSearch
        }}>
            {children}
        </UsageContext.Provider>
    );
};
