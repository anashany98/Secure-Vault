import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Clock,
    FileText,
    Key,
    Monitor,
    Search,
    Share2,
    User,
} from 'lucide-react';

import { useInventory } from '../context/InventoryContext';
import { useNotes } from '../context/NotesContext';
import { useAlerts } from '../context/AlertsContext';
import { usePasswords } from '../context/PasswordContext';
import { useView } from '../context/ViewContext';
import DeviceDetailModal from '../components/inventory/DeviceDetailModal';
import AddNoteModal from '../components/notes/AddNoteModal';
import PasswordDetailModal from '../components/passwords/PasswordDetailModal';

const REVIEW_WINDOW_DAYS = 7;
const CHECKOUT_WARNING_HOURS = 24;

function toTimestamp(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function formatDateLabel(value) {
    if (!value) {
        return 'Sin fecha';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Sin fecha';
    }

    return parsed.toLocaleDateString();
}

function StatCard({ accent, count, description, icon, onClick, title }) {
    const IconComponent = icon;

    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
            <div className="mb-4 flex items-center justify-between">
                <div className={`rounded-xl p-3 ${accent}`}>
                    <IconComponent className="h-5 w-5 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">{count}</div>
            </div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
        </button>
    );
}

function ResultRow({ item, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
            <div className={`rounded-lg p-2 ${item.iconBg}`}>
                <item.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">{item.title}</p>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                        {item.kind}
                    </span>
                </div>
                <p className="truncate text-sm text-slate-400">{item.subtitle}</p>
                {item.meta && <p className="mt-1 text-xs text-slate-500">{item.meta}</p>}
            </div>
        </button>
    );
}

export default function Inbox() {
    const {
        alerts,
        browserAlertsEnabled,
        disableBrowserAlerts,
        enableBrowserAlerts,
        permission,
    } = useAlerts();
    const { items } = useInventory();
    const { notes } = useNotes();
    const { passwords, shares } = usePasswords();
    const { setCurrentView } = useView();
    const [query, setQuery] = useState('');
    const [selectedPassword, setSelectedPassword] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [editingNote, setEditingNote] = useState(null);

    const now = Date.now();
    const reviewWindow = now + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const checkoutWarning = now + CHECKOUT_WARNING_HOURS * 60 * 60 * 1000;
    const activePasswords = passwords.filter((item) => !item.isDeleted);
    const activeNotes = notes.filter((item) => !item.isDeleted);
    const activeShares = useMemo(() => (Array.isArray(shares) ? shares : []), [shares]);

    const reviewPasswords = useMemo(
        () => activePasswords.filter((item) => {
            const timestamp = toTimestamp(item.nextReviewAt);
            return timestamp !== null && timestamp <= reviewWindow;
        }),
        [activePasswords, reviewWindow]
    );

    const checkoutAlerts = useMemo(
        () => activePasswords.filter((item) => {
            const timestamp = toTimestamp(item.checkedOutUntil);
            return item.checkedOutBy && timestamp !== null && timestamp <= checkoutWarning;
        }),
        [activePasswords, checkoutWarning]
    );

    const ownerlessPasswords = useMemo(
        () => activePasswords.filter((item) => !String(item.owner || '').trim()),
        [activePasswords]
    );

    const inventoryReviewDue = useMemo(
        () => items.filter((item) => {
            const timestamp = toTimestamp(item.nextReviewAt);
            return timestamp !== null && timestamp <= reviewWindow;
        }),
        [items, reviewWindow]
    );

    const unassignedAssets = useMemo(
        () => items.filter((item) => !String(item.assignedTo || '').trim()),
        [items]
    );

    const expiringShares = useMemo(
        () => activeShares.filter((share) => {
            const timestamp = toTimestamp(share.expiresAt);
            return timestamp !== null && timestamp <= reviewWindow;
        }),
        [activeShares, reviewWindow]
    );

    const searchResults = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return [];
        }

        const matches = [];

        activePasswords.forEach((item) => {
            const haystack = [
                item.title,
                item.username,
                item.url,
                item.owner,
                ...(Array.isArray(item.tags) ? item.tags.map((tag) => tag.name || tag) : []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (haystack.includes(normalizedQuery)) {
                matches.push({
                    id: `password-${item.id}`,
                    icon: Key,
                    iconBg: 'bg-emerald-500/80',
                    kind: 'credencial',
                    meta: item.checkedOutByName
                        ? `Checkout: ${item.checkedOutByName}`
                        : item.owner
                            ? `Owner: ${item.owner}`
                            : null,
                    subtitle: item.username || item.url || 'Sin usuario',
                    title: item.title,
                    onSelect: () => setSelectedPassword(item),
                });
            }
        });

        activeNotes.forEach((note) => {
            const haystack = `${note.title} ${note.content}`.toLowerCase();
            if (haystack.includes(normalizedQuery)) {
                matches.push({
                    id: `note-${note.id}`,
                    icon: FileText,
                    iconBg: 'bg-blue-500/80',
                    kind: 'nota',
                    meta: note.content.slice(0, 80),
                    subtitle: 'Abrir nota segura',
                    title: note.title,
                    onSelect: () => setEditingNote(note),
                });
            }
        });

        items.forEach((item) => {
            const haystack = [
                item.brand,
                item.model,
                item.serial,
                item.assignedTo,
                item.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (haystack.includes(normalizedQuery)) {
                matches.push({
                    id: `device-${item.id}`,
                    icon: Monitor,
                    iconBg: 'bg-violet-500/80',
                    kind: 'activo',
                    meta: item.assignedTo ? `Asignado a ${item.assignedTo}` : 'Sin asignar',
                    subtitle: `${item.brand} ${item.model}`,
                    title: item.serial || `${item.brand} ${item.model}`,
                    onSelect: () => setSelectedDevice(item),
                });
            }
        });

        activeShares.forEach((share) => {
            const haystack = [
                share.passwordTitle,
                share.sharedWithName,
                share.permission,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (haystack.includes(normalizedQuery)) {
                matches.push({
                    id: `share-${share.id}`,
                    icon: Share2,
                    iconBg: 'bg-amber-500/80',
                    kind: 'share',
                    meta: share.expiresAt ? `Caduca el ${formatDateLabel(share.expiresAt)}` : 'Sin caducidad',
                    subtitle: share.sharedWithName || share.sharedWith || 'Destino no disponible',
                    title: share.passwordTitle || 'Compartido',
                    onSelect: () => setCurrentView('shared'),
                });
            }
        });

        return matches.slice(0, 16);
    }, [activeNotes, activePasswords, activeShares, items, query, setCurrentView]);

    const pendingGroups = [
        {
            accent: 'bg-emerald-500/80',
            count: reviewPasswords.length,
            description: 'Contrasenas con revision vencida o en los proximos 7 dias.',
            icon: Key,
            onClick: () => reviewPasswords[0] && setSelectedPassword(reviewPasswords[0]),
            title: 'Revisiones de credenciales',
        },
        {
            accent: 'bg-amber-500/80',
            count: checkoutAlerts.length,
            description: 'Checkouts vencidos o que caducan en menos de 24 horas.',
            icon: Clock,
            onClick: () => checkoutAlerts[0] && setSelectedPassword(checkoutAlerts[0]),
            title: 'Checkouts a vigilar',
        },
        {
            accent: 'bg-rose-500/80',
            count: ownerlessPasswords.length,
            description: 'Credenciales activas sin owner asignado.',
            icon: User,
            onClick: () => ownerlessPasswords[0] && setSelectedPassword(ownerlessPasswords[0]),
            title: 'Sin propietario',
        },
        {
            accent: 'bg-violet-500/80',
            count: inventoryReviewDue.length,
            description: 'Activos con revision pendiente o vencida.',
            icon: Monitor,
            onClick: () => inventoryReviewDue[0] && setSelectedDevice(inventoryReviewDue[0]),
            title: 'Inventario a revisar',
        },
        {
            accent: 'bg-sky-500/80',
            count: unassignedAssets.length,
            description: 'Dispositivos registrados sin asignacion.',
            icon: AlertTriangle,
            onClick: () => unassignedAssets[0] && setSelectedDevice(unassignedAssets[0]),
            title: 'Activos sin asignar',
        },
        {
            accent: 'bg-orange-500/80',
            count: expiringShares.length,
            description: 'Compartidos internos que caducan en la proxima semana.',
            icon: Share2,
            onClick: () => setCurrentView('shared'),
            title: 'Shares a renovar',
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Pendientes</h1>
                    <p className="mt-2 text-slate-400">
                        Panel operativo con revisiones, checkouts, shares y busqueda global.
                    </p>
                </div>
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar en credenciales, notas, inventario y compartidos..."
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 py-3 pl-11 pr-4 text-white outline-none transition-colors focus:border-primary/60"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingGroups.map((group) => (
                    <StatCard key={group.title} {...group} />
                ))}
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Alertas reales</h2>
                        <p className="text-sm text-slate-400">Feed generado por backend y opcionalmente enviado al navegador.</p>
                    </div>
                    <div className="flex gap-2">
                        {!browserAlertsEnabled || permission !== 'granted' ? (
                            <button
                                type="button"
                                onClick={enableBrowserAlerts}
                                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                            >
                                Activar avisos del navegador
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={disableBrowserAlerts}
                                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                            >
                                Desactivar avisos
                            </button>
                        )}
                    </div>
                </div>

                {alerts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 px-6 py-8 text-center text-slate-500">
                        No hay alertas activas ahora mismo.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.slice(0, 8).map((alert) => (
                            <div
                                key={alert.id}
                                className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">{alert.title}</p>
                                        <p className="text-sm text-slate-400">{alert.message}</p>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                                        alert.severity === 'high'
                                            ? 'bg-red-500/10 text-red-400'
                                            : alert.severity === 'medium'
                                                ? 'bg-amber-500/10 text-amber-400'
                                                : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {alert.severity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Buscador global</h2>
                            <p className="text-sm text-slate-400">Acceso cruzado a todo el espacio de trabajo.</p>
                        </div>
                        {query && (
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                                {searchResults.length} resultados
                            </span>
                        )}
                    </div>

                    {query ? (
                        searchResults.length > 0 ? (
                            <div className="space-y-3">
                                {searchResults.map((result) => (
                                    <ResultRow key={result.id} item={result} onSelect={result.onSelect} />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center text-slate-500">
                                No hay resultados para "{query}".
                            </div>
                        )
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center text-slate-500">
                            Escribe para buscar entre credenciales, notas, inventario y shares.
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-white">Proximas acciones</h2>
                        <p className="text-sm text-slate-400">Resumen rapido de lo que conviene atender primero.</p>
                    </div>

                    <div className="space-y-3">
                        {reviewPasswords.slice(0, 3).map((item) => (
                            <ResultRow
                                key={`review-${item.id}`}
                                item={{
                                    icon: Key,
                                    iconBg: 'bg-emerald-500/80',
                                    kind: 'revision',
                                    meta: `Revision ${formatDateLabel(item.nextReviewAt)}`,
                                    subtitle: item.username || 'Sin usuario',
                                    title: item.title,
                                }}
                                onSelect={() => setSelectedPassword(item)}
                            />
                        ))}
                        {inventoryReviewDue.slice(0, 2).map((item) => (
                            <ResultRow
                                key={`inventory-${item.id}`}
                                item={{
                                    icon: Monitor,
                                    iconBg: 'bg-violet-500/80',
                                    kind: 'activo',
                                    meta: `Revision ${formatDateLabel(item.nextReviewAt)}`,
                                    subtitle: `${item.brand} ${item.model}`,
                                    title: item.serial || item.brand,
                                }}
                                onSelect={() => setSelectedDevice(item)}
                            />
                        ))}
                        {expiringShares.slice(0, 2).map((share) => (
                            <ResultRow
                                key={`share-${share.id}`}
                                item={{
                                    icon: Share2,
                                    iconBg: 'bg-orange-500/80',
                                    kind: 'share',
                                    meta: share.expiresAt ? `Caduca el ${formatDateLabel(share.expiresAt)}` : 'Sin fecha',
                                    subtitle: share.sharedWithName || share.sharedWith || 'Destino',
                                    title: share.passwordTitle || 'Compartido interno',
                                }}
                                onSelect={() => setCurrentView('shared')}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <PasswordDetailModal
                isOpen={!!selectedPassword}
                password={selectedPassword}
                onClose={() => setSelectedPassword(null)}
            />
            <DeviceDetailModal
                isOpen={!!selectedDevice}
                device={selectedDevice}
                onClose={() => setSelectedDevice(null)}
            />
            <AddNoteModal
                isOpen={!!editingNote}
                editingNote={editingNote}
                onClose={() => setEditingNote(null)}
            />
        </div>
    );
}
