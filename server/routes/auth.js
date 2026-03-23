const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const speakeasy = require('speakeasy');

const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const { loginLimiter } = require('../middleware/rateLimiter');
const auditLog = require('../utils/auditLogger');
const {
    authChallengeCookieName,
    isTest,
    jwtSecret,
    loginLockoutAttempts,
    loginLockoutMinutes,
    mandatory2faEmails,
    mandatory2faRoles,
    sessionCookieName,
} = require('../config');
const { getClientCryptoPayload } = require('../services/clientCryptoService');
const {
    TEAM_SCOPE,
    USER_SCOPE,
    buildVaultAccess,
    getPendingTeamVaultInvitation,
    getVaultModeConfig,
    hasLegacyVaultData,
    hasWrappedVaultMaterial,
    isVaultConfigured,
} = require('../services/vaultAccessService');
const { parseArrayValue } = require('../utils/serializers');
const {
    clearSessionCookies,
    parseCookies,
    setChallengeCookies,
    setSessionCookies,
} = require('../utils/authCookies');

const AUTH_CHALLENGE_TYPES = {
    LOGIN_2FA: 'login_2fa',
    SETUP_2FA: 'setup_2fa',
};

function serializeUser(user, extra = {}) {
    return {
        id: user.id,
        email: user.email,
        mustSetup2FA: Boolean(extra.mustSetup2FA),
        name: user.name,
        role: user.role,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        two_factor_required: isTwoFactorRequired(user),
    };
}

function normalizeNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${fieldName} is required`);
    }

    return value.trim();
}

function normalizePositiveInteger(value, fieldName) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${fieldName} must be a positive integer`);
    }

    return parsed;
}

function buildVaultSetupPayload(body = {}) {
    return {
        kdfIterations: normalizePositiveInteger(body.kdfIterations, 'kdfIterations'),
        kdfSalt: normalizeNonEmptyString(body.kdfSalt, 'kdfSalt'),
        migration: {
            attachments: parseArrayValue(body.migration?.attachments),
            notes: parseArrayValue(body.migration?.notes),
            passwordHistory: parseArrayValue(body.migration?.passwordHistory),
            vaultItems: parseArrayValue(body.migration?.vaultItems),
        },
        notesKeyVerifier: normalizeNonEmptyString(body.notesKeyVerifier, 'notesKeyVerifier'),
        vaultKeyVerifier: normalizeNonEmptyString(body.vaultKeyVerifier, 'vaultKeyVerifier'),
        wrappedNotesKey: normalizeNonEmptyString(body.wrappedNotesKey, 'wrappedNotesKey'),
        wrappedVaultKey: normalizeNonEmptyString(body.wrappedVaultKey, 'wrappedVaultKey'),
    };
}

function buildTeamVaultInvitationPayload(body = {}) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
        throw new Error('expiresAt must be a valid date');
    }

    return {
        encryptedNotesKey: normalizeNonEmptyString(body.encryptedNotesKey, 'encryptedNotesKey'),
        encryptedVerifier: normalizeNonEmptyString(body.encryptedVerifier, 'encryptedVerifier'),
        encryptedVaultKey: normalizeNonEmptyString(body.encryptedVaultKey, 'encryptedVaultKey'),
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        targetUserId: normalizeNonEmptyString(body.targetUserId, 'targetUserId'),
    };
}

function buildTeamVaultAcceptPayload(body = {}) {
    return {
        invitationId: normalizeNonEmptyString(body.invitationId, 'invitationId'),
        setup: buildVaultSetupPayload(body),
    };
}

async function collectLegacyMigrationCounts(userId, executor = pool) {
    const [vaultItems, notes, attachments, passwordHistory] = await Promise.all([
        executor.query(
            `SELECT COUNT(*) AS total
             FROM vault_items
             WHERE user_id = $1
               AND COALESCE(crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'`,
            [userId]
        ),
        executor.query(
            `SELECT COUNT(*) AS total
             FROM notes
             WHERE user_id = $1
               AND COALESCE(crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'`,
            [userId]
        ),
        executor.query(
            `SELECT COUNT(*) AS total
             FROM vault_item_attachments attachment
             JOIN vault_items item ON item.id = attachment.vault_item_id
             WHERE item.user_id = $1
               AND COALESCE(item.crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'`,
            [userId]
        ),
        executor.query(
            `SELECT COUNT(*) AS total
             FROM password_history history
             JOIN vault_items item ON item.id = history.vault_item_id
             WHERE item.user_id = $1
               AND COALESCE(item.crypto_scope, '${USER_SCOPE}') <> '${TEAM_SCOPE}'`,
            [userId]
        ),
    ]);

    return {
        attachments: Number(attachments.rows[0]?.total || 0),
        notes: Number(notes.rows[0]?.total || 0),
        passwordHistory: Number(passwordHistory.rows[0]?.total || 0),
        vaultItems: Number(vaultItems.rows[0]?.total || 0),
    };
}

function assertMigrationShape(items = [], valueField, label) {
    items.forEach((item) => {
        if (!item?.id || typeof item.id !== 'string') {
            throw new Error(`Invalid ${label} migration payload`);
        }
        if (typeof item[valueField] !== 'string' || !item[valueField]) {
            throw new Error(`Invalid ${label} migration payload`);
        }
    });
}

async function upsertAppConfig(executor, key, value) {
    await executor.query(
        `INSERT INTO app_config (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
    );
}

async function initializeTeamVaultConfig(executor, userId) {
    await Promise.all([
        upsertAppConfig(executor, 'vault_access_mode', 'team'),
        upsertAppConfig(executor, 'team_vault_initialized_at', new Date().toISOString()),
        upsertAppConfig(executor, 'team_vault_initialized_by', userId),
    ]);
}

async function promoteLegacyOwnedDataToTeamScope(userId, executor) {
    await Promise.all([
        executor.query(
            `UPDATE vault_items
             SET crypto_scope = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
               AND COALESCE(crypto_scope, $3) <> $1`,
            [TEAM_SCOPE, userId, USER_SCOPE]
        ),
        executor.query(
            `UPDATE notes
             SET crypto_scope = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
               AND COALESCE(crypto_scope, $3) <> $1`,
            [TEAM_SCOPE, userId, USER_SCOPE]
        ),
    ]);
}

async function applyLegacyMigrationPayload(userId, migration, executor) {
    for (const item of migration.vaultItems) {
        const updateResult = await executor.query(
            `UPDATE vault_items
             SET encrypted_password = $1,
                 custom_fields = $2,
                 crypto_scope = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
               AND user_id = $5
               AND COALESCE(crypto_scope, $6) <> $3`,
            [
                item.encrypted_password,
                parseArrayValue(item.custom_fields),
                TEAM_SCOPE,
                item.id,
                userId,
                USER_SCOPE,
            ]
        );
        if (updateResult.rowCount !== 1) {
            throw new Error(`Failed to migrate vault item ${item.id}`);
        }
    }

    for (const note of migration.notes) {
        const updateResult = await executor.query(
            `UPDATE notes
             SET content = $1,
                 crypto_scope = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
               AND user_id = $4
               AND COALESCE(crypto_scope, $5) <> $2`,
            [note.content, TEAM_SCOPE, note.id, userId, USER_SCOPE]
        );
        if (updateResult.rowCount !== 1) {
            throw new Error(`Failed to migrate note ${note.id}`);
        }
    }

    for (const attachment of migration.attachments) {
        const updateResult = await executor.query(
            `UPDATE vault_item_attachments
             SET encrypted_data = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
               AND vault_item_id IN (
                   SELECT id
                   FROM vault_items
                   WHERE user_id = $3
               )`,
            [attachment.encrypted_data, attachment.id, userId]
        );
        if (updateResult.rowCount !== 1) {
            throw new Error(`Failed to migrate attachment ${attachment.id}`);
        }
    }

    for (const history of migration.passwordHistory) {
        const updateResult = await executor.query(
            `UPDATE password_history
             SET encrypted_password = $1
             WHERE id = $2
               AND vault_item_id IN (
                   SELECT id
                   FROM vault_items
                   WHERE user_id = $3
               )`,
            [history.encrypted_password, history.id, userId]
        );
        if (updateResult.rowCount !== 1) {
            throw new Error(`Failed to migrate password history ${history.id}`);
        }
    }
}

function getRequestMetadata(req) {
    return {
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
    };
}

function isTwoFactorRequired(user) {
    const email = String(user.email || '').trim().toLowerCase();
    const role = String(user.role || '').trim().toLowerCase();

    return mandatory2faRoles.includes(role) || mandatory2faEmails.includes(email);
}

function createAuthChallengeToken(user, challengeType) {
    return jwt.sign(
        { challengeType, id: user.id, isAuthChallenge: true },
        jwtSecret,
        { expiresIn: '10m' }
    );
}

function readChallengeToken(req) {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[authChallengeCookieName] || null;
}

function readSessionToken(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }

    const cookies = parseCookies(req.headers.cookie);
    return cookies[sessionCookieName] || null;
}

function readChallengePayload(req, expectedType) {
    const challengeToken = readChallengeToken(req);
    if (!challengeToken) {
        return null;
    }

    try {
        const payload = jwt.verify(challengeToken, jwtSecret);
        if (!payload?.isAuthChallenge) {
            return null;
        }
        if (expectedType && payload.challengeType !== expectedType) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

async function loadChallengeUser(req, expectedType) {
    const payload = readChallengePayload(req, expectedType);
    if (!payload?.id) {
        return null;
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    return userResult.rows[0] || null;
}

async function buildAuthResponse(user, token, options = {}) {
    const response = {
        user: serializeUser(user, options),
        vaultAccess: await buildVaultAccess(user),
    };

    if (isTest) {
        response.token = token;
    }

    return response;
}

async function getOwnershipSummary(user) {
    const [vaultItems, notes, templates, outgoingShares, groupsCreated, deviceAssignments] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total FROM vault_items WHERE user_id = $1', [user.id]),
        pool.query('SELECT COUNT(*) AS total FROM notes WHERE user_id = $1', [user.id]),
        pool.query('SELECT COUNT(*) AS total FROM vault_templates WHERE user_id = $1', [user.id]),
        pool.query('SELECT COUNT(*) AS total FROM shares WHERE shared_by = $1', [user.id]),
        pool.query('SELECT COUNT(*) AS total FROM groups WHERE created_by = $1', [user.id]),
        pool.query(
            `SELECT COUNT(*) AS total
             FROM devices
             WHERE assigned_to = $1 OR assigned_to = $2`,
            [user.name, user.email]
        ),
    ]);

    return {
        deviceAssignments: Number(deviceAssignments.rows[0]?.total || 0),
        groupsCreated: Number(groupsCreated.rows[0]?.total || 0),
        notes: Number(notes.rows[0]?.total || 0),
        outgoingShares: Number(outgoingShares.rows[0]?.total || 0),
        templates: Number(templates.rows[0]?.total || 0),
        vaultItems: Number(vaultItems.rows[0]?.total || 0),
    };
}

async function createSessionToken(user, req) {
    const sessionId = crypto.randomUUID();
    const token = jwt.sign(
        { id: user.id, role: user.role, sessionId },
        jwtSecret,
        { expiresIn: '24h' }
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { ipAddress, userAgent } = getRequestMetadata(req);

    await pool.query(
        `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, user.id, 'JWT_SESSION', ipAddress, userAgent, expiresAt]
    );

    return token;
}

async function issueSession(res, user, req, options = {}) {
    clearSessionCookies(res);
    const token = await createSessionToken(user, req);
    setSessionCookies(res, token);
    return buildAuthResponse(user, token, options);
}

async function loadSessionUser(req) {
    const sessionToken = readSessionToken(req);
    if (!sessionToken) {
        return null;
    }

    try {
        const verified = jwt.verify(sessionToken, jwtSecret);
        if (!verified?.id) {
            return null;
        }

        if (verified.sessionId) {
            const sessionCheck = await pool.query(
                'SELECT is_revoked, expires_at FROM sessions WHERE id = $1',
                [verified.sessionId]
            );

            const session = sessionCheck.rows[0];
            if (
                !session ||
                session.is_revoked ||
                (session.expires_at && new Date(session.expires_at) < new Date())
            ) {
                return null;
            }
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [verified.id]);
        if (userResult.rows.length === 0) {
            return null;
        }

        return {
            sessionId: verified.sessionId || null,
            user: userResult.rows[0],
        };
    } catch {
        return null;
    }
}

async function resolveTwoFactorUser(req) {
    const authenticatedSession = await loadSessionUser(req);
    if (authenticatedSession?.user) {
        return {
            challengeType: null,
            sessionId: authenticatedSession.sessionId,
            user: authenticatedSession.user,
        };
    }

    const challengeUser = await loadChallengeUser(req, AUTH_CHALLENGE_TYPES.SETUP_2FA);
    return {
        challengeType: challengeUser ? AUTH_CHALLENGE_TYPES.SETUP_2FA : null,
        sessionId: null,
        user: challengeUser,
    };
}

async function revokeUserSessions(userId) {
    await pool.query(
        'UPDATE sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
        [userId]
    );
}

function registrationGuard(req, res, next) {
    if (isTest) {
        return next();
    }

    return verifyToken(req, res, () => requireAdmin(req, res, next));
}

// REGISTER
router.post('/register', registrationGuard, async (req, res) => {
    try {
        const { email, name, password, role } = req.body;
        if (!email || !name || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const isFirstUser = Number.parseInt(usersCount.rows[0].count, 10) === 0;
        const safeRole = req.user?.role === 'admin' && role === 'admin'
            ? 'admin'
            : (isFirstUser ? 'admin' : 'user');

        const newUser = await pool.query(
            `INSERT INTO users (email, name, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, name, role, two_factor_enabled`,
            [email, name, hashedPassword, safeRole]
        );

        await auditLog(
            req.user?.id || newUser.rows[0].id,
            'REGISTER',
            'USER',
            newUser.rows[0].id,
            `Registered as ${newUser.rows[0].role}`,
            req
        );

        return res.json(serializeUser(newUser.rows[0], {
            mustSetup2FA: isTwoFactorRequired(newUser.rows[0]) && !newUser.rows[0].two_factor_enabled,
        }));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            await auditLog(null, 'LOGIN_FAILED', 'USER', null, `Email: ${email}`, req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            return res.status(423).json({ message: 'Account temporarily locked. Try again later.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            const nextAttempts = (user.failed_attempts || 0) + 1;
            const lockoutUntil = nextAttempts >= loginLockoutAttempts
                ? new Date(Date.now() + (loginLockoutMinutes * 60 * 1000)).toISOString()
                : null;

            await pool.query(
                'UPDATE users SET failed_attempts = $1, lockout_until = $2 WHERE id = $3',
                [nextAttempts, lockoutUntil, user.id]
            );
            await auditLog(user.id, 'LOGIN_FAILED', 'USER', user.id, 'Bad password', req);

            return res.status(lockoutUntil ? 423 : 401).json({
                message: lockoutUntil
                    ? 'Account temporarily locked. Try again later.'
                    : 'Invalid credentials',
            });
        }

        await pool.query(
            'UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = $1',
            [user.id]
        );

        if (user.two_factor_enabled) {
            clearSessionCookies(res);
            setChallengeCookies(res, createAuthChallengeToken(user, AUTH_CHALLENGE_TYPES.LOGIN_2FA));
            return res.json({
                requires2FA: true,
            });
        }

        if (isTwoFactorRequired(user)) {
            clearSessionCookies(res);
            setChallengeCookies(res, createAuthChallengeToken(user, AUTH_CHALLENGE_TYPES.SETUP_2FA));
            return res.json({
                requires2FASetup: true,
                user: serializeUser(user, { mustSetup2FA: true }),
            });
        }

        await auditLog(user.id, 'LOGIN', 'USER', user.id, 'Success', req);
        return res.json(await issueSession(res, user, req));
    } catch (err) {
        console.error('LOGIN ERROR:', err.message);
        return res.status(500).send('Server Error');
    }
});

// LOGIN VERIFY (2FA Challenge)
router.post('/login/verify', async (req, res) => {
    try {
        const { token: totpToken } = req.body;
        const user = await loadChallengeUser(req, AUTH_CHALLENGE_TYPES.LOGIN_2FA);
        if (!user) {
            return res.status(401).json({ message: 'Session expired' });
        }
        const isValid = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: totpToken,
        });

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid 2FA code' });
        }

        await auditLog(user.id, 'LOGIN', 'USER', user.id, 'Success with 2FA', req);
        return res.json(await issueSession(res, user, req));
    } catch (err) {
        console.error(err.message);
        return res.status(401).json({ message: 'Session expired' });
    }
});

router.get('/pending-challenge', async (req, res) => {
    try {
        const loginChallengeUser = await loadChallengeUser(req, AUTH_CHALLENGE_TYPES.LOGIN_2FA);
        if (loginChallengeUser) {
            return res.json({
                requires2FA: true,
                user: serializeUser(loginChallengeUser),
            });
        }

        const setupChallengeUser = await loadChallengeUser(req, AUTH_CHALLENGE_TYPES.SETUP_2FA);
        if (setupChallengeUser) {
            return res.json({
                requires2FASetup: true,
                user: serializeUser(setupChallengeUser, { mustSetup2FA: true }),
            });
        }

        return res.json({ pending: false });
    } catch (err) {
        console.error(err.message);
        return res.json({ pending: false });
    }
});

router.get('/me', verifyToken, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);

        if (userResult.rows.length === 0) {
            clearSessionCookies(res);
            return res.status(401).json({ message: 'Session expired' });
        }

        return res.json(await buildAuthResponse(userResult.rows[0], null));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/logout', async (req, res) => {
    try {
        const authenticatedSession = await loadSessionUser(req);
        if (authenticatedSession?.sessionId) {
            await pool.query(
                'UPDATE sessions SET is_revoked = true WHERE id = $1 AND user_id = $2',
                [authenticatedSession.sessionId, authenticatedSession.user.id]
            );
        }
        clearSessionCookies(res);
        return res.json({ message: 'Session closed' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/legacy-client-crypto', verifyToken, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (hasWrappedVaultMaterial(user)) {
            return res.status(409).json({ message: 'Legacy crypto is no longer available for this account' });
        }

        const migrationRequired = await hasLegacyVaultData(user.id);
        if (!migrationRequired) {
            return res.status(404).json({ message: 'No legacy vault data requires migration' });
        }

        return res.json(getClientCryptoPayload());
    } catch (err) {
        console.error(err.message);
        return res.status(503).json({ message: err.message || 'Legacy crypto unavailable' });
    }
});

router.post('/vault/setup', verifyToken, async (req, res) => {
    const client = await pool.connect();
    let hasTransaction = false;

    try {
        const payload = buildVaultSetupPayload(req.body);
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        const modeConfig = await getVaultModeConfig(client);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required to initialize the team vault' });
        }

        if (modeConfig.teamInitialized) {
            return res.status(409).json({ message: 'Team vault already initialized. Accept an invitation instead.' });
        }

        if (hasWrappedVaultMaterial(user)) {
            return res.status(409).json({ message: 'Vault access already configured. Unlock and bootstrap the team vault instead.' });
        }

        const migrationRequired = await hasLegacyVaultData(user.id, client);
        const expectedCounts = migrationRequired
            ? await collectLegacyMigrationCounts(user.id, client)
            : { attachments: 0, notes: 0, passwordHistory: 0, vaultItems: 0 };

        if (migrationRequired) {
            assertMigrationShape(payload.migration.vaultItems, 'encrypted_password', 'vault item');
            assertMigrationShape(payload.migration.notes, 'content', 'note');
            assertMigrationShape(payload.migration.attachments, 'encrypted_data', 'attachment');
            assertMigrationShape(payload.migration.passwordHistory, 'encrypted_password', 'password history');

            if (
                payload.migration.vaultItems.length !== expectedCounts.vaultItems ||
                payload.migration.notes.length !== expectedCounts.notes ||
                payload.migration.attachments.length !== expectedCounts.attachments ||
                payload.migration.passwordHistory.length !== expectedCounts.passwordHistory
            ) {
                return res.status(400).json({
                    message: 'Migration payload is incomplete. Reload the vault setup flow and try again.',
                });
            }
        }

        await client.query('BEGIN');
        hasTransaction = true;

        await client.query(
            `UPDATE users
             SET vault_kdf_salt = $1,
                 vault_kdf_iterations = $2,
                 vault_wrapped_vault_key = $3,
                 vault_wrapped_notes_key = $4,
                 vault_key_verifier = $5,
                 notes_key_verifier = $6,
                 vault_access_scope = $7,
                 vault_crypto_migrated_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8`,
            [
                payload.kdfSalt,
                payload.kdfIterations,
                payload.wrappedVaultKey,
                payload.wrappedNotesKey,
                payload.vaultKeyVerifier,
                payload.notesKeyVerifier,
                TEAM_SCOPE,
                user.id,
            ]
        );

        await initializeTeamVaultConfig(client, user.id);

        if (migrationRequired) {
            await applyLegacyMigrationPayload(user.id, payload.migration, client);
        }

        await client.query('COMMIT');
        hasTransaction = false;

        const refreshedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
        await auditLog(
            req.user.id,
            'SETUP_VAULT_MASTER_PASSWORD',
            'USER',
            user.id,
            {
                migratedLegacyData: migrationRequired,
                migratedRows: expectedCounts,
            },
            req
        );

        return res.json({
            message: migrationRequired
                ? 'Team vault configured and legacy data migrated'
                : 'Team vault configured',
            vaultAccess: await buildVaultAccess(refreshedUserResult.rows[0]),
        });
    } catch (err) {
        if (hasTransaction) {
            await client.query('ROLLBACK');
        }
        console.error(err.message);
        const status = /required|invalid|positive integer/i.test(err.message) ? 400 : 500;
        return res.status(status).json({ message: err.message || 'Server Error' });
    } finally {
        client.release();
    }
});

router.post('/team-vault/bootstrap', verifyToken, async (req, res) => {
    const client = await pool.connect();
    let hasTransaction = false;

    try {
        const [userResult, modeConfig] = await Promise.all([
            client.query('SELECT * FROM users WHERE id = $1', [req.user.id]),
            getVaultModeConfig(client),
        ]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (modeConfig.teamInitialized) {
            return res.json({
                message: 'Team vault already initialized',
                vaultAccess: await buildVaultAccess(user, client),
            });
        }

        if (!hasWrappedVaultMaterial(user)) {
            return res.status(409).json({ message: 'This account has no vault material to bootstrap the team vault' });
        }

        await client.query('BEGIN');
        hasTransaction = true;

        await initializeTeamVaultConfig(client, user.id);
        await client.query(
            `UPDATE users
             SET vault_access_scope = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [TEAM_SCOPE, user.id]
        );
        await promoteLegacyOwnedDataToTeamScope(user.id, client);

        await client.query('COMMIT');
        hasTransaction = false;

        const refreshedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
        await auditLog(
            req.user.id,
            'BOOTSTRAP_TEAM_VAULT',
            'TEAM_VAULT',
            user.id,
            { initializedBy: user.id },
            req
        );

        return res.json({
            message: 'Team vault initialized from the existing secure vault',
            vaultAccess: await buildVaultAccess(refreshedUserResult.rows[0]),
        });
    } catch (err) {
        if (hasTransaction) {
            await client.query('ROLLBACK');
        }
        console.error(err.message);
        return res.status(500).json({ message: err.message || 'Server Error' });
    } finally {
        client.release();
    }
});

router.post('/team-vault/invitations', verifyToken, requireAdmin, async (req, res) => {
    try {
        const payload = buildTeamVaultInvitationPayload(req.body);
        const [currentUserResult, targetUserResult, modeConfig] = await Promise.all([
            pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]),
            pool.query('SELECT * FROM users WHERE id = $1', [payload.targetUserId]),
            getVaultModeConfig(pool),
        ]);

        const currentUser = currentUserResult.rows[0];
        const targetUser = targetUserResult.rows[0];

        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!modeConfig.teamInitialized) {
            return res.status(409).json({ message: 'Initialize the team vault before inviting other users' });
        }

        if (!isVaultConfigured(currentUser)) {
            return res.status(403).json({ message: 'Unlock and configure your team vault access before provisioning others' });
        }

        if (payload.targetUserId === req.user.id) {
            return res.status(400).json({ message: 'You already have access to the team vault' });
        }

        const targetAccess = await buildVaultAccess({ ...targetUser, role: 'user' }, pool);
        if (targetAccess.isConfigured) {
            return res.status(409).json({ message: 'This user already has team vault access' });
        }

        const invitationResult = await pool.query(
            `INSERT INTO team_vault_invitations (
                user_id, created_by, encrypted_vault_key, encrypted_notes_key, encrypted_verifier, expires_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id) DO UPDATE SET
                created_by = EXCLUDED.created_by,
                encrypted_vault_key = EXCLUDED.encrypted_vault_key,
                encrypted_notes_key = EXCLUDED.encrypted_notes_key,
                encrypted_verifier = EXCLUDED.encrypted_verifier,
                expires_at = EXCLUDED.expires_at,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                payload.targetUserId,
                req.user.id,
                payload.encryptedVaultKey,
                payload.encryptedNotesKey,
                payload.encryptedVerifier,
                payload.expiresAt,
            ]
        );

        await auditLog(
            req.user.id,
            'CREATE_TEAM_VAULT_INVITATION',
            'TEAM_VAULT_INVITATION',
            invitationResult.rows[0].id,
            {
                expiresAt: payload.expiresAt,
                targetUserId: payload.targetUserId,
            },
            req
        );

        return res.json({
            expiresAt: invitationResult.rows[0].expires_at || null,
            id: invitationResult.rows[0].id,
            targetUser,
        });
    } catch (err) {
        console.error(err.message);
        const status = /required/i.test(err.message) ? 400 : 500;
        return res.status(status).json({ message: err.message || 'Server Error' });
    }
});

router.get('/team-vault/invitation', verifyToken, async (req, res) => {
    try {
        const modeConfig = await getVaultModeConfig(pool);
        if (!modeConfig.teamInitialized) {
            return res.status(404).json({ message: 'Team vault is not initialized' });
        }

        const invitation = await getPendingTeamVaultInvitation(req.user.id, pool);
        if (!invitation) {
            return res.status(404).json({ message: 'No pending invitation found' });
        }

        return res.json({
            invitation: {
                createdAt: invitation.created_at || null,
                createdBy: invitation.created_by
                    ? {
                        email: invitation.created_by_email || null,
                        id: invitation.created_by,
                        name: invitation.created_by_name || null,
                    }
                    : null,
                encryptedNotesKey: invitation.encrypted_notes_key,
                encryptedVaultKey: invitation.encrypted_vault_key,
                encryptedVerifier: invitation.encrypted_verifier,
                expiresAt: invitation.expires_at || null,
                id: invitation.id,
            },
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ message: err.message || 'Server Error' });
    }
});

router.post('/team-vault/accept', verifyToken, async (req, res) => {
    const client = await pool.connect();
    let hasTransaction = false;

    try {
        const payload = buildTeamVaultAcceptPayload(req.body);
        const [modeConfig, userResult] = await Promise.all([
            getVaultModeConfig(client),
            client.query('SELECT * FROM users WHERE id = $1', [req.user.id]),
        ]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!modeConfig.teamInitialized) {
            return res.status(409).json({ message: 'Team vault is not initialized yet' });
        }

        if (isVaultConfigured(user)) {
            return res.status(409).json({ message: 'Team vault access already configured for this account' });
        }

        const invitationResult = await client.query(
            `SELECT *
             FROM team_vault_invitations
             WHERE id = $1
               AND user_id = $2
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
            [payload.invitationId, user.id]
        );
        const invitation = invitationResult.rows[0];

        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found or expired' });
        }

        const migrationRequired = await hasLegacyVaultData(user.id, client);
        const expectedCounts = migrationRequired
            ? await collectLegacyMigrationCounts(user.id, client)
            : { attachments: 0, notes: 0, passwordHistory: 0, vaultItems: 0 };

        if (migrationRequired) {
            assertMigrationShape(payload.setup.migration.vaultItems, 'encrypted_password', 'vault item');
            assertMigrationShape(payload.setup.migration.notes, 'content', 'note');
            assertMigrationShape(payload.setup.migration.attachments, 'encrypted_data', 'attachment');
            assertMigrationShape(payload.setup.migration.passwordHistory, 'encrypted_password', 'password history');

            if (
                payload.setup.migration.vaultItems.length !== expectedCounts.vaultItems ||
                payload.setup.migration.notes.length !== expectedCounts.notes ||
                payload.setup.migration.attachments.length !== expectedCounts.attachments ||
                payload.setup.migration.passwordHistory.length !== expectedCounts.passwordHistory
            ) {
                return res.status(400).json({
                    message: 'Migration payload is incomplete. Reload the vault access flow and try again.',
                });
            }
        }

        await client.query('BEGIN');
        hasTransaction = true;

        await client.query(
            `UPDATE users
             SET vault_kdf_salt = $1,
                 vault_kdf_iterations = $2,
                 vault_wrapped_vault_key = $3,
                 vault_wrapped_notes_key = $4,
                 vault_key_verifier = $5,
                 notes_key_verifier = $6,
                 vault_access_scope = $7,
                 vault_crypto_migrated_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8`,
            [
                payload.setup.kdfSalt,
                payload.setup.kdfIterations,
                payload.setup.wrappedVaultKey,
                payload.setup.wrappedNotesKey,
                payload.setup.vaultKeyVerifier,
                payload.setup.notesKeyVerifier,
                TEAM_SCOPE,
                user.id,
            ]
        );

        if (migrationRequired) {
            await applyLegacyMigrationPayload(user.id, payload.setup.migration, client);
        }

        await client.query('DELETE FROM team_vault_invitations WHERE id = $1', [invitation.id]);
        await client.query('COMMIT');
        hasTransaction = false;

        const refreshedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
        await auditLog(
            req.user.id,
            'ACCEPT_TEAM_VAULT_INVITATION',
            'TEAM_VAULT_INVITATION',
            invitation.id,
            {
                migratedLegacyData: migrationRequired,
                migratedRows: expectedCounts,
            },
            req
        );

        return res.json({
            message: 'Team vault access configured',
            vaultAccess: await buildVaultAccess(refreshedUserResult.rows[0]),
        });
    } catch (err) {
        if (hasTransaction) {
            await client.query('ROLLBACK');
        }
        console.error(err.message);
        const status = /required|invalid|positive integer/i.test(err.message) ? 400 : 500;
        return res.status(status).json({ message: err.message || 'Server Error' });
    } finally {
        client.release();
    }
});

// GET ACTIVE SESSIONS
router.get('/sessions', verifyToken, async (req, res) => {
    try {
        const sessions = await pool.query(
            `SELECT id, ip_address, user_agent, last_active, created_at, expires_at, is_revoked
             FROM sessions
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        const activeSessions = sessions.rows
            .filter((session) => !session.is_revoked)
            .filter((session) => !session.expires_at || new Date(session.expires_at) > new Date())
            .map((session) => ({
                ...session,
                is_current: session.id === req.user.sessionId,
            }));

        return res.json(activeSessions);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// REVOKE SESSION
router.delete('/sessions/:id', verifyToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE sessions SET is_revoked = true WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        return res.json({ message: 'Session revoked' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// GET ALL USERS (Admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const users = await pool.query(
            `SELECT *
             FROM users
             ORDER BY created_at DESC`
        );
        const serializedUsers = await Promise.all(users.rows.map(async (user) => ({
            ...serializeUser(user, {
                mustSetup2FA: isTwoFactorRequired(user) && !user.two_factor_enabled,
            }),
            vaultAccess: await buildVaultAccess(user),
        })));
        return res.json(serializedUsers);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/users/:id/ownership-summary', verifyToken, requireAdmin, async (req, res) => {
    try {
        const userResult = await pool.query(
            'SELECT id, email, name FROM users WHERE id = $1',
            [req.params.id]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const summary = await getOwnershipSummary(userResult.rows[0]);
        return res.json(summary);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/users/transfer-ownership', verifyToken, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    let hasTransaction = false;

    try {
        const { fromUserId, toUserId, transferDeviceAssignments = false } = req.body;
        if (!fromUserId || !toUserId) {
            return res.status(400).json({ message: 'fromUserId and toUserId are required' });
        }
        if (fromUserId === toUserId) {
            return res.status(400).json({ message: 'Select two different users' });
        }

        const usersResult = await pool.query(
            `SELECT id, email, name, role, two_factor_enabled
             FROM users
             WHERE id IN ($1, $2)`,
            [fromUserId, toUserId]
        );
        if (usersResult.rows.length !== 2) {
            return res.status(404).json({ message: 'One of the users does not exist' });
        }

        const fromUser = usersResult.rows.find((user) => user.id === fromUserId);
        const toUser = usersResult.rows.find((user) => user.id === toUserId);
        const summary = await getOwnershipSummary(fromUser);

        await client.query('BEGIN');
        hasTransaction = true;

        await Promise.all([
            client.query('UPDATE vault_items SET user_id = $1 WHERE user_id = $2', [toUserId, fromUserId]),
            client.query('UPDATE notes SET user_id = $1 WHERE user_id = $2', [toUserId, fromUserId]),
            client.query('UPDATE vault_templates SET user_id = $1 WHERE user_id = $2', [toUserId, fromUserId]),
            client.query('UPDATE shares SET shared_by = $1 WHERE shared_by = $2', [toUserId, fromUserId]),
            client.query('UPDATE groups SET created_by = $1 WHERE created_by = $2', [toUserId, fromUserId]),
        ]);

        let transferredDevices = 0;
        if (transferDeviceAssignments) {
            const deviceResult = await client.query(
                `UPDATE devices
                 SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE assigned_to = $2 OR assigned_to = $3
                 RETURNING id`,
                [toUser.name, fromUser.name, fromUser.email]
            );
            transferredDevices = deviceResult.rows.length;
        }

        await client.query('COMMIT');

        await auditLog(
            req.user.id,
            'TRANSFER_OWNERSHIP',
            'USER',
            fromUserId,
            {
                ...summary,
                toUserId,
                transferDeviceAssignments: Boolean(transferDeviceAssignments),
                transferredDevices,
            },
            req
        );

        return res.json({
            transferred: {
                ...summary,
                deviceAssignments: transferredDevices,
            },
            fromUser: serializeUser(fromUser),
            toUser: serializeUser(toUser),
        });
    } catch (err) {
        if (hasTransaction) {
            await client.query('ROLLBACK');
        }
        console.error(err.message);
        return res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// DELETE USER (Admin only)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        await revokeUserSessions(id);
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await auditLog(req.user.id, 'DELETE_USER', 'USER', id, 'Deleted user', req);

        return res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// RESET PASSWORD (Admin only)
router.put('/users/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            `UPDATE users
             SET password_hash = $1, failed_attempts = 0, lockout_until = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [hashedPassword, id]
        );
        await revokeUserSessions(id);
        await auditLog(req.user.id, 'RESET_PASSWORD', 'USER', id, `Reset password for ${userResult.rows[0].email}`, req);

        return res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// 2FA SETUP
router.post('/2fa/setup', async (req, res) => {
    try {
        const { user } = await resolveTwoFactorUser(req);
        if (!user) {
            return res.status(401).json({ message: 'Session expired' });
        }

        const secret = speakeasy.generateSecret({ name: `SecureVault (${user.email || user.id})` });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        await pool.query(
            'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
            [secret.base32, user.id]
        );

        return res.json({ secret: secret.base32, qrCode });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// 2FA ENABLE
router.post('/2fa/enable', async (req, res) => {
    try {
        const { token } = req.body;
        const { challengeType, user } = await resolveTwoFactorUser(req);
        if (!user) {
            return res.status(401).json({ message: 'Session expired' });
        }

        if (!user.two_factor_secret) {
            return res.status(400).json({ message: '2FA setup has not been started' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token,
        });

        if (!isValid) {
            return res.status(400).json({ message: 'Invalid 2FA code' });
        }

        const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
        await pool.query(
            'UPDATE users SET two_factor_enabled = true, recovery_codes = $1 WHERE id = $2',
            [JSON.stringify(recoveryCodes), user.id]
        );

        await auditLog(user.id, 'ENABLE_2FA', 'USER', user.id, 'Enabled 2FA', req);

        if (challengeType === AUTH_CHALLENGE_TYPES.SETUP_2FA) {
            const refreshedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
            const refreshedUser = refreshedUserResult.rows[0];
            const response = await issueSession(res, refreshedUser, req);
            return res.json({
                ...response,
                recoveryCodes,
            });
        }

        return res.json({ message: '2FA enabled', recoveryCodes });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// 2FA DISABLE
router.post('/2fa/disable', verifyToken, async (req, res) => {
    try {
        const { password, token } = req.body;
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token,
        });
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid 2FA code' });
        }

        if (isTwoFactorRequired(user)) {
            return res.status(400).json({ message: '2FA is mandatory for this account' });
        }

        await pool.query(
            'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, recovery_codes = $1 WHERE id = $2',
            ['[]', req.user.id]
        );
        await auditLog(req.user.id, 'DISABLE_2FA', 'USER', req.user.id, 'Disabled 2FA', req);

        return res.json({ message: '2FA disabled' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
