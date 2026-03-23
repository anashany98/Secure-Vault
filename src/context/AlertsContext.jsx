import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const AlertsContext = createContext();
const BROWSER_ALERTS_KEY = 'securevault_browser_alerts_enabled';
const POLL_INTERVAL_MS = 60_000;

function getNotificationPermission() {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
        return 'unsupported';
    }

    return Notification.permission;
}

export function useAlerts() {
    const context = useContext(AlertsContext);
    if (!context) {
        throw new Error('useAlerts must be used within an AlertsProvider');
    }

    return context;
}

export function AlertsProvider({ children }) {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [permission, setPermission] = useState(getNotificationPermission());
    const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(
        () => localStorage.getItem(BROWSER_ALERTS_KEY) === 'true'
    );
    const announcedIdsRef = useRef(new Set());

    const refreshAlerts = useCallback(async () => {
        if (!user) {
            setAlerts([]);
            return [];
        }

        const data = await api.get('/alerts');
        const nextAlerts = Array.isArray(data) ? data : [];
        setAlerts(nextAlerts);

        if (browserAlertsEnabled && permission === 'granted') {
            nextAlerts
                .filter((alert) => alert.severity !== 'low')
                .forEach((alert) => {
                    if (announcedIdsRef.current.has(alert.id)) {
                        return;
                    }

                    announcedIdsRef.current.add(alert.id);
                    new Notification(alert.title, {
                        body: alert.message,
                    });
                });
        }

        return nextAlerts;
    }, [browserAlertsEnabled, permission, user]);

    const enableBrowserAlerts = async () => {
        if (typeof Notification === 'undefined') {
            toast.error('Este navegador no soporta notificaciones');
            return false;
        }

        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
            toast.error('Permiso de notificaciones denegado');
            return false;
        }

        localStorage.setItem(BROWSER_ALERTS_KEY, 'true');
        setBrowserAlertsEnabled(true);
        toast.success('Alertas del navegador activadas');
        return true;
    };

    const disableBrowserAlerts = () => {
        localStorage.setItem(BROWSER_ALERTS_KEY, 'false');
        setBrowserAlertsEnabled(false);
        toast.success('Alertas del navegador desactivadas');
    };

    useEffect(() => {
        if (!user) {
            setAlerts([]);
            announcedIdsRef.current = new Set();
            return;
        }

        refreshAlerts().catch((error) => {
            console.error('Error loading alerts', error);
        });

        const intervalId = window.setInterval(() => {
            refreshAlerts().catch((error) => {
                console.error('Error refreshing alerts', error);
            });
        }, POLL_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [refreshAlerts, user]);

    return (
        <AlertsContext.Provider
            value={{
                alerts,
                browserAlertsEnabled,
                disableBrowserAlerts,
                enableBrowserAlerts,
                permission,
                refreshAlerts,
            }}
        >
            {children}
        </AlertsContext.Provider>
    );
}
