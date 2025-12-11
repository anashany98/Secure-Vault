import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAutoLogout = () => {
    const { logout, isAuthenticated } = useAuth();
    const timerRef = useRef(null);

    // Initialize from localStorage or default to 5 mins (300000ms)
    const [timeoutMs, setTimeoutMs] = useState(() => {
        const stored = localStorage.getItem('auto_logout_minutes');
        return stored ? parseInt(stored) * 60 * 1000 : 300000;
    });

    // Listen for setting changes
    useEffect(() => {
        const handleSettingsChange = () => {
            const stored = localStorage.getItem('auto_logout_minutes');
            if (stored) {
                setTimeoutMs(parseInt(stored) * 60 * 1000);
            }
        };

        window.addEventListener('storage', handleSettingsChange);
        window.addEventListener('auto-logout-change', handleSettingsChange);

        return () => {
            window.removeEventListener('storage', handleSettingsChange);
            window.removeEventListener('auto-logout-change', handleSettingsChange);
        };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                console.log("Auto-logout triggered due to inactivity. Timeout:", timeoutMs);
                logout();
            }, timeoutMs);
        };

        // Events to listen for
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Initial set
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [isAuthenticated, logout, timeoutMs]);
};
