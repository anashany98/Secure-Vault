import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (!user) {
            setItems([]);
            return;
        }
        const fetchInventory = async () => {
            try {
                const data = await api.get('/inventory');
                setItems(data);
            } catch (err) {
                console.warn("API Inventory failed, falling back to LocalStorage", err);
                const localData = localStorage.getItem(`inventory_${user.email}`);
                if (localData) {
                    setItems(JSON.parse(localData));
                } else {
                    setItems([]);
                }
            }
        };
        fetchInventory();
    }, [user]);

    const saveToLocal = (newItems) => {
        if (user?.email) {
            localStorage.setItem(`inventory_${user.email}`, JSON.stringify(newItems));
        }
    };

    const addItem = async (newItem) => {
        const tempId = Date.now().toString();
        const itemWithId = { ...newItem, id: tempId, isDeleted: false };
        try {
            const savedItem = await api.post('/inventory', newItem);
            setItems(prev => [...prev, savedItem]);
            toast.success('Ítem añadido');
        } catch (err) {
            setItems(prev => {
                const newState = [...prev, itemWithId];
                saveToLocal(newState);
                return newState;
            });
            toast.success('Ítem añadido (Offline)');
        }
    };

    const updateItem = async (id, updates) => {
        try {
            if (id.toString().length < 15) {
                const updatedItem = await api.put(`/inventory/${id}`, updates);
                setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
            } else {
                throw new Error("Offline ID");
            }
            toast.success('Ítem actualizado');
        } catch (err) {
            setItems(prev => {
                const newState = prev.map(i => i.id === id ? { ...i, ...updates } : i);
                saveToLocal(newState);
                return newState;
            });
            toast.success('Ítem actualizado (Offline)');
        }
    };

    const deleteItem = async (id) => {
        try {
            if (id.toString().length < 15) {
                await api.delete(`/inventory/${id}`);
            } else {
                throw new Error("Offline ID");
            }
            // Soft delete simulation
            setItems(prev => prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: new Date().toISOString() } : i));
            toast.success('Ítem eliminado');
        } catch (err) {
            setItems(prev => {
                const newState = prev.map(i => i.id === id ? { ...i, isDeleted: true, deletedAt: new Date().toISOString() } : i);
                saveToLocal(newState);
                return newState;
            });
            toast.success('Ítem eliminado (Offline)');
        }
    };

    const restoreItem = (id) => {
        setItems(prev => {
            const newState = prev.map(i => i.id === id ? { ...i, isDeleted: false, deletedAt: null } : i);
            saveToLocal(newState);
            return newState;
        });
        toast.success('Ítem restaurado');
    };

    const permanentlyDeleteItem = (id) => {
        setItems(prev => {
            const newState = prev.filter(i => i.id !== id);
            saveToLocal(newState);
            return newState;
        });
        toast.success('Ítem eliminado permanentemente');
    };

    return (
        <InventoryContext.Provider value={{
            items,
            addItem,
            updateItem,
            deleteItem,
            restoreItem,
            permanentlyDeleteItem
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
