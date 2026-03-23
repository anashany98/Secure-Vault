import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { normalizeInventoryItem } from '../lib/modelAdapters';

const InventoryContext = createContext();

export function useInventory() {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }

    return context;
}

function appendHistoryEvent(item, event) {
    return {
        ...item,
        history: [
            {
                ...event,
                date: event.date || new Date().toISOString(),
                id: event.id || crypto.randomUUID(),
            },
            ...(Array.isArray(item.history) ? item.history : []),
        ],
    };
}

export function InventoryProvider({ children }) {
    const { user } = useAuth();
    const [items, setItems] = useState([]);

    const refreshInventory = useCallback(async () => {
        if (!user || user.role !== 'admin') {
            setItems([]);
            return [];
        }

        const data = await api.get('/inventory');
        const nextItems = (Array.isArray(data) ? data : []).map(normalizeInventoryItem);
        setItems(nextItems);
        return nextItems;
    }, [user]);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            setItems([]);
            return;
        }

        refreshInventory().catch((error) => {
            console.error('Error loading inventory', error);
            toast.error(error.message || 'No se pudo cargar el inventario');
        });
    }, [refreshInventory, user]);

    const addItem = async (newItem) => {
        try {
            const savedItem = await api.post('/inventory', newItem);
            setItems((previous) => [normalizeInventoryItem(savedItem), ...previous]);
            toast.success('Dispositivo anadido');
            return { success: true };
        } catch (error) {
            console.error('Error adding inventory item', error);
            toast.error(error.message || 'No se pudo anadir el dispositivo');
            return { success: false, error: error.message };
        }
    };

    const updateItem = async (id, updates) => {
        try {
            const updatedItem = await api.put(`/inventory/${id}`, updates);
            setItems((previous) =>
                previous.map((item) => (item.id === id ? normalizeInventoryItem(updatedItem) : item))
            );
            toast.success('Dispositivo actualizado');
            return { success: true };
        } catch (error) {
            console.error('Error updating inventory item', error);
            toast.error(error.message || 'No se pudo actualizar el dispositivo');
            return { success: false, error: error.message };
        }
    };

    const deleteItem = async (id) => {
        try {
            await api.delete(`/inventory/${id}`);
            setItems((previous) => previous.filter((item) => item.id !== id));
            toast.success('Dispositivo eliminado');
        } catch (error) {
            console.error('Error deleting inventory item', error);
            toast.error(error.message || 'No se pudo eliminar el dispositivo');
        }
    };

    const addHistoryEvent = (id, event) => {
        setItems((previous) =>
            previous.map((item) => (item.id === id ? appendHistoryEvent(item, event) : item))
        );
    };

    return (
        <InventoryContext.Provider
            value={{
                addHistoryEvent,
                addItem,
                deleteItem,
                inventory: items,
                items,
                refreshInventory,
                updateItem,
            }}
        >
            {children}
        </InventoryContext.Provider>
    );
}
