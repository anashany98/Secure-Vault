import { createContext, useContext } from 'react';
import toast from 'react-hot-toast';

import { api } from '../lib/api';
import { getApiUrl } from '../lib/env';

const ShareContext = createContext();
const API_URL = getApiUrl();

function getCookie(name) {
    const prefix = `${name}=`;
    return document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
        ?.slice(prefix.length) || '';
}

export function useShare() {
    return useContext(ShareContext);
}

export function ShareProvider({ children }) {
    const generateShareLink = async (item, type = 'password', options = {}) => {
        try {
            const encryptedData = (() => {
                if (type === 'password' && options.includeUsername === false) {
                    const copy = { ...item };
                    delete copy.username;
                    return copy;
                }

                return item;
            })();

            const { id } = await api.post('/shares', {
                encryptedData,
                type,
                settings: {
                    expiration: options.expiration,
                    views: options.views,
                },
            });

            return `${window.location.origin}/share/${id}`;
        } catch (error) {
            console.error(error);
            toast.error('Error al crear el enlace compartido');
            return null;
        }
    };

    const getShare = async (shareId) => {
        try {
            const response = await fetch(`${API_URL}/shares/${shareId}`);
            if (!response.ok) {
                const errorData = await response.json();
                return { error: errorData.error || 'Error al obtener el enlace' };
            }

            return { data: await response.json() };
        } catch {
            return { error: 'Error de conexion' };
        }
    };

    const consumeShare = async (shareId) => {
        try {
            const csrfToken = getCookie('securevault_csrf');
            const response = await fetch(`${API_URL}/shares/${shareId}/reveal`, {
                credentials: 'include',
                headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                toast.error(errorData.error || 'Error al revelar secreto');
                return null;
            }

            return response.json();
        } catch (error) {
            console.error(error);
            toast.error('Error de conexion');
            return null;
        }
    };

    return (
        <ShareContext.Provider
            value={{
                consumeShare,
                generateShareLink,
                getShare,
            }}
        >
            {children}
        </ShareContext.Provider>
    );
}
