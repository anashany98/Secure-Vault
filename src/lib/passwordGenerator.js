/**
 * Password Generator Utility
 * Generates secure random passwords and passphrases
 */

/**
 * Generate a random password
 */
export function generatePassword(options = {}) {
    const {
        length = 16,
        useLowercase = true,
        useUppercase = true,
        useNumbers = true,
        useSymbols = true,
        excludeAmbiguous = true,
        excludeSimilar = false
    } = options;

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const ambiguous = 'il1Lo0O';
    const similar = 'il1Lo0O';

    let chars = '';
    let mustInclude = [];

    if (useLowercase) {
        chars += lowercase;
        mustInclude.push(lowercase);
    }
    if (useUppercase) {
        chars += uppercase;
        mustInclude.push(uppercase);
    }
    if (useNumbers) {
        chars += numbers;
        mustInclude.push(numbers);
    }
    if (useSymbols) {
        chars += symbols;
        mustInclude.push(symbols);
    }

    if (excludeAmbiguous) {
        chars = chars.split('').filter(c => !ambiguous.includes(c)).join('');
    }
    if (excludeSimilar) {
        chars = chars.split('').filter(c => !similar.includes(c)).join('');
    }

    if (chars.length === 0) {
        throw new Error('At least one character type must be selected');
    }

    // Generate password ensuring at least one char from each selected type
    let password = '';

    // First, add one character from each required type
    mustInclude.forEach(charSet => {
        const validChars = charSet.split('').filter(c => chars.includes(c));
        if (validChars.length > 0) {
            password += validChars[Math.floor(Math.random() * validChars.length)];
        }
    });

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a memorable passphrase
 */
export function generatePassphrase(options = {}) {
    const {
        wordCount = 4,
        separator = '-',
        capitalize = true,
        includeNumber = true
    } = options;

    // Common words list (simplified - in production, use a larger dictionary)
    const words = [
        'correct', 'horse', 'battery', 'staple', 'river', 'mountain', 'ocean', 'forest',
        'cloud', 'thunder', 'lightning', 'crystal', 'dragon', 'phoenix', 'wizard', 'castle',
        'knight', 'shield', 'sword', 'arrow', 'tower', 'bridge', 'garden', 'meadow',
        'sunrise', 'sunset', 'rainbow', 'galaxy', 'planet', 'comet', 'nebula', 'lunar',
        'solar', 'cosmic', 'stellar', 'quantum', 'digital', 'cyber', 'neural', 'vision',
        'dream', 'hope', 'trust', 'honor', 'glory', 'wisdom', 'power', 'energy',
        'flame', 'frost', 'storm', 'wind', 'earth', 'stone', 'metal', 'wood',
        'water', 'fire', 'air', 'light', 'dark', 'shadow', 'moon', 'star'
    ];

    const selected = [];
    for (let i = 0; i < wordCount; i++) {
        let word = words[Math.floor(Math.random() * words.length)];
        if (capitalize) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        selected.push(word);
    }

    let passphrase = selected.join(separator);

    if (includeNumber) {
        passphrase += separator + Math.floor(Math.random() * 9999);
    }

    return passphrase;
}

/**
 * Calculate password strength (0-4)
 */
export function calculatePasswordStrength(password) {
    if (!password) return 0;

    let score = 0;

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character types
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Penalty for common patterns
    if (/^[0-9]+$/.test(password)) score -= 2;
    if (/^[a-zA-Z]+$/.test(password)) score -= 1;
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters

    return Math.max(0, Math.min(4, Math.floor(score / 2)));
}

/**
 * Get strength label and color
 */
export function getStrengthInfo(strength) {
    const levels = [
        { label: 'Muy Débil', color: 'text-red-500', bgColor: 'bg-red-500', description: 'Muy insegura' },
        { label: 'Débil', color: 'text-orange-500', bgColor: 'bg-orange-500', description: 'Poco segura' },
        { label: 'Aceptable', color: 'text-yellow-500', bgColor: 'bg-yellow-500', description: 'Aceptable' },
        { label: 'Fuerte', color: 'text-blue-500', bgColor: 'bg-blue-500', description: 'Segura' },
        { label: 'Muy Fuerte', color: 'text-green-500', bgColor: 'bg-green-500', description: 'Muy segura' }
    ];

    return levels[strength] || levels[0];
}
