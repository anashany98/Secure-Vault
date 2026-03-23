const pool = require('../db');

const TEAM_VAULT_MODE = 'team';
const TEAM_SCOPE = 'team';
const USER_SCOPE = 'user';

function hasWrappedVaultMaterial(user) {
    return Boolean(
        user?.vault_kdf_salt &&
        user?.vault_kdf_iterations &&
        user?.vault_wrapped_vault_key &&
        user?.vault_wrapped_notes_key &&
        user?.vault_key_verifier &&
        user?.notes_key_verifier
    );
}

function isVaultConfigured(user) {
    return hasWrappedVaultMaterial(user) && user?.vault_access_scope === TEAM_SCOPE;
}

function isLegacyPersonalVaultConfigured(user) {
    return hasWrappedVaultMaterial(user) && user?.vault_access_scope !== TEAM_SCOPE;
}

async function getVaultModeConfig(executor = pool) {
    const result = await executor.query(
        `SELECT key, value
         FROM app_config
         WHERE key IN ('vault_access_mode', 'team_vault_initialized_at', 'team_vault_initialized_by')`
    );

    const config = Object.create(null);
    result.rows.forEach((row) => {
        config[row.key] = row.value;
    });

    return {
        initializedAt: config.team_vault_initialized_at || null,
        initializedBy: config.team_vault_initialized_by || null,
        mode: config.vault_access_mode || null,
        teamInitialized: config.vault_access_mode === TEAM_VAULT_MODE,
    };
}

async function getPendingTeamVaultInvitation(userId, executor = pool) {
    if (!userId) {
        return null;
    }

    const result = await executor.query(
        `SELECT invitation.*, creator.name AS created_by_name, creator.email AS created_by_email
         FROM team_vault_invitations invitation
         LEFT JOIN users creator ON creator.id = invitation.created_by
         WHERE invitation.user_id = $1
           AND (invitation.expires_at IS NULL OR invitation.expires_at > CURRENT_TIMESTAMP)`,
        [userId]
    );

    return result.rows[0] || null;
}

async function hasLegacyVaultData(userId, executor = pool) {
    const result = await executor.query(
        `SELECT
            EXISTS(
                SELECT 1
                FROM vault_items
                WHERE user_id = $1
                  AND COALESCE(crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'
            ) AS has_vault_items,
            EXISTS(
                SELECT 1
                FROM notes
                WHERE user_id = $1
                  AND COALESCE(crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'
            ) AS has_notes`,
        [userId]
    );

    const row = result.rows[0] || {};
    return Boolean(row.has_vault_items || row.has_notes);
}

async function buildVaultAccess(user, executor = pool) {
    if (!user?.id) {
        return {
            isConfigured: false,
            migrationRequired: false,
            mode: TEAM_VAULT_MODE,
            teamInitialized: false,
        };
    }

    const modeConfig = await getVaultModeConfig(executor);
    const hasWrappedMaterial = hasWrappedVaultMaterial(user);

    if (!modeConfig.teamInitialized) {
        if (hasWrappedMaterial) {
            return {
                isConfigured: true,
                kdf: {
                    algorithm: 'PBKDF2-SHA256',
                    iterations: Number(user.vault_kdf_iterations),
                    salt: user.vault_kdf_salt,
                },
                legacyPersonalVault: isLegacyPersonalVaultConfigured(user),
                migratedAt: user.vault_crypto_migrated_at || null,
                migrationRequired: false,
                mode: TEAM_VAULT_MODE,
                needsTeamBootstrap: true,
                teamInitialized: false,
                verifiers: {
                    notes: user.notes_key_verifier,
                    vault: user.vault_key_verifier,
                },
                wrappedKeys: {
                    notes: user.vault_wrapped_notes_key,
                    vault: user.vault_wrapped_vault_key,
                },
            };
        }

        return {
            canInitialize: String(user.role || '').toLowerCase() === 'admin',
            isConfigured: false,
            migrationRequired: await hasLegacyVaultData(user.id, executor),
            mode: TEAM_VAULT_MODE,
            teamInitialized: false,
        };
    }

    if (isVaultConfigured(user)) {
        return {
            isConfigured: true,
            kdf: {
                algorithm: 'PBKDF2-SHA256',
                iterations: Number(user.vault_kdf_iterations),
                salt: user.vault_kdf_salt,
            },
            migratedAt: user.vault_crypto_migrated_at || null,
            migrationRequired: false,
            mode: TEAM_VAULT_MODE,
            teamInitialized: true,
            verifiers: {
                notes: user.notes_key_verifier,
                vault: user.vault_key_verifier,
            },
            wrappedKeys: {
                notes: user.vault_wrapped_notes_key,
                vault: user.vault_wrapped_vault_key,
            },
        };
    }

    const pendingInvitation = await getPendingTeamVaultInvitation(user.id, executor);

    return {
        awaitingProvision: !pendingInvitation,
        invitationPending: Boolean(pendingInvitation),
        isConfigured: false,
        legacyPersonalVault: isLegacyPersonalVaultConfigured(user),
        migrationRequired: await hasLegacyVaultData(user.id, executor),
        mode: TEAM_VAULT_MODE,
        pendingInvitation: pendingInvitation
            ? {
                createdAt: pendingInvitation.created_at || null,
                createdBy: pendingInvitation.created_by
                    ? {
                        email: pendingInvitation.created_by_email || null,
                        id: pendingInvitation.created_by,
                        name: pendingInvitation.created_by_name || null,
                    }
                    : null,
                expiresAt: pendingInvitation.expires_at || null,
                id: pendingInvitation.id,
            }
            : null,
        teamInitialized: true,
    };
}

async function backupRequiresLegacyCrypto(executor = pool) {
    const result = await executor.query(
        `SELECT EXISTS(
            SELECT 1
            FROM users u
            WHERE (
                u.vault_kdf_salt IS NULL OR
                u.vault_wrapped_vault_key IS NULL OR
                u.vault_wrapped_notes_key IS NULL OR
                u.vault_key_verifier IS NULL OR
                u.notes_key_verifier IS NULL
            )
            AND (
                EXISTS(
                    SELECT 1
                    FROM vault_items v
                    WHERE v.user_id = u.id
                      AND COALESCE(v.crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'
                ) OR
                EXISTS(
                    SELECT 1
                    FROM notes n
                    WHERE n.user_id = u.id
                      AND COALESCE(n.crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'
                )
            )
        ) AS requires_legacy_crypto`
    );

    return Boolean(result.rows[0]?.requires_legacy_crypto);
}

module.exports = {
    TEAM_SCOPE,
    USER_SCOPE,
    TEAM_VAULT_MODE,
    backupRequiresLegacyCrypto,
    buildVaultAccess,
    getPendingTeamVaultInvitation,
    getVaultModeConfig,
    hasLegacyVaultData,
    hasWrappedVaultMaterial,
    isLegacyPersonalVaultConfigured,
    isVaultConfigured,
};
