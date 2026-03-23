const PREFIX = 'SECUREVAULT_AUTOFILL:';
const STORAGE_KEY = 'securevault.autofill.recentPayloads';
const MAX_RECENT_PAYLOADS = 8;

const fillButton = document.getElementById('fill-button');
const refreshButton = document.getElementById('refresh-button');
const statusNode = document.getElementById('status');
const activeOriginNode = document.getElementById('active-origin');
const selectedCredentialNode = document.getElementById('selected-credential');
const selectedMetaNode = document.getElementById('selected-meta');
const suggestionsNode = document.getElementById('suggestions');

const state = {
    activeTab: null,
    payloads: [],
    selectedPayloadId: null,
};

function setStatus(message, isError = false) {
    statusNode.textContent = message;
    statusNode.style.color = isError ? '#fca5a5' : '#cbd5e1';
}

function getHostname(rawUrl) {
    if (!rawUrl) {
        return '';
    }

    try {
        return new URL(rawUrl).hostname.toLowerCase();
    } catch {
        return String(rawUrl).toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    }
}

function normalizeHost(hostname) {
    return hostname.replace(/^www\./, '');
}

function getHostMatchLevel(activeHost, candidateHost) {
    const normalizedActive = normalizeHost(activeHost || '');
    const normalizedCandidate = normalizeHost(candidateHost || '');

    if (!normalizedActive || !normalizedCandidate) {
        return 0;
    }

    if (normalizedActive === normalizedCandidate) {
        return 3;
    }

    if (
        normalizedActive.endsWith(`.${normalizedCandidate}`) ||
        normalizedCandidate.endsWith(`.${normalizedActive}`)
    ) {
        return 2;
    }

    const activeParts = normalizedActive.split('.');
    const candidateParts = normalizedCandidate.split('.');
    if (
        activeParts.length >= 2 &&
        candidateParts.length >= 2 &&
        activeParts.slice(-2).join('.') === candidateParts.slice(-2).join('.')
    ) {
        return 1;
    }

    return 0;
}

function isSupportedPage(url) {
    return /^https?:\/\//i.test(url || '');
}

function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const normalized = {
        generatedAt: payload.generatedAt || new Date().toISOString(),
        origin: typeof payload.origin === 'string' ? payload.origin : '',
        originHost: typeof payload.originHost === 'string' && payload.originHost
            ? payload.originHost
            : getHostname(payload.origin),
        password: typeof payload.password === 'string' ? payload.password : '',
        title: typeof payload.title === 'string' ? payload.title.trim() : '',
        username: typeof payload.username === 'string' ? payload.username.trim() : '',
    };

    if (!normalized.password) {
        return null;
    }

    normalized.id = [
        normalized.originHost || 'no-origin',
        normalized.title || 'no-title',
        normalized.username || 'no-username',
    ].join('::');

    return normalized;
}

function dedupePayloads(payloads) {
    const unique = new Map();

    payloads
        .map(normalizePayload)
        .filter(Boolean)
        .sort((left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime())
        .forEach((payload) => {
            if (!unique.has(payload.id)) {
                unique.set(payload.id, payload);
            }
        });

    return [...unique.values()].slice(0, MAX_RECENT_PAYLOADS);
}

async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
}

async function loadStoredPayloads() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return dedupePayloads(Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : []);
}

async function saveStoredPayloads(payloads) {
    const normalized = dedupePayloads(payloads);
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
    return normalized;
}

async function tryReadPayloadFromClipboard() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText.startsWith(PREFIX)) {
            return {
                error: 'No hay un paquete nuevo de SecureVault en el portapapeles.',
                payload: null,
            };
        }

        return {
            payload: normalizePayload(JSON.parse(clipboardText.slice(PREFIX.length))),
        };
    } catch (error) {
        return {
            error: error.message || 'No se pudo leer el portapapeles.',
            payload: null,
        };
    }
}

function describeMatch(matchLevel, originHost) {
    if (matchLevel >= 3) {
        return `Coincidencia exacta con ${originHost}`;
    }

    if (matchLevel === 2) {
        return `Coincidencia por subdominio con ${originHost}`;
    }

    if (matchLevel === 1) {
        return `Coincidencia aproximada con ${originHost}`;
    }

    if (originHost) {
        return `Sin coincidencia de dominio con ${originHost}`;
    }

    return 'Sin dominio de referencia';
}

function getPayloadScore(payload, activeHost) {
    const matchLevel = getHostMatchLevel(activeHost, payload.originHost);
    const generatedAt = new Date(payload.generatedAt).getTime() || 0;
    return {
        matchLevel,
        score: matchLevel * 10_000_000_000_000 + generatedAt,
    };
}

function getSelectedPayload() {
    return state.payloads.find((payload) => payload.id === state.selectedPayloadId) || null;
}

function selectBestPayload() {
    const activeHost = getHostname(state.activeTab?.url || '');
    const ranked = [...state.payloads].sort((left, right) => {
        const leftScore = getPayloadScore(left, activeHost);
        const rightScore = getPayloadScore(right, activeHost);
        return rightScore.score - leftScore.score;
    });

    state.selectedPayloadId = ranked[0]?.id || null;
}

function createSuggestionButton(payload, isSelected) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `suggestion${isSelected ? ' active' : ''}`;

    const titleNode = document.createElement('strong');
    titleNode.textContent = payload.title || 'Sin titulo';
    button.appendChild(titleNode);

    const metaNode = document.createElement('small');
    metaNode.textContent = `${payload.username || 'Sin usuario'} · ${payload.originHost || 'sin dominio'}`;
    button.appendChild(metaNode);

    button.addEventListener('click', () => {
        state.selectedPayloadId = payload.id;
        render();
    });
    return button;
}

function renderSuggestions() {
    suggestionsNode.innerHTML = '';

    if (state.payloads.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'No hay credenciales guardadas todavia.';
        suggestionsNode.appendChild(empty);
        return;
    }

    state.payloads.slice(0, 5).forEach((payload) => {
        suggestionsNode.appendChild(
            createSuggestionButton(payload, payload.id === state.selectedPayloadId)
        );
    });
}

function renderSelectedPayload() {
    const selectedPayload = getSelectedPayload();
    const activeHost = getHostname(state.activeTab?.url || '');

    if (!selectedPayload) {
        selectedCredentialNode.textContent = 'Sin credencial sugerida';
        selectedMetaNode.textContent = 'Copia un paquete desde SecureVault o reutiliza uno reciente.';
        fillButton.disabled = true;
        fillButton.textContent = 'Rellenar pagina';
        return;
    }

    const matchLevel = getHostMatchLevel(activeHost, selectedPayload.originHost);
    const actionLabel = matchLevel === 0 ? 'Forzar relleno' : 'Rellenar pagina';

    selectedCredentialNode.textContent = selectedPayload.title || selectedPayload.username || 'Credencial sin titulo';
    selectedMetaNode.textContent = `${selectedPayload.username || 'Sin usuario'} · ${describeMatch(matchLevel, selectedPayload.originHost)}`;
    fillButton.disabled = !state.activeTab?.id || !isSupportedPage(state.activeTab?.url);
    fillButton.textContent = actionLabel;
}

function renderActivePage() {
    if (!state.activeTab) {
        activeOriginNode.textContent = 'No se pudo detectar la pestana activa.';
        return;
    }

    if (!isSupportedPage(state.activeTab.url)) {
        activeOriginNode.textContent = state.activeTab.url || 'Pagina no soportada';
        return;
    }

    activeOriginNode.textContent = getHostname(state.activeTab.url) || state.activeTab.url;
}

function render() {
    renderActivePage();
    renderSelectedPayload();
    renderSuggestions();
}

async function syncFromClipboard() {
    const clipboard = await tryReadPayloadFromClipboard();
    const storedPayloads = await loadStoredPayloads();

    if (clipboard.payload) {
        state.payloads = await saveStoredPayloads([clipboard.payload, ...storedPayloads]);
        selectBestPayload();
        render();
        setStatus(`Portapapeles sincronizado: ${clipboard.payload.title || clipboard.payload.username || 'credencial'} guardada.`);
        return;
    }

    state.payloads = storedPayloads;
    selectBestPayload();
    render();
    setStatus(clipboard.error || 'Usando coincidencias guardadas.');
}

async function handleFillClick() {
    const activeTab = state.activeTab;
    const payload = getSelectedPayload();

    if (!activeTab?.id) {
        setStatus('No hay una pestana activa disponible.', true);
        return;
    }

    if (!isSupportedPage(activeTab.url)) {
        setStatus('La extension solo puede rellenar paginas http o https.', true);
        return;
    }

    if (!payload) {
        setStatus('No hay una credencial seleccionada.', true);
        return;
    }

    const activeHost = getHostname(activeTab.url);
    const matchLevel = getHostMatchLevel(activeHost, payload.originHost);

    fillButton.disabled = true;
    setStatus(matchLevel === 0 ? 'Forzando relleno...' : 'Rellenando pagina...');

    try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
            activeUrl: activeTab.url,
            force: matchLevel === 0,
            payload,
            type: 'securevault.autofill',
        });

        if (!response?.ok) {
            throw new Error(response?.error || 'La pagina no acepto el autofill.');
        }

        setStatus(`Campos rellenados: ${response.filledFields.join(', ')}.`);
    } catch (error) {
        setStatus(error.message || 'Autofill fallido.', true);
    } finally {
        fillButton.disabled = false;
    }
}

async function init() {
    state.activeTab = await getActiveTab();
    await syncFromClipboard();

    if (!isSupportedPage(state.activeTab?.url)) {
        setStatus('Abre una pagina de login http/https para usar el autofill.');
    }
}

fillButton.addEventListener('click', handleFillClick);
refreshButton.addEventListener('click', () => {
    syncFromClipboard();
});

init();
