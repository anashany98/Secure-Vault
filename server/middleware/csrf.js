const { allowedOrigins, authChallengeCookieName, csrfCookieName, sessionCookieName } = require('../config');
const { parseCookies } = require('../utils/authCookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = function enforceCsrf(req, res, next) {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const hasStateCookie = Boolean(cookies[sessionCookieName] || cookies[authChallengeCookieName]);

    if (!hasStateCookie) {
        return next();
    }

    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ message: 'Origin not allowed' });
    }

    if (!origin) {
        return next();
    }

    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = cookies[csrfCookieName];

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    return next();
};
