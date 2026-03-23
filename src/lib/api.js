import { getApiUrl } from './env';

const API_URL = getApiUrl();

function getCookie(name) {
    const prefix = `${name}=`;
    return document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
        ?.slice(prefix.length) || '';
}

function getHeaders() {
    const csrfToken = getCookie('securevault_csrf');

    return {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    };
}

async function parseResponse(res) {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return res.json();
    }

    const text = await res.text();
    return text ? { message: text } : null;
}

async function request(method, endpoint, body) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        credentials: 'include',
        headers: getHeaders(),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const data = await parseResponse(response);
    if (!response.ok) {
        const error = new Error(
            data?.message || data?.error || response.statusText || 'API request failed'
        );
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export const api = {
    delete: (endpoint) => request('DELETE', endpoint),
    del: (endpoint) => request('DELETE', endpoint),
    get: (endpoint) => request('GET', endpoint),
    post: (endpoint, body) => request('POST', endpoint, body),
    put: (endpoint, body) => request('PUT', endpoint, body),
};
