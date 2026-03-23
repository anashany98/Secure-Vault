function dispatchInputEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setNativeValue(element, value) {
    const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    );

    if (descriptor?.set) {
        descriptor.set.call(element, value);
    } else {
        element.value = value;
    }
}

function setFieldValue(element, value) {
    if (!element || typeof value !== 'string' || value.length === 0) {
        return false;
    }

    element.focus();
    setNativeValue(element, value);
    dispatchInputEvents(element);
    return true;
}

function isVisible(element) {
    if (!element || element.disabled || element.type === 'hidden') {
        return false;
    }

    const style = window.getComputedStyle(element);
    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.getClientRects().length > 0
    );
}

function getHostname(rawUrl) {
    if (!rawUrl) {
        return '';
    }

    try {
        return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return String(rawUrl)
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0];
    }
}

function getHostMatchLevel(currentHost, payloadHost) {
    if (!currentHost || !payloadHost) {
        return 0;
    }

    if (currentHost === payloadHost) {
        return 3;
    }

    if (currentHost.endsWith(`.${payloadHost}`) || payloadHost.endsWith(`.${currentHost}`)) {
        return 2;
    }

    const currentSuffix = currentHost.split('.').slice(-2).join('.');
    const payloadSuffix = payloadHost.split('.').slice(-2).join('.');
    return currentSuffix && currentSuffix === payloadSuffix ? 1 : 0;
}

function getVisibleInputs(root = document) {
    return [...root.querySelectorAll('input')].filter(isVisible);
}

function findPasswordField() {
    const inputs = getVisibleInputs();

    return (
        inputs.find((input) => input.autocomplete === 'current-password') ||
        inputs.find((input) => input.type === 'password') ||
        null
    );
}

function scoreUsernameField(element, passwordField) {
    if (!element || element.type === 'password') {
        return -1;
    }

    const type = (element.type || '').toLowerCase();
    if (!['email', 'text', 'tel', 'search', 'url'].includes(type)) {
        return -1;
    }

    const metadata = [
        element.name,
        element.id,
        element.placeholder,
        element.autocomplete,
        element.getAttribute('aria-label'),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    let score = 0;

    if (type === 'email') {
        score += 60;
    }

    if (element.autocomplete === 'username') {
        score += 50;
    }

    if (metadata.includes('email')) {
        score += 40;
    }

    if (metadata.includes('user') || metadata.includes('login')) {
        score += 35;
    }

    if (passwordField?.form && element.form === passwordField.form) {
        score += 30;
    }

    if (document.activeElement === element) {
        score += 10;
    }

    return score;
}

function findUsernameField(passwordField) {
    const inputs = getVisibleInputs();
    const candidates = inputs
        .map((input) => ({ input, score: scoreUsernameField(input, passwordField) }))
        .filter((candidate) => candidate.score >= 0)
        .sort((left, right) => right.score - left.score);

    return candidates[0]?.input || null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'securevault.autofill') {
        return false;
    }

    const payload = message.payload || {};
    const currentHost = getHostname(window.location.href);
    const payloadHost = getHostname(payload.originHost || payload.origin || '');
    const matchLevel = getHostMatchLevel(currentHost, payloadHost);

    if (payloadHost && matchLevel === 0 && !message.force) {
        sendResponse({
            error: `La pagina activa (${currentHost}) no coincide con ${payloadHost}.`,
            ok: false,
        });
        return true;
    }

    const filledFields = [];
    const passwordField = findPasswordField();
    const usernameField = findUsernameField(passwordField);

    if (setFieldValue(usernameField, payload.username || '')) {
        filledFields.push('username');
    }

    if (setFieldValue(passwordField, payload.password || '')) {
        filledFields.push('password');
    }

    if (filledFields.length === 0) {
        sendResponse({ error: 'No se encontraron campos compatibles en la pagina.', ok: false });
        return true;
    }

    sendResponse({ filledFields, matchLevel, ok: true });
    return true;
});
