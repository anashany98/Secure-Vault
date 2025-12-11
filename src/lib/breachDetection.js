/**
 * HaveIBeenPwned Breach Detection
 * Uses k-Anonymity model - only sends first 5 chars of SHA-1 hash
 * Privacy-preserving password breach checking
 */

// Rate limit: 1 request every 1.5 seconds for free tier
const RATE_LIMIT_MS = 1500;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_KEY = 'hibp_breach_cache';

let lastRequestTime = 0;

/**
 * SHA-1 hash function (browser-native)
 */
async function sha1(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Get cached breach result
 */
function getCache(hash) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const entry = cache[hash];

        if (entry && (Date.now() - entry.timestamp) < CACHE_DURATION_MS) {
            return entry.count;
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Save breach result to cache
 */
function setCache(hash, count) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        cache[hash] = {
            count,
            timestamp: Date.now()
        };

        // Limit cache size to 1000 entries (prevent bloat)
        const entries = Object.entries(cache);
        if (entries.length > 1000) {
            // Keep only newest 500
            const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            const trimmed = Object.fromEntries(sorted.slice(0, 500));
            localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
        } else {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
    } catch (e) {
        console.error('Failed to cache breach result:', e);
    }
}

/**
 * Rate limiting helper
 */
async function rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_MS) {
        const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
}

/**
 * Check if password has been pwned
 * Returns: { isPwned: boolean, count: number, error: string | null }
 */
export async function checkPasswordBreach(password) {
    if (!password || password.length === 0) {
        return { isPwned: false, count: 0, error: null };
    }

    try {
        // Generate SHA-1 hash
        const hash = await sha1(password);

        // Check cache first
        const cachedCount = getCache(hash);
        if (cachedCount !== null) {
            return {
                isPwned: cachedCount > 0,
                count: cachedCount,
                error: null,
                cached: true
            };
        }

        // Use k-Anonymity: send only first 5 chars
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);

        // Rate limit
        await rateLimit();

        // Call HIBP API
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'SecureVault-PasswordManager'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const text = await response.text();

        // Parse response (format: SUFFIX:COUNT\nSUFFIX:COUNT\n...)
        const lines = text.split('\n');

        for (const line of lines) {
            const [hashSuffix, countStr] = line.split(':');
            if (hashSuffix === suffix) {
                const count = parseInt(countStr, 10);
                setCache(hash, count);
                return {
                    isPwned: true,
                    count,
                    error: null,
                    cached: false
                };
            }
        }

        // Not found in breaches
        setCache(hash, 0);
        return {
            isPwned: false,
            count: 0,
            error: null,
            cached: false
        };

    } catch (error) {
        console.error('HIBP check failed:', error);
        return {
            isPwned: false,
            count: 0,
            error: error.message || 'Failed to check breach status'
        };
    }
}

/**
 * Batch check multiple passwords
 * Respects rate limits automatically
 */
export async function checkMultiplePasswords(passwords, onProgress = null) {
    const results = [];

    for (let i = 0; i < passwords.length; i++) {
        const result = await checkPasswordBreach(passwords[i]);
        results.push(result);

        if (onProgress) {
            onProgress({
                current: i + 1,
                total: passwords.length,
                percentage: ((i + 1) / passwords.length) * 100
            });
        }
    }

    return results;
}

/**
 * Clear breach cache
 */
export function clearBreachCache() {
    localStorage.removeItem(CACHE_KEY);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const entries = Object.values(cache);

        return {
            totalEntries: entries.length,
            oldestEntry: entries.length > 0
                ? new Date(Math.min(...entries.map(e => e.timestamp)))
                : null,
            newestEntry: entries.length > 0
                ? new Date(Math.max(...entries.map(e => e.timestamp)))
                : null
        };
    } catch (e) {
        return { totalEntries: 0, oldestEntry: null, newestEntry: null };
    }
}
