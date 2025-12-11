/**
 * Predefined tag colors for visual categorization
 */
export const TAG_COLORS = {
    red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/50' },
    slate: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/50' },
};

/**
 * Default tags for common categories
 */
export const DEFAULT_TAGS = [
    { name: 'trabajo', color: 'blue' },
    { name: 'personal', color: 'green' },
    { name: 'financiero', color: 'yellow' },
    { name: 'social', color: 'pink' },
    { name: 'desarrollo', color: 'purple' },
    { name: 'email', color: 'red' },
    { name: 'gaming', color: 'orange' },
    { name: 'crítico', color: 'red' },
];

/**
 * Get color classes for a tag
 */
export function getTagColor(colorName) {
    return TAG_COLORS[colorName] || TAG_COLORS.slate;
}

/**
 * Generate a random color for new tags
 */
export function getRandomTagColor() {
    const colors = Object.keys(TAG_COLORS);
    return colors[Math.floor(Math.random() * colors.length)];
}
