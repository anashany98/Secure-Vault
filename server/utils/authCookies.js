const crypto = require('crypto');

const {
    authChallengeCookieName,
    csrfCookieName,
    sessionCookieName,
    sessionCookieSameSite,
    sessionCookieSecure,
} = require('../config');

const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CHALLENGE_MAX_AGE_MS = 10 * 60 * 1000;

function parseCookies(cookieHeader = '') {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex === -1) {
                return cookies;
            }

            const name = part.slice(0, separatorIndex).trim();
            const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
            cookies[name] = value;
            return cookies;
        }, {});
}

function buildCookieOptions(maxAge) {
    return {
        httpOnly: true,
        maxAge,
        path: '/',
        sameSite: sessionCookieSameSite,
        secure: sessionCookieSecure,
    };
}

function buildReadableCookieOptions(maxAge) {
    return {
        httpOnly: false,
        maxAge,
        path: '/',
        sameSite: sessionCookieSameSite,
        secure: sessionCookieSecure,
    };
}

function issueCsrfCookie(res, csrfToken = crypto.randomBytes(24).toString('hex'), maxAge = COOKIE_MAX_AGE_MS) {
    res.cookie(csrfCookieName, csrfToken, buildReadableCookieOptions(maxAge));
    return csrfToken;
}

function setSessionCookies(res, sessionToken) {
    res.cookie(sessionCookieName, sessionToken, buildCookieOptions(COOKIE_MAX_AGE_MS));
    issueCsrfCookie(res, undefined, COOKIE_MAX_AGE_MS);
}

function setChallengeCookies(res, challengeToken) {
    res.cookie(authChallengeCookieName, challengeToken, buildCookieOptions(CHALLENGE_MAX_AGE_MS));
    issueCsrfCookie(res, undefined, CHALLENGE_MAX_AGE_MS);
}

function clearSessionCookies(res) {
    res.clearCookie(sessionCookieName, { path: '/' });
    res.clearCookie(authChallengeCookieName, { path: '/' });
    res.clearCookie(csrfCookieName, { path: '/' });
}

module.exports = {
    CHALLENGE_MAX_AGE_MS,
    COOKIE_MAX_AGE_MS,
    clearSessionCookies,
    issueCsrfCookie,
    parseCookies,
    setChallengeCookies,
    setSessionCookies,
};
