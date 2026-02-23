import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ShareContext = createContext();

export const useShare = () => useContext(ShareContext);

const SHARES_KEY = 'vault_local_shares';

export const ShareProvider = ({ children }) => {

    // API URL helper
    const API_URL = import.meta.env.VITE_API_URL || '/api';

    const generateShareLink = async (item, type = 'password', options = {}) => {
        try {
            const encryptedData = (() => {
                if (type === 'password' && options.includeUsername === false) {
                    const { username, ...rest } = item;
                    return rest;
                }
                return item;
            })();

            const res = await fetch(`${API_URL}/shares`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    encryptedData,
                    type,
                    settings: {
                        expiration: options.expiration,
                        views: options.views
                    }
                })
            });

            if (!res.ok) throw new Error('Error generando enlace');

            const { id } = await res.json();

            // Construct Link
            const link = `${window.location.origin}/share/${id}`;
            return link;
        } catch (error) {
            console.error(error);
            toast.error('Error al crear el enlace compartido');
            return null;
        }
    };

    const getShare = async (shareId) => {
        try {
            const res = await fetch(`${API_URL}/shares/${shareId}`);
            if (!res.ok) {
                const err = await res.json();
                return { error: err.error || 'Error al obtener el enlace' };
            }
            const data = await res.json();
            return { data };
        } catch (error) {
            return { error: 'Error de conexión' };
        }
    };

    const consumeShare = async (shareId) => {
        try {
            const res = await fetch(`${API_URL}/shares/${shareId}/reveal`, {
                method: 'POST'
            });

            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || 'Error al revelar secreto');
                return null;
            }

            const data = await res.json();
            return data; // Returns { encryptedData, type }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
            return null;
        }
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
