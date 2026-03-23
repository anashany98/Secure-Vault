const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { resolveDbPath } = require('../sqlite_db');

const MANIFEST_VERSION = 1;

function readSecretFromEnv(primaryName, legacyName) {
    const primary = process.env[primaryName]?.trim();
    if (primary) {
        return primary;
    }

    const legacy = process.env[legacyName]?.trim();
    if (legacy) {
        return legacy;
    }

    if (process.env.NODE_ENV === 'test') {
        return `${primaryName.toLowerCase()}-test-value`;
    }

    throw new Error(
        `Missing required client crypto key: ${primaryName}. ` +
        `Set ${primaryName} in the backend environment.`
    );
}

function fingerprintSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
}

function resolveManifestPath() {
    const configuredPath = process.env.CLIENT_CRYPTO_MANIFEST_PATH?.trim();
    if (configuredPath) {
        return path.isAbsolute(configuredPath)
            ? configuredPath
            : path.resolve(__dirname, '..', configuredPath);
    }

    if (process.env.DB_CLIENT === 'sqlite') {
        return path.join(path.dirname(resolveDbPath()), 'crypto-key-manifest.json');
    }

    return path.resolve(__dirname, '../crypto-key-manifest.json');
}

function buildCurrentManifest() {
    const vaultKey = readSecretFromEnv('CLIENT_VAULT_KEY', 'VITE_VAULT_KEY');
    const notesKey = readSecretFromEnv('CLIENT_NOTES_KEY', 'VITE_NOTES_KEY');

    return {
        createdAt: new Date().toISOString(),
        notesKeyFingerprint: fingerprintSecret(notesKey),
        notesKey,
        vaultKeyFingerprint: fingerprintSecret(vaultKey),
        vaultKey,
        version: MANIFEST_VERSION,
    };
}

function readExistingManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
}

function writeManifest(manifestPath, manifest) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

    fs.writeFileSync(
        manifestPath,
        JSON.stringify(
            {
                createdAt: manifest.createdAt,
                notesKeyFingerprint: manifest.notesKeyFingerprint,
                vaultKeyFingerprint: manifest.vaultKeyFingerprint,
                version: manifest.version,
            },
            null,
            2
        )
    );
}

let cachedClientCryptoConfig = null;

function ensureStableClientCryptoKeys() {
    if (cachedClientCryptoConfig) {
        return cachedClientCryptoConfig;
    }

    const manifestPath = resolveManifestPath();
    const current = buildCurrentManifest();
    const existing = readExistingManifest(manifestPath);

    if (existing) {
        const vaultMatches = existing.vaultKeyFingerprint === current.vaultKeyFingerprint;
        const notesMatch = existing.notesKeyFingerprint === current.notesKeyFingerprint;

        if (!vaultMatches || !notesMatch) {
            throw new Error(
                `Client crypto keys do not match the persisted manifest at ${manifestPath}. ` +
                `Restore the original CLIENT_VAULT_KEY/CLIENT_NOTES_KEY values before deploying.`
            );
        }
    } else {
        writeManifest(manifestPath, current);
    }

    cachedClientCryptoConfig = {
        manifestPath,
        notesKey: current.notesKey,
        notesKeyFingerprint: current.notesKeyFingerprint,
        vaultKey: current.vaultKey,
        vaultKeyFingerprint: current.vaultKeyFingerprint,
    };

    return cachedClientCryptoConfig;
}

function getClientCryptoFingerprints() {
    const config = ensureStableClientCryptoKeys();
    return {
        notesKeyFingerprint: config.notesKeyFingerprint,
        vaultKeyFingerprint: config.vaultKeyFingerprint,
    };
}

function getClientCryptoPayload() {
    const config = ensureStableClientCryptoKeys();
    return {
        fingerprints: getClientCryptoFingerprints(),
        notesKey: config.notesKey,
        vaultKey: config.vaultKey,
    };
}

module.exports = {
    ensureStableClientCryptoKeys,
    getClientCryptoFingerprints,
    getClientCryptoPayload,
    resolveManifestPath,
};
