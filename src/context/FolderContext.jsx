import { createContext, useContext, useState, useEffect } from 'react';

const FolderContext = createContext();

export const useFolders = () => useContext(FolderContext);

const FOLDERS_KEY = 'secure_vault_folders';

export const FolderProvider = ({ children }) => {
    const [folders, setFolders] = useState(() => {
        const stored = localStorage.getItem(FOLDERS_KEY);
        return stored ? JSON.parse(stored) : [
            { id: 'root', name: 'Todas las contraseñas', parentId: null, color: 'blue' },
            { id: 'work', name: 'Trabajo', parentId: 'root', color: 'purple' },
            { id: 'personal', name: 'Personal', parentId: 'root', color: 'green' },
            { id: 'finance', name: 'Finanzas', parentId: 'root', color: 'yellow' },
        ];
    });

    useEffect(() => {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    }, [folders]);

    const addFolder = (name, parentId = 'root', color = 'blue') => {
        const newFolder = {
            id: `folder_${Date.now()}`,
            name,
            parentId,
            color
        };
        setFolders([...folders, newFolder]);
        return newFolder.id;
    };

    const updateFolder = (id, updates) => {
        setFolders(folders.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const deleteFolder = (id) => {
        setFolders(folders.filter(f => f.id !== id && f.parentId !== id));
    };

    const renameFolder = (id, newName) => {
        setFolders(folders.map(f => f.id === id ? { ...f, name: newName } : f));
    };

    const getFolderPath = (folderId) => {
        const path = [];
        let current = folders.find(f => f.id === folderId);
        while (current && current.id !== 'root') {
            path.unshift(current);
            current = folders.find(f => f.id === current.parentId);
        }
        return path;
    };

    const getSubfolders = (parentId) => {
        return folders.filter(f => f.parentId === parentId);
    };

    return (
        <FolderContext.Provider value={{
            folders,
            addFolder,
            updateFolder,
            deleteFolder,
            renameFolder,
            getFolderPath,
            getSubfolders
        }}>
            {children}
        </FolderContext.Provider>
    );
};
