import { createContext, useContext, useState } from 'react';

const ViewContext = createContext();

export const useView = () => useContext(ViewContext);

export const ViewProvider = ({ children }) => {
    const [currentView, setCurrentView] = useState('all'); // all, favorites, trash, settings, folder
    const [activeFolderId, setActiveFolderId] = useState(null);

    return (
        <ViewContext.Provider value={{ currentView, setCurrentView, activeFolderId, setActiveFolderId }}>
            {children}
        </ViewContext.Provider>
    );
};
