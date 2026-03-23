import CryptoJS from 'crypto-js';

export const MASTER_KDF_ALGORITHM = 'PBKDF2-SHA256';
export const MASTER_KDF_ITERATIONS = 310000;

const NOTES_KEY_CHECK = 'securevault:notes-key-check:v1';
const VAULT_KEY_CHECK = 'securevault:vault-key-check:v1';

function parseBase64WordArray(value) {
    return CryptoJS.enc.Base64.parse(value);
}

function deriveWrappingKey(masterPassword, salt, iterations = MASTER_KDF_ITERATIONS) {
    return CryptoJS.PBKDF2(masterPassword, parseBase64WordArray(salt), {
        hasher: CryptoJS.algo.SHA256,
        iterations,
        keySize: 256 / 32,
    }).toString(CryptoJS.enc.Hex);
}

export function generateSecretKey() {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
}

export function encryptStringWithKey(value, key) {
    return CryptoJS.AES.encrypt(value || '', key).toString();
}

export function decryptStringWithKey(value, key) {
    if (!value) {
        return '';
    }

    const bytes = CryptoJS.AES.decrypt(value, key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptCustomFieldsWithKey(fields = [], key) {
    return fields.map((field) => ({
        ...field,
        value: encryptStringWithKey(field.value, key),
    }));
}

export function decryptCustomFieldsWithKey(fields = [], key) {
    return fields.map((field) => ({
        ...field,
        value: decryptStringWithKey(field.value, key),
    }));
}

export function createWrappedVaultSecrets(masterPassword) {
    return createWrappedVaultSecretsFromExistingKeys(masterPassword, {
        notesKey: generateSecretKey(),
        vaultKey: generateSecretKey(),
    });
}

export function createWrappedVaultSecretsFromExistingKeys(masterPassword, keys) {
    const vaultKey = keys?.vaultKey;
    const notesKey = keys?.notesKey;
    if (!vaultKey || !notesKey) {
        throw new Error('Missing vault keys to wrap');
    }

    const kdfSalt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
    const wrappingKey = deriveWrappingKey(masterPassword, kdfSalt, MASTER_KDF_ITERATIONS);

    return {
        keys: {
            notesKey,
            vaultKey,
        },
        metadata: {
            kdf: {
                algorithm: MASTER_KDF_ALGORITHM,
                iterations: MASTER_KDF_ITERATIONS,
                salt: kdfSalt,
            },
            notesKeyVerifier: encryptStringWithKey(NOTES_KEY_CHECK, notesKey),
            vaultKeyVerifier: encryptStringWithKey(VAULT_KEY_CHECK, vaultKey),
            wrappedNotesKey: encryptStringWithKey(notesKey, wrappingKey),
            wrappedVaultKey: encryptStringWithKey(vaultKey, wrappingKey),
        },
    };
}

export function unwrapVaultSecrets(masterPassword, vaultAccess) {
    const salt = vaultAccess?.kdf?.salt;
    const iterations = Number(vaultAccess?.kdf?.iterations || MASTER_KDF_ITERATIONS);
    const wrappedVaultKey = vaultAccess?.wrappedKeys?.vault;
    const wrappedNotesKey = vaultAccess?.wrappedKeys?.notes;

    if (!salt || !wrappedVaultKey || !wrappedNotesKey) {
        throw new Error('Vault access metadata is incomplete');
    }

    const wrappingKey = deriveWrappingKey(masterPassword, salt, iterations);
    const vaultKey = decryptStringWithKey(wrappedVaultKey, wrappingKey);
    const notesKey = decryptStringWithKey(wrappedNotesKey, wrappingKey);

    if (!vaultKey || !notesKey) {
        throw new Error('Master password incorrecta');
    }

    const vaultCheck = decryptStringWithKey(vaultAccess?.verifiers?.vault, vaultKey);
    const notesCheck = decryptStringWithKey(vaultAccess?.verifiers?.notes, notesKey);

    if (vaultCheck !== VAULT_KEY_CHECK || notesCheck !== NOTES_KEY_CHECK) {
        throw new Error('Master password incorrecta');
    }

    return {
        notesKey,
        vaultKey,
    };
}
