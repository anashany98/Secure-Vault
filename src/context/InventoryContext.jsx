import { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

const INVENTORY_KEY = 'secure_vault_inventory';
const ENCRYPTION_KEY = 'demo-secret-key-change-this-in-prod'; // Use same security model

export const InventoryProvider = ({ children }) => {
    const [items, setItems] = useState(() => {
        const stored = localStorage.getItem(INVENTORY_KEY);
        if (stored) {
            try {
                const bytes = CryptoJS.AES.decrypt(stored, ENCRYPTION_KEY);
                return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            } catch (e) {
                console.error("Failed to decrypt inventory data", e);
                return [];
            }
        }
        return [];
    });

    useEffect(() => {
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(items), ENCRYPTION_KEY).toString();
        localStorage.setItem(INVENTORY_KEY, encrypted);
    }, [items]);

    const addItem = (newItem) => {
        setItems(prev => [
            {
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                ...newItem
            },
            ...prev
        ]);
    };

    const deleteItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const updateItem = (id, updates) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const addHistoryEvent = (id, event) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newHistory = [
                    {
                        id: crypto.randomUUID(),
                        date: Date.now(),
                        ...event
                    },
                    ...(item.history || [])
                ];
                return { ...item, history: newHistory };
            }
            return item;
        }));
    };

    return (
        <InventoryContext.Provider value={{
            items,
            addItem,
            deleteItem,
            updateItem,
            addHistoryEvent
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
