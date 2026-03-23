import { useEffect, useState } from 'react';
import {
    ArrowRight,
    Clock,
    History,
    RefreshCw,
    RotateCcw,
    Shield,
    User,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { usePasswords } from '../../context/PasswordContext';

const ACTION_LABELS = {
    CHECKIN_PASSWORD: 'Checkout liberado',
    CHECKOUT_PASSWORD: 'Checkout actualizado',
    CREATE_PASSWORD: 'Credencial creada',
    DELETE_ATTACHMENT: 'Adjunto eliminado',
    DUPLICATE_PASSWORD: 'Credencial duplicada',
    RESTORE_PASSWORD: 'Credencial restaurada',
    UPDATE_PASSWORD: 'Credencial actualizada',
};

const FIELD_LABELS = {
    custom_fields: 'Campos personalizados',
    folder_id: 'Carpeta',
    is_favorite: 'Favorita',
    meta_person: 'Owner',
    next_review_at: 'Proxima revision',
    password: 'Contrasena',
    renewal_interval_days: 'Renovacion',
    tags: 'Tags',
    title: 'Titulo',
    url: 'URL',
    username: 'Usuario',
};

function formatDateTime(value) {
    if (!value) {
        return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'N/A';
    }

    return parsed.toLocaleString('es-ES');
}

function stringifyValue(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function formatFieldValue(field, value) {
    if (value === null || value === undefined || value === '') {
        return 'Vacio';
    }

    if (field === 'password' && typeof value === 'object' && value?.changed) {
        return 'Actualizada';
    }

    if (field === 'renewal_interval_days' && typeof value === 'number') {
        return `${value} dias`;
    }

    if (field === 'next_review_at') {
        return formatDateTime(value);
    }

    if (typeof value === 'boolean') {
        return value ? 'Si' : 'No';
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return 'Sin datos';
        }

        if (field === 'tags') {
            return value
                .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
                .filter(Boolean)
                .join(', ');
        }

        if (field === 'custom_fields') {
            return value
                .map((item) => item?.label || item?.name || stringifyValue(item))
                .filter(Boolean)
                .join(', ');
        }

        return stringifyValue(value);
    }

    if (typeof value === 'object') {
        return stringifyValue(value);
    }

    return String(value);
}

function getDiffEntries(details) {
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
        return [];
    }

    return Object.entries(details)
        .filter(([, value]) => value && typeof value === 'object')
        .filter(([, value]) => 'old' in value || 'new' in value || 'changed' in value)
        .map(([field, value]) => ({ field, value }));
}

function renderAuditDetails(entry) {
    const diffEntries = getDiffEntries(entry.details);
    if (diffEntries.length > 0) {
        return (
            <div className="space-y-2">
                {diffEntries.map(({ field, value }) => (
                    <div
                        key={`${entry.id}-${field}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {FIELD_LABELS[field] || field}
                        </p>
                        {'old' in value || 'new' in value ? (
                            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300">
                                    {formatFieldValue(field, value.old)}
                                </div>
                                <div className="flex items-center justify-center text-slate-500">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                                <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                                    {formatFieldValue(field, value.new)}
                                </div>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-emerald-300">
                                {formatFieldValue(field, value)}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (typeof entry.details === 'string' && entry.details.trim()) {
        return <p className="text-sm text-slate-300">{entry.details}</p>;
    }

    if (entry.details && typeof entry.details === 'object' && !Array.isArray(entry.details)) {
        return (
            <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(entry.details).map(([key, value]) => (
                    <div
                        key={`${entry.id}-${key}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {FIELD_LABELS[key] || key}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                            {formatFieldValue(key, value)}
                        </p>
                    </div>
                ))}
            </div>
        );
    }

    return <p className="text-sm text-slate-500">Sin detalles adicionales.</p>;
}

export default function PasswordHistoryModal({ isOpen, onClose, passwordItem }) {
    const { getPasswordChangeLog, getPasswordHistory, updatePassword } = usePasswords();
    const [history, setHistory] = useState([]);
    const [changeLog, setChangeLog] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});

    useEffect(() => {
        if (!isOpen || !passwordItem) {
            setHistory([]);
            setChangeLog([]);
            return;
        }

        const fetchHistory = async () => {
            setIsLoading(true);
            const [historyData, changeLogData] = await Promise.all([
                getPasswordHistory(passwordItem.id),
                getPasswordChangeLog(passwordItem.id),
            ]);
            setHistory(historyData);
            setChangeLog(changeLogData);
            setIsLoading(false);
        };

        fetchHistory();
    }, [getPasswordChangeLog, getPasswordHistory, isOpen, passwordItem]);

    if (!isOpen || !passwordItem) {
        return null;
    }

    const handleRestore = async (version) => {
        const shouldRestore = window.confirm(
            'Restaurar esta version de la contrasena? La actual quedara guardada en el historial.'
        );
        if (!shouldRestore) {
            return;
        }

        const result = await updatePassword(passwordItem.id, { password: version.password });
        if (result?.success) {
            toast.success('Version restaurada');
            onClose();
        }
    };

    const togglePasswordVisibility = (index) => {
        setShowPasswords((previous) => ({
            ...previous,
            [index]: !previous[index],
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700 p-6">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                                <History className="h-4 w-4 text-blue-400" />
                            </div>
                            Historial y diff
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            {passwordItem.title} · {history.length} versiones · {changeLog.length} eventos
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-primary" />
                            <p className="text-slate-400">Cargando historial...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">Versiones guardadas</h3>
                                    <span className="text-xs uppercase tracking-wide text-slate-500">
                                        Password history
                                    </span>
                                </div>

                                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <span className="text-sm font-semibold text-primary">
                                                Version actual
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {formatDateTime(passwordItem.updatedAt || passwordItem.createdAt)}
                                        </span>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-xl bg-slate-950/40 p-3">
                                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Usuario
                                            </p>
                                            <p className="font-mono text-sm text-white">{passwordItem.username || 'N/A'}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-950/40 p-3">
                                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Contrasena
                                            </p>
                                            <p className="font-mono text-sm text-white">
                                                {'*'.repeat(Math.max(passwordItem.password?.length || 0, 8))}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {history.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center">
                                        <Clock className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                                        <p className="font-medium text-white">Sin versiones previas</p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Las contrasenas anteriores apareceran aqui cuando se modifique esta credencial.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {history.map((version, index) => (
                                            <div
                                                key={version.id || index}
                                                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                                            >
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">
                                                            Version de {formatDateTime(version.changedAt || version.changed_at)}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Puedes restaurar solo la contrasena de esta version.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRestore(version)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Restaurar
                                                    </button>
                                                </div>

                                                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Contrasena
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePasswordVisibility(index)}
                                                        className="font-mono text-sm text-slate-300 transition-colors hover:text-white"
                                                    >
                                                        {showPasswords[index]
                                                            ? version.password
                                                            : '*'.repeat(Math.max(version.password?.length || 0, 8))}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">Historial de cambios</h3>
                                    <span className="text-xs uppercase tracking-wide text-slate-500">
                                        Audit diff
                                    </span>
                                </div>

                                {changeLog.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center">
                                        <Shield className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                                        <p className="font-medium text-white">Sin eventos registrados</p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Cuando esta credencial cambie, aqui veras quien lo hizo y que campos se tocaron.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {changeLog.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                                            >
                                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">
                                                            {ACTION_LABELS[entry.action] || entry.action}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDateTime(entry.changedAt)}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                {entry.userName || entry.userEmail || 'Sistema'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {renderAuditDetails(entry)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-700 bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <p>Se muestran versiones guardadas y el diff auditado de la credencial.</p>
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
