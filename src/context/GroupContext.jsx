import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const GroupContext = createContext();

export const useGroups = () => useContext(GroupContext);

export const GroupProvider = ({ children }) => {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);

    useEffect(() => {
        if (!user) {
            setGroups([]);
            return;
        }
        const fetchGroups = async () => {
            try {
                const data = await api.get('/groups');
                setGroups(data);
            } catch (err) {
                console.warn("API Groups failed, falling back to local", err);
                // Fallback to local default groups
                const local = localStorage.getItem(`groups_${user.email}`);
                if (local) {
                    setGroups(JSON.parse(local));
                } else {
                    setGroups([{ id: 'g-1', name: 'General', description: 'Grupo por defecto' }]);
                }
            }
        };
        fetchGroups();
    }, [user]);

    const saveToLocal = (newGroups) => {
        if (user?.email) {
            localStorage.setItem(`groups_${user.email}`, JSON.stringify(newGroups));
        }
    };

    const createGroup = async (name, description) => {
        const tempId = Date.now().toString();
        const newGroup = { id: tempId, name, description, members: [] };

        try {
            const savedGroup = await api.post('/groups', { name, description });
            setGroups(prev => [...prev, savedGroup]);
            return savedGroup;
        } catch (err) {
            setGroups(prev => {
                const newState = [...prev, newGroup];
                saveToLocal(newState);
                return newState;
            });
            toast.success('Grupo creado (Offline)');
            return newGroup;
        }
    };

    // Stubbing members for offline since specific member management is complex without a real user DB
    const getGroupMembers = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        return group?.members || [];
    };

    const updateGroup = () => { };
    const deleteGroup = () => { };

    const addMember = async (groupId, userId, role) => {
        try {
            await api.post(`/groups/${groupId}/members`, { userId, role });
            toast.success('Miembro añadido');
        } catch (e) {
            // Offline: just update local state
            setGroups(prev => {
                const newState = prev.map(g => {
                    if (g.id === groupId) {
                        const newMember = { userId, role, addedAt: new Date() };
                        return { ...g, members: [...(g.members || []), newMember] };
                    }
                    return g;
                });
                saveToLocal(newState);
                return newState;
            });
            toast.success('Miembro añadido (Offline)');
        }
    };

    const removeMember = () => { };
    const getUserGroups = () => groups;

    return (
        <GroupContext.Provider value={{
            groups,
            createGroup,
            updateGroup,
            deleteGroup,
            addMember,
            removeMember,
            getGroupMembers,
            getUserGroups
        }}>
            {children}
        </GroupContext.Provider>
    );
};
