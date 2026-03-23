import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const GroupContext = createContext();

export function useGroups() {
    const context = useContext(GroupContext);
    if (!context) {
        throw new Error('useGroups must be used within a GroupProvider');
    }

    return context;
}

export function GroupProvider({ children }) {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [membersByGroup, setMembersByGroup] = useState({});

    const refreshGroups = useCallback(async () => {
        if (!user) {
            setGroups([]);
            setMembersByGroup({});
            return [];
        }

        const data = await api.get('/groups');
        const nextGroups = Array.isArray(data) ? data : [];
        setGroups(nextGroups);
        return nextGroups;
    }, [user]);

    const fetchGroupMembers = useCallback(async (groupId) => {
        if (!groupId || !user || user.role !== 'admin') {
            return [];
        }

        const members = await api.get(`/groups/${groupId}/members`);
        setMembersByGroup((previous) => ({
            ...previous,
            [groupId]: Array.isArray(members) ? members : [],
        }));
        return members;
    }, [user]);

    useEffect(() => {
        if (!user) {
            setGroups([]);
            setMembersByGroup({});
            return;
        }

        refreshGroups().catch((error) => {
            console.error('Error loading groups', error);
            if (error.status !== 403) {
                toast.error(error.message || 'No se pudieron cargar los grupos');
            }
        });
    }, [refreshGroups, user]);

    const createGroup = async (name, description) => {
        try {
            const group = await api.post('/groups', { name, description });
            setGroups((previous) => [...previous, group]);
            await fetchGroupMembers(group.id);
            return group;
        } catch (error) {
            console.error('Error creating group', error);
            toast.error(error.message || 'No se pudo crear el grupo');
            return null;
        }
    };

    const addMember = async (groupId, userId, role = 'member') => {
        try {
            await api.post(`/groups/${groupId}/members`, { userId, role });
            await fetchGroupMembers(groupId);
            return true;
        } catch (error) {
            console.error('Error adding group member', error);
            toast.error(error.message || 'No se pudo anadir el miembro');
            return false;
        }
    };

    const removeMember = async (groupId, userId) => {
        try {
            await api.delete(`/groups/${groupId}/members/${userId}`);
            await fetchGroupMembers(groupId);
            return true;
        } catch (error) {
            console.error('Error removing group member', error);
            toast.error(error.message || 'No se pudo eliminar el miembro');
            return false;
        }
    };

    const deleteGroup = async (groupId) => {
        try {
            await api.delete(`/groups/${groupId}`);
            setGroups((previous) => previous.filter((group) => group.id !== groupId));
            setMembersByGroup((previous) => {
                const next = { ...previous };
                delete next[groupId];
                return next;
            });
            return true;
        } catch (error) {
            console.error('Error deleting group', error);
            toast.error(error.message || 'No se pudo eliminar el grupo');
            return false;
        }
    };

    const getGroupMembers = (groupId) => membersByGroup[groupId] || [];

    return (
        <GroupContext.Provider
            value={{
                addMember,
                createGroup,
                deleteGroup,
                fetchGroupMembers,
                getGroupMembers,
                getUserGroups: () => groups,
                groups,
                removeMember,
                updateGroup: async () => false,
            }}
        >
            {children}
        </GroupContext.Provider>
    );
}
