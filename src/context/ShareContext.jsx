import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ShareContext = createContext();

export const useShare = () => useContext(ShareContext);

const SHARES_KEY = 'vault_local_shares';

export const ShareProvider = ({ children }) => {
    // Initial load
    const [activeShares, setActiveShares] = useState(() => {
        const stored = localStorage.getItem(SHARES_KEY);
        return stored ? JSON.parse(stored) : [];
    });

    // Sync to LocalStorage on change (Writer)
    useEffect(() => {
        localStorage.setItem(SHARES_KEY, JSON.stringify(activeShares));
    }, [activeShares]);

    // Sync FROM LocalStorage (Reader/Other Tabs)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === SHARES_KEY) {
                const newValue = e.newValue ? JSON.parse(e.newValue) : [];
                setActiveShares(newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const generateShareLink = (item, type = 'password', options = {}) => {
        const shareId = crypto.randomUUID();
        const expiration = options.expiration || 3600 * 1000; // Default 1 hour
        const views = options.views || 1; // Default 1 view (burning)

        const newShare = {
            id: shareId,
            itemId: item.id,
            encryptedData: (() => {
                if (type === 'password' && options.includeUsername === false) {
                    const { username, ...rest } = item;
                    return rest;
                }
                return item;
            })(),
            type,
            createdAt: Date.now(),
            expiresAt: Date.now() + expiration,
            viewsLeft: views,
            maxViews: views
        };

        setActiveShares(prev => [...prev, newShare]);

        const link = `${window.location.origin}/share/${shareId}`;
        return link;
    };

    const getShare = (shareId) => {
        // 1. Try state first
        let share = activeShares.find(s => s.id === shareId);

        // 2. Fallback: Force read from LocalStorage (in case state is stale or race condition)
        if (!share) {
            try {
                const stored = localStorage.getItem(SHARES_KEY);
                const allShares = stored ? JSON.parse(stored) : [];
                share = allShares.find(s => s.id === shareId);
                // If found here but not in state, silently update state? 
                // No, just use it. The storage event will eventually sync state.
            } catch (e) {
                console.error("Error reading LS in getShare fallback", e);
            }
        }

        if (!share) return { error: 'Enlace no válido o inexistente' };

        if (Date.now() > share.expiresAt) {
            cleanupShare(shareId);
            return { error: 'Este enlace ha caducado' };
        }

        if (share.viewsLeft <= 0) {
            cleanupShare(shareId); // Clean it up if it's dead
            return { error: 'Este enlace ya ha sido visualizado y destruido' };
        }

        return { data: share };
    };

    const consumeShare = (shareId) => {
        // We need to read fresh from LS to ensure atomicity-ish
        const stored = localStorage.getItem(SHARES_KEY);
        let allShares = stored ? JSON.parse(stored) : [];
        const shareIndex = allShares.findIndex(s => s.id === shareId);

        if (shareIndex === -1) return; // Already gone

        const share = allShares[shareIndex];

        if (share.viewsLeft > 0) {
            share.viewsLeft -= 1;

            if (share.viewsLeft <= 0) {
                // Remove
                allShares = allShares.filter(s => s.id !== shareId);
            } else {
                // Update
                allShares[shareIndex] = share;
            }

            // Save via state to trigger updates, but also direct to LS for safety
            setActiveShares(allShares);
            // The useEffect will handle the LS write, but we can double tap to be safe or rely on state
            // Let's rely on state which triggers the useEffect writer.
        }
    };

    const cleanupShare = (shareId) => {
        setActiveShares(prev => prev.filter(s => s.id !== shareId));
    };

    return (
        <ShareContext.Provider value={{
            generateShareLink,
            getShare,
            consumeShare
        }}>
            {children}
        </ShareContext.Provider>
    );
};
