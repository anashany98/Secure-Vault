const API_URL = '/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
};

export const api = {
    get: async (endpoint) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                headers: getHeaders(),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(err.message || 'API Error');
            }
            return res.json();
        } catch (e) {
            console.error(`API GET ${endpoint} failed:`, e);
            throw e; // Propagate to let context handle fallback
        }
    },

    post: async (endpoint, body) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(err.message || 'API Error');
            }
            return res.json();
        } catch (e) {
            console.error(`API POST ${endpoint} failed:`, e);
            throw e;
        }
    },

    put: async (endpoint, body) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(res.statusText);
            return res.json();
        } catch (e) {
            console.error(`API PUT ${endpoint} failed:`, e);
            throw e;
        }
    },

    delete: async (endpoint) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error(res.statusText);
            return res.json();
        } catch (e) {
            console.error(`API DELETE ${endpoint} failed:`, e);
            throw e;
        }
    },
};
