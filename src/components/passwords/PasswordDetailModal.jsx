import { useEffect, useMemo, useState } from 'react';
import {
    Copy,
    Download,
    Eye,
    EyeOff,
    Globe,
    Link2,
    Paperclip,
    Shield,
    User,
    X,
    Calendar,
    Clock,
    Files,
    ClipboardPaste,
    ArrowLeftRight,
    Unplug,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { usePasswords } from '../../context/PasswordContext';
import {
    downloadEncryptedAttachment,
    formatAttachmentSize,
} from '../../lib/attachments';
import { buildAutofillClipboardText } from '../../lib/autofill';
import { calculateCrackTime, getSecurityEmoji } from '../../lib/passwordSecurity';

function formatDate(value) {
    if (!value) {
        return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'N/A';
    }

    return format(parsed, 'PPP', { locale: es });
}

function formatDateTimeLocal(value) {
    if (!value) {
        return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const offset = parsed.getTimezoneOffset();
    const localDate = new Date(parsed.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
}

export default function PasswordDetailModal({ isOpen, onClose, password }) {
    const { user } = useAuth();
    const { items } = useInventory();
    const {
        checkinPassword,
        checkoutPassword,
        createTemplate,
        duplicatePassword,
        getLinkedDevices,
        getPasswordAttachments,
        linkDeviceToPassword,
        passwords,
        unlinkDeviceFromPassword,
    } = usePasswords();
    const [showPassword, setShowPassword] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [linkedDevices, setLinkedDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [checkoutUntil, setCheckoutUntil] = useState('');
    const [checkoutNote, setCheckoutNote] = useState('');
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);

    const currentPassword = useMemo(
        () => passwords.find((item) => item.id === password?.id) || password,
        [password, passwords]
    );
    const isAdmin = user?.role === 'admin';
    const canWrite = !currentPassword?.permission || currentPassword.permission === 'owner' || currentPassword.permission === 'write';
    const security = currentPassword ? calculateCrackTime(currentPassword.password) : null;

    const availableDevices = useMemo(() => {
        const linkedIds = new Set(linkedDevices.map((item) => item.id));
        return items.filter((item) => !linkedIds.has(item.id));
    }, [items, linkedDevices]);

    useEffect(() => {
        let cancelled = false;

        if (!isOpen || !currentPassword?.id) {
            setAttachments([]);
            setLinkedDevices([]);
            return () => {
                cancelled = true;
            };
        }

        setCheckoutUntil(formatDateTimeLocal(currentPassword.checkedOutUntil));
        setCheckoutNote(currentPassword.checkoutNote || '');
        setIsLoadingAttachments(true);
        getPasswordAttachments(currentPassword.id)
            .then((itemsList) => {
                if (!cancelled) {
                    setAttachments(itemsList);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    toast.error(error.message || 'No se pudieron cargar los adjuntos');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingAttachments(false);
                }
            });

        if (isAdmin) {
            setIsLoadingDevices(true);
            getLinkedDevices(currentPassword.id)
                .then((devices) => {
                    if (!cancelled) {
                        setLinkedDevices(devices);
                    }
                })
                .catch((error) => {
                    if (!cancelled) {
                        toast.error(error.message || 'No se pudieron cargar los dispositivos vinculados');
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setIsLoadingDevices(false);
                    }
                });
        }

        return () => {
            cancelled = true;
        };
    }, [currentPassword, getLinkedDevices, getPasswordAttachments, isAdmin, isOpen]);

    if (!isOpen || !currentPassword) {
        return null;
    }

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
    };

    const handleDuplicate = async () => {
        await duplicatePassword(currentPassword.id);
    };

    const handleSaveTemplate = async () => {
        const name = window.prompt('Nombre de la plantilla');
        if (!name) {
            return;
        }

        await createTemplate({
            ...currentPassword,
            name,
        });
    };

    const handleCheckout = async () => {
        await checkoutPassword(currentPassword.id, {
            note: checkoutNote || null,
            until: checkoutUntil ? new Date(checkoutUntil).toISOString() : null,
        });
    };

    const handleCheckin = async () => {
        await checkinPassword(currentPassword.id);
    };

    const handleLinkDevice = async () => {
        if (!selectedDeviceId) {
            return;
        }

        const result = await linkDeviceToPassword(currentPassword.id, selectedDeviceId);
        if (result.success) {
            const refreshed = await getLinkedDevices(currentPassword.id);
            setLinkedDevices(refreshed);
            setSelectedDeviceId('');
        }
    };

    const handleUnlinkDevice = async (linkId) => {
        const result = await unlinkDeviceFromPassword(currentPassword.id, linkId);
        if (result.success) {
            const refreshed = await getLinkedDevices(currentPassword.id);
            setLinkedDevices(refreshed);
        }
    };

    const handleCopyAutofill = async () => {
        await navigator.clipboard.writeText(buildAutofillClipboardText(currentPassword));
        toast.success('Paquete de autofill copiado');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl font-bold text-white">
                            {currentPassword.title.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{currentPassword.title}</h2>
                            {currentPassword.url && (
                                <a
                                    href={currentPassword.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                                >
                                    <Globe className="h-3 w-3" />
                                    {currentPassword.url}
                                </a>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    {security && (
                        <div className={`rounded-xl border p-4 ${security.bgColor} ${security.borderColor}`}>
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className={`h-5 w-5 ${security.color}`} />
                                    <span className={`font-semibold ${security.color}`}>Seguridad de la contrasena</span>
                                </div>
                                <span className={`text-sm font-bold ${security.color}`}>{security.level.toUpperCase()}</span>
                            </div>
                            <p className={`text-sm ${security.color} opacity-90`}>
                                {getSecurityEmoji(security.level)} Tiempo estimado de hackeo: <strong>{security.time}</strong>
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                                <User className="h-3 w-3" /> Usuario
                            </label>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                                <span className="flex-1 truncate font-mono text-slate-200">{currentPassword.username}</span>
                                <button
                                    onClick={() => copyToClipboard(currentPassword.username, 'Usuario')}
                                    className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                                <Shield className="h-3 w-3" /> Contrasena
                            </label>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                                <span className="flex-1 truncate font-mono text-slate-200">
                                    {showPassword ? currentPassword.password : '••••••••••••••••'}
                                </span>
                                <button
                                    onClick={() => setShowPassword((previous) => !previous)}
                                    className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(currentPassword.password, 'Contrasena')}
                                    className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleDuplicate}
                                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                >
                                    Duplicar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTemplate}
                                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                >
                                    Guardar plantilla
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCopyAutofill}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                >
                                    <ClipboardPaste className="h-4 w-4" />
                                    Copiar autofill
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="mb-1 flex items-center gap-1.5 text-slate-500">
                                        <Calendar className="h-3 w-3" /> Creado
                                    </p>
                                    <p className="text-slate-300">{formatDate(currentPassword.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="mb-1 flex items-center gap-1.5 text-slate-500">
                                        <Calendar className="h-3 w-3" /> Actualizado
                                    </p>
                                    <p className="text-slate-300">{formatDate(currentPassword.updatedAt)}</p>
                                </div>
                                <div>
                                    <p className="mb-1 flex items-center gap-1.5 text-slate-500">
                                        <Clock className="h-3 w-3" /> Proxima revision
                                    </p>
                                    <p className="text-slate-300">{formatDate(currentPassword.nextReviewAt)}</p>
                                </div>
                                <div>
                                    <p className="mb-1 flex items-center gap-1.5 text-slate-500">
                                        <ArrowLeftRight className="h-3 w-3" /> Renovacion
                                    </p>
                                    <p className="text-slate-300">
                                        {currentPassword.renewalIntervalDays
                                            ? `${currentPassword.renewalIntervalDays} dias`
                                            : 'No definida'}
                                    </p>
                                </div>
                            </div>

                            {currentPassword.owner && (
                                <div>
                                    <h3 className="mb-2 text-sm font-medium text-slate-400">Propietario</h3>
                                    <div className="inline-flex items-center rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400">
                                        {currentPassword.owner}
                                    </div>
                                </div>
                            )}

                            {canWrite && (
                                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">Checkout</h3>
                                        <p className="mt-1 text-sm text-slate-400">
                                            {currentPassword.checkedOutBy
                                                ? `Reservada por ${currentPassword.checkedOutByName || 'otro usuario'}`
                                                : 'Disponible para reservar'}
                                        </p>
                                        {currentPassword.checkedOutUntil && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                Hasta {formatDate(currentPassword.checkedOutUntil)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            type="datetime-local"
                                            value={checkoutUntil}
                                            onChange={(event) => setCheckoutUntil(event.target.value)}
                                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <input
                                            type="text"
                                            value={checkoutNote}
                                            onChange={(event) => setCheckoutNote(event.target.value)}
                                            placeholder="Motivo del checkout"
                                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCheckout}
                                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                                        >
                                            {currentPassword.checkedOutBy ? 'Actualizar checkout' : 'Reservar credencial'}
                                        </button>
                                        {currentPassword.checkedOutBy && (
                                            <button
                                                type="button"
                                                onClick={handleCheckin}
                                                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                                            >
                                                Liberar checkout
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                            <div>
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
                                    <Paperclip className="h-4 w-4" /> Adjuntos cifrados
                                </h3>
                                {isLoadingAttachments ? (
                                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                                        Cargando adjuntos...
                                    </div>
                                ) : attachments.length === 0 ? (
                                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-500">
                                        No hay adjuntos para esta contrasena
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {attachments.map((attachment) => (
                                            <div
                                                key={attachment.id}
                                                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-white">
                                                        {attachment.fileName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {formatAttachmentSize(attachment.sizeBytes)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        try {
                                                            downloadEncryptedAttachment(attachment);
                                                        } catch (error) {
                                                            toast.error(error.message || 'No se pudo descargar el adjunto');
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Descargar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div>
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
                                        <Link2 className="h-4 w-4" /> Dispositivos vinculados
                                    </h3>
                                    <div className="mb-3 flex gap-2">
                                        <select
                                            value={selectedDeviceId}
                                            onChange={(event) => setSelectedDeviceId(event.target.value)}
                                            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="">Seleccionar dispositivo...</option>
                                            {availableDevices.map((device) => (
                                                <option key={device.id} value={device.id}>
                                                    {device.serial || `${device.brand} ${device.model}`}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleLinkDevice}
                                            disabled={!selectedDeviceId}
                                            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Vincular
                                        </button>
                                    </div>

                                    {isLoadingDevices ? (
                                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                                            Cargando dispositivos...
                                        </div>
                                    ) : linkedDevices.length === 0 ? (
                                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-500">
                                            No hay dispositivos vinculados.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {linkedDevices.map((device) => (
                                                <div
                                                    key={device.linkId || device.id}
                                                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-white">
                                                            {device.serial || `${device.brand} ${device.model}`}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {device.assignedTo || 'Sin asignar'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnlinkDevice(device.linkId)}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                                    >
                                                        <Unplug className="h-4 w-4" />
                                                        Desvincular
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-700 bg-slate-900/30 p-6">
                    <button
                        onClick={onClose}
                        className="rounded-xl bg-slate-800 px-6 py-2.5 font-medium text-white transition-colors hover:bg-slate-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
