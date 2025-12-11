/**
 * Utilidades para analizar la seguridad de contraseñas
 */

/**
 * Calcula el tiempo estimado para crackear una contraseña por fuerza bruta
 * @param {string} password - La contraseña a analizar
 * @returns {Object} - { time: string, level: 'weak'|'fair'|'good'|'strong'|'excellent', seconds: number }
 */
export function calculateCrackTime(password) {
    if (!password || password.length === 0) {
        return { time: 'Instantáneo', level: 'weak', seconds: 0, color: 'text-red-500' };
    }

    // Determinar el espacio de caracteres
    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26;      // minúsculas
    if (/[A-Z]/.test(password)) charsetSize += 26;      // mayúsculas
    if (/[0-9]/.test(password)) charsetSize += 10;      // números
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // símbolos

    // Si no detectamos ningún tipo, asumir minúsculas
    if (charsetSize === 0) charsetSize = 26;

    // Combinaciones posibles
    const combinations = Math.pow(charsetSize, password.length);

    // Velocidad de ataque (intentos por segundo)
    // Hardware moderno GPU: ~10 billion hashes/sec para MD5
    // Asumimos ~1 billion para algoritmos más seguros
    const attemptsPerSecond = 1_000_000_000;

    // Tiempo en segundos (dividimos por 2 para el tiempo promedio)
    const seconds = combinations / attemptsPerSecond / 2;

    return formatCrackTime(seconds);
}

/**
 * Formatea el tiempo de crackeo en una cadena legible
 */
function formatCrackTime(seconds) {
    if (seconds < 1) {
        return {
            time: 'Instantáneo',
            level: 'weak',
            seconds: seconds,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500'
        };
    }

    if (seconds < 60) {
        return {
            time: `${Math.round(seconds)} segundos`,
            level: 'weak',
            seconds: seconds,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500'
        };
    }

    if (seconds < 3600) {
        return {
            time: `${Math.round(seconds / 60)} minutos`,
            level: 'fair',
            seconds: seconds,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500'
        };
    }

    if (seconds < 86400) {
        return {
            time: `${Math.round(seconds / 3600)} horas`,
            level: 'fair',
            seconds: seconds,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500'
        };
    }

    if (seconds < 2592000) { // 30 días
        return {
            time: `${Math.round(seconds / 86400)} días`,
            level: 'good',
            seconds: seconds,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500'
        };
    }

    if (seconds < 31536000) { // 1 año
        return {
            time: `${Math.round(seconds / 2592000)} meses`,
            level: 'good',
            seconds: seconds,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500'
        };
    }

    if (seconds < 3153600000) { // 100 años
        return {
            time: `${Math.round(seconds / 31536000)} años`,
            level: 'strong',
            seconds: seconds,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            borderColor: 'border-primary'
        };
    }

    // Más de 100 años
    const years = Math.round(seconds / 31536000);
    if (years < 1_000_000) {
        return {
            time: `${(years / 1000).toFixed(0)}k años`,
            level: 'strong',
            seconds: seconds,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            borderColor: 'border-primary'
        };
    }

    if (years < 1_000_000_000) {
        return {
            time: `${(years / 1_000_000).toFixed(0)}M años`,
            level: 'excellent',
            seconds: seconds,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-400/10',
            borderColor: 'border-emerald-400'
        };
    }

    return {
        time: 'Siglos',
        level: 'excellent',
        seconds: seconds,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-400/10',
        borderColor: 'border-emerald-400'
    };
}

/**
 * Obtiene un emoji basado en el nivel de seguridad
 */
export function getSecurityEmoji(level) {
    const emojis = {
        weak: '🔓',
        fair: '🔐',
        good: '🔒',
        strong: '🛡️',
        excellent: '✨'
    };
    return emojis[level] || '🔒';
}

/**
 * Obtiene una etiqueta legible del nivel
 */
export function getSecurityLabel(level) {
    const labels = {
        weak: 'Muy Débil',
        fair: 'Débil',
        good: 'Moderada',
        strong: 'Fuerte',
        excellent: 'Excelente'
    };
    return labels[level] || 'Desconocido';
}
