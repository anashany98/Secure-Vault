import { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const NotesContext = createContext();

export const useNotes = () => useContext(NotesContext);

const ENCRYPTION_KEY = import.meta.env.VITE_NOTES_KEY || 'demo-secret-key-change-this-in-prod';

export const NotesProvider = ({ children }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        if (!user) {
            setNotes([]);
            return;
        }

        const fetchNotes = async () => {
            try {
                const items = await api.get('/notes');
                const decrypted = items.map(item => {
                    try {
                        const bytes = CryptoJS.AES.decrypt(item.content, ENCRYPTION_KEY);
                        const content = bytes.toString(CryptoJS.enc.Utf8);
                        return { ...item, content };
                    } catch (e) {
                        return { ...item, content: 'Error decrypting' };
                    }
                });
                setNotes(decrypted);
            } catch (err) {
                console.warn("API Notes failed, falling back to LocalStorage", err);
                const localData = localStorage.getItem(`notes_${user.email}`);
                if (localData) {
                    setNotes(JSON.parse(localData));
                } else {
                    setNotes([]);
                }
            }
        };

        fetchNotes();
    }, [user]);

    const saveToLocal = (newNotes) => {
        if (user?.email) {
            localStorage.setItem(`notes_${user.email}`, JSON.stringify(newNotes));
        }
    };

    const addNote = async (newNote) => {
        const tempId = Date.now().toString();
        const noteWithId = { ...newNote, id: tempId, isDeleted: false, createdAt: new Date().toISOString() };

        try {
            const encryptedContent = CryptoJS.AES.encrypt(newNote.content, ENCRYPTION_KEY).toString();
            const payload = {
                title: newNote.title,
                content: encryptedContent,
                is_favorite: newNote.isFavorite || false
            };

            const savedNote = await api.post('/notes', payload);
            setNotes(prev => [{ ...savedNote, content: newNote.content }, ...prev]);
            toast.success('Nota creada');
        } catch (err) {
            console.warn("API Add Note failed, saving locally");
            setNotes(prev => {
                const newState = [noteWithId, ...prev];
                saveToLocal(newState);
                return newState;
            });
            toast.success('Nota creada (Offline)');
        }
    };

    const updateNote = async (id, updates) => {
        try {
            const current = notes.find(n => n.id === id);
            if (!current) return;
            const merged = { ...current, ...updates };

            if (id.toString().length < 15) {
                const encryptedContent = CryptoJS.AES.encrypt(merged.content, ENCRYPTION_KEY).toString();
                const payload = {
                    title: merged.title,
                    content: encryptedContent,
                    is_favorite: merged.isFavorite
                };
                await api.put(`/notes/${id}`, payload);
            } else {
                throw new Error("Offline ID");
            }

            setNotes(prev => prev.map(n => n.id === id ? { ...merged } : n));
            toast.success('Nota actualizada');
        } catch (err) {
            setNotes(prev => {
                const newState = prev.map(n => n.id === id ? { ...n, ...updates } : n);
                saveToLocal(newState);
                return newState;
            });
            toast.success('Nota actualizada (Offline)');
        }
    };

    const deleteNote = async (id) => {
        try {
            if (id.toString().length < 15) {
                await api.delete(`/notes/${id}`);
            } else {
                throw new Error("Offline ID");
            }
            setNotes(prev => prev.map(n => n.id === id ? { ...n, isDeleted: true, deletedAt: new Date().toISOString() } : n));
            toast.success('Nota eliminada');
        } catch (err) {
            setNotes(prev => {
                const newState = prev.map(n => n.id === id ? { ...n, isDeleted: true, deletedAt: new Date().toISOString() } : n);
                saveToLocal(newState);
                return newState;
            });
            toast.success('Nota eliminada (Offline)');
        }
    };

    const restoreNote = (id) => {
        setNotes(prev => {
            const newState = prev.map(n => n.id === id ? { ...n, isDeleted: false, deletedAt: null } : n);
            saveToLocal(newState);
            return newState;
        });
        toast.success('Nota restaurada');
    };

    const permanentlyDeleteNote = (id) => {
        setNotes(prev => {
            const newState = prev.filter(n => n.id !== id);
            saveToLocal(newState);
            return newState;
        });
        toast.success('Nota eliminada permanentemente');
    };


    return (
        <NotesContext.Provider value={{
            notes,
            addNote,
            updateNote,
            deleteNote,
            restoreNote,
            permanentlyDeleteNote
        }}>
            {children}
        </NotesContext.Provider>
    );
};
