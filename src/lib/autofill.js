export const AUTOFILL_CLIPBOARD_PREFIX = 'SECUREVAULT_AUTOFILL:';

function getHostname(rawUrl) {
    if (!rawUrl) {
        return '';
    }

    try {
        return new URL(rawUrl).hostname.toLowerCase();
    } catch {
        return '';
    }
}

export function buildAutofillPayload(password) {
    return {
        generatedAt: new Date().toISOString(),
        origin: password.url || '',
        originHost: getHostname(password.url || ''),
        password: password.password || '',
        title: password.title || '',
        username: password.username || '',
    };
}

export function buildAutofillClipboardText(password) {
    return `${AUTOFILL_CLIPBOARD_PREFIX}${JSON.stringify(buildAutofillPayload(password))}`;
}
