import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from './AuthContext';
import { useVaultSecurity } from './VaultSecurityContext';
import { api } from '../lib/api';
import { getNotesKey } from '../lib/env';
import { decryptStringWithKey, encryptStringWithKey } from '../lib/secretCrypto';
import { normalizeNote } from '../lib/modelAdapters';

const NotesContext = createContext();

export function useNotes() {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotes must be used within a NotesProvider');
    }

    return context;
}

function encryptContent(content) {
    return encryptStringWithKey(content, getNotesKey());
}

function decryptContent(content) {
    return decryptStringWithKey(content, getNotesKey());
}

function hydrateNote(note) {
    const normalized = normalizeNote(note);
    return {
        ...normalized,
        content: decryptContent(normalized.content),
    };
}

export function NotesProvider({ children }) {
    const { user } = useAuth();
    const { isVaultReady } = useVaultSecurity();
    const [notes, setNotes] = useState([]);

    const refreshNotes = useCallback(async () => {
        if (!user || !isVaultReady) {
            setNotes([]);
            return [];
        }

        const items = await api.get('/notes');
        const nextNotes = (Array.isArray(items) ? items : []).map(hydrateNote);
        setNotes(nextNotes);
        return nextNotes;
    }, [isVaultReady, user]);

    useEffect(() => {
        if (!user || !isVaultReady) {
            setNotes([]);
            return;
        }

        refreshNotes().catch((error) => {
            console.error('Error loading notes', error);
            toast.error(error.message || 'No se pudieron cargar las notas');
        });
    }, [isVaultReady, refreshNotes, user]);

    const addNote = async (newNote) => {
        try {
            const savedNote = await api.post('/notes', {
                content: encryptContent(newNote.content),
                is_favorite: Boolean(newNote.isFavorite),
                title: newNote.title,
            });
            setNotes((previous) => [hydrateNote(savedNote), ...previous]);
            toast.success('Nota creada');
            return { success: true };
        } catch (error) {
            console.error('Error adding note', error);
            toast.error(error.message || 'No se pudo crear la nota');
            return { success: false, error: error.message };
        }
    };

    const updateNote = async (id, updates) => {
        const current = notes.find((note) => note.id === id);
        if (!current) {
            return { success: false, error: 'Nota no encontrada' };
        }

        const merged = {
            ...current,
            ...updates,
            isFavorite: updates.isFavorite ?? updates.is_favorite ?? current.isFavorite,
        };

        try {
            const updatedNote = await api.put(`/notes/${id}`, {
                content: encryptContent(merged.content),
                is_favorite: Boolean(merged.isFavorite),
                title: merged.title,
            });
            setNotes((previous) =>
                previous.map((note) => (note.id === id ? hydrateNote(updatedNote) : note))
            );
            toast.success('Nota actualizada');
            return { success: true };
        } catch (error) {
            console.error('Error updating note', error);
            toast.error(error.message || 'No se pudo actualizar la nota');
            return { success: false, error: error.message };
        }
    };

    const toggleFavoriteNote = async (id) => {
        const current = notes.find((note) => note.id === id);
        if (!current) {
            return;
        }

        await updateNote(id, { isFavorite: !current.isFavorite });
    };

    const deleteNote = async (id) => {
        try {
            await api.delete(`/notes/${id}`);
            setNotes((previous) =>
                previous.map((note) =>
                    note.id === id
                        ? {
                            ...note,
                            deletedAt: new Date().toISOString(),
                            deleted_at: new Date().toISOString(),
                            isDeleted: true,
                            is_deleted: true,
                        }
                        : note
                )
            );
            toast.success('Nota eliminada');
        } catch (error) {
            console.error('Error deleting note', error);
            toast.error(error.message || 'No se pudo eliminar la nota');
        }
    };

    const restoreNote = async (id) => {
        try {
            const restoredNote = await api.put(`/notes/${id}/restore`);
            setNotes((previous) =>
                previous.map((note) => (note.id === id ? hydrateNote(restoredNote) : note))
            );
            toast.success('Nota restaurada');
        } catch (error) {
            console.error('Error restoring note', error);
            toast.error(error.message || 'No se pudo restaurar la nota');
        }
    };

    const permanentlyDeleteNote = async (id) => {
        try {
            await api.delete(`/notes/${id}/permanent`);
            setNotes((previous) => previous.filter((note) => note.id !== id));
            toast.success('Nota eliminada definitivamente');
        } catch (error) {
            console.error('Error permanently deleting note', error);
            toast.error(error.message || 'No se pudo eliminar la nota');
        }
    };

    return (
        <NotesContext.Provider
            value={{
                addNote,
                deleteNote,
                notes,
                permanentlyDeleteNote,
                refreshNotes,
                restoreNote,
                toggleFavoriteNote,
                updateNote,
            }}
        >
            {children}
        </NotesContext.Provider>
    );
}
