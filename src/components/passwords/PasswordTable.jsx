import { useState } from 'react';
import {
    AlertTriangle,
    Clock,
    Copy,
    Edit,
    Eye,
    EyeOff,
    ExternalLink,
    Files,
    Share2,
    Shield,
    Star,
    Trash2,
} from 'lucide-react';

import { usePasswords } from '../../context/PasswordContext';
import { calculateCrackTime } from '../../lib/passwordSecurity';
import { cn } from '../../lib/utils';
import EditPasswordModal from './EditPasswordModal';
import PasswordHistoryModal from './PasswordHistoryModal';
import SharePasswordModal from './SharePasswordModal';

function isReviewDue(item) {
    if (!item.nextReviewAt) {
        return false;
    }

    const timestamp = new Date(item.nextReviewAt).getTime();
    return !Number.isNaN(timestamp) && timestamp <= Date.now() + 7 * 24 * 60 * 60 * 1000;
}

export default function PasswordTable({ items, onEdit, onShare }) {
    const { deletePassword, duplicatePassword, toggleFavorite } = usePasswords();
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [editingItem, setEditingItem] = useState(null);
    const [sharingItem, setSharingItem] = useState(null);
    const [historyItem, setHistoryItem] = useState(null);

    const stop = (handler) => (event) => {
        event.stopPropagation();
        handler();
    };

    const togglePassword = (id) => {
        setVisiblePasswords((previous) => ({
            ...previous,
            [id]: !previous[id],
        }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-surface">
            <table className="w-full border-collapse text-left">
                <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Servicio</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Usuario</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Contrasena</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Propietario</th>
                        <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {items.map((item) => (
                        <tr
                            key={item.id}
                            data-testid={`password-row-${item.id}`}
                            onClick={() => onEdit?.(item)}
                            className="group cursor-pointer transition-colors hover:bg-slate-800/30"
                        >
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 font-bold text-white">
                                        {item.title.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">{item.title}</div>
                                        {item.url && (
                                            <a
                                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(event) => event.stopPropagation()}
                                                className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:text-emerald-400"
                                            >
                                                Visitar <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-slate-300">{item.username}</span>
                                    <button
                                        onClick={stop(() => copyToClipboard(item.username))}
                                        className="rounded-lg p-1.5 text-slate-500 opacity-0 transition-all hover:bg-slate-700 hover:text-white group-hover:opacity-100"
                                        title="Copiar usuario"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className="min-w-[8ch] font-mono text-sm text-slate-300">
                                        {visiblePasswords[item.id] ? item.password : '••••••••'}
                                    </span>
                                    <div className="flex items-center opacity-0 transition-all group-hover:opacity-100">
                                        <button
                                            onClick={stop(() => togglePassword(item.id))}
                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white"
                                            title={visiblePasswords[item.id] ? 'Ocultar' : 'Mostrar'}
                                        >
                                            {visiblePasswords[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                        <button
                                            onClick={stop(() => copyToClipboard(item.password))}
                                            className="ml-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white"
                                            title="Copiar contrasena"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-wrap gap-2">
                                    {item.breachCount > 0 ? (
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-500">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>COMPROMETIDA</span>
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                                            calculateCrackTime(item.password).bgColor,
                                            calculateCrackTime(item.password).borderColor
                                        )}>
                                            <Shield className={cn('h-3 w-3', calculateCrackTime(item.password).color)} />
                                            <span className={calculateCrackTime(item.password).color}>
                                                {calculateCrackTime(item.password).time}
                                            </span>
                                        </div>
                                    )}
                                    {item.checkedOutBy && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                                            <Clock className="h-3 w-3" />
                                            Checkout
                                        </span>
                                    )}
                                    {isReviewDue(item) && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                                            <AlertTriangle className="h-3 w-3" />
                                            Revision
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="p-4">
                                {item.meta_person ? (
                                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                                        {item.meta_person}
                                    </span>
                                ) : (
                                    <span className="text-xs italic text-slate-600">N/A</span>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={stop(() => toggleFavorite(item.id))}
                                        className={cn(
                                            'rounded-lg p-2 transition-colors',
                                            item.isFavorite
                                                ? 'text-warning hover:bg-warning/10'
                                                : 'text-slate-400 hover:bg-warning/10 hover:text-warning'
                                        )}
                                        title="Favorito"
                                    >
                                        <Star className={cn('h-4 w-4', item.isFavorite && 'fill-current')} />
                                    </button>
                                    <button
                                        onClick={stop(() => duplicatePassword(item.id))}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                                        title="Duplicar"
                                    >
                                        <Files className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={stop(() => setHistoryItem(item))}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-400/10 hover:text-blue-400"
                                        title="Historial"
                                    >
                                        <Clock className="h-4 w-4" />
                                    </button>
                                    <button
                                        data-testid={`password-table-share-${item.id}`}
                                        onClick={stop(() => {
                                            if (onShare) {
                                                onShare(item);
                                                return;
                                            }
                                            setSharingItem(item);
                                        })}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                                        title="Compartir"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={stop(() => setEditingItem(item))}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-primary/10 hover:text-primary"
                                        title="Editar"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        data-testid={`password-table-delete-${item.id}`}
                                        onClick={stop(() => deletePassword(item.id))}
                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {editingItem && (
                <EditPasswordModal
                    isOpen={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    password={editingItem}
                />
            )}
            {sharingItem && (
                <SharePasswordModal
                    isOpen={!!sharingItem}
                    onClose={() => setSharingItem(null)}
                    passwordItem={sharingItem}
                />
            )}
            {historyItem && (
                <PasswordHistoryModal
                    isOpen={!!historyItem}
                    onClose={() => setHistoryItem(null)}
                    passwordItem={historyItem}
                />
            )}
        </div>
    );
}
