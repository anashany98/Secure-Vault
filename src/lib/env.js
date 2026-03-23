let runtimeCryptoConfig = null;

export function setRuntimeCryptoConfig(config) {
    if (!config?.vaultKey || !config?.notesKey) {
        throw new Error('Invalid runtime crypto configuration');
    }

    runtimeCryptoConfig = {
        fingerprints: config.fingerprints || null,
        notesKey: config.notesKey,
        vaultKey: config.vaultKey,
    };
}

export function clearRuntimeCryptoConfig() {
    runtimeCryptoConfig = null;
}

export function hasRuntimeCryptoConfig() {
    return Boolean(runtimeCryptoConfig?.vaultKey && runtimeCryptoConfig?.notesKey);
}

function getRuntimeValue(runtimeKey) {
    const runtimeValue = runtimeCryptoConfig?.[runtimeKey];
    if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
        return runtimeValue.trim();
    }

    throw new Error('La boveda esta bloqueada. Introduce tu master password para continuar.');
}

export function getVaultKey() {
    return getRuntimeValue('vaultKey');
}

export function getNotesKey() {
    return getRuntimeValue('notesKey');
}

export function getApiUrl() {
    const value = import.meta.env.VITE_API_URL;
    return typeof value === 'string' && value.trim() ? value.trim() : '/api';
}
