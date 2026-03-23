const DEFAULT_DEV_ORIGINS = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:6060',
    'http://localhost:6060',
];

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function requireEnv(name) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

function parseAllowedOrigins(rawOrigins) {
    if (!rawOrigins) {
        return null;
    }

    return rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function parseList(rawValue) {
    if (!rawValue) {
        return [];
    }

    return rawValue
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const configuredOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);
const sessionCookieSecure = parseBoolean(process.env.COOKIE_SECURE, isProduction);

if (isProduction && (!configuredOrigins || configuredOrigins.length === 0)) {
    throw new Error('CORS_ORIGINS must be configured in production');
}

module.exports = {
    allowedOrigins: configuredOrigins && configuredOrigins.length > 0
        ? configuredOrigins
        : DEFAULT_DEV_ORIGINS,
    bootstrapAdmin: {
        email: process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || '',
        name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'SecureVault Admin',
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || '',
    },
    isProduction,
    isTest,
    jwtSecret: requireEnv('JWT_SECRET'),
    loginLockoutAttempts: Number(process.env.LOGIN_LOCKOUT_ATTEMPTS || 5),
    loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES || 15),
    mandatory2faEmails: parseList(process.env.MANDATORY_2FA_EMAILS),
    mandatory2faRoles: parseList(process.env.MANDATORY_2FA_ROLES ?? 'admin'),
    sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() || 'securevault_session',
    authChallengeCookieName: process.env.AUTH_CHALLENGE_COOKIE_NAME?.trim() || 'securevault_auth_challenge',
    csrfCookieName: process.env.CSRF_COOKIE_NAME?.trim() || 'securevault_csrf',
    sessionCookieSecure,
    sessionCookieSameSite: process.env.COOKIE_SAMESITE?.trim() || 'strict',
};
