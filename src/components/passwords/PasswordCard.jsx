import { useState } from 'react';
import {
    AlertTriangle,
    Clipboard,
    Clock,
    Copy,
    Edit,
    Eye,
    EyeOff,
    Files,
    Globe,
    RotateCcw,
    Share2,
    Shield,
    Star,
    Trash2,
    XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { usePasswords } from '../../context/PasswordContext';
import { useUsage } from '../../context/UsageContext';
import { calculateCrackTime, getSecurityEmoji } from '../../lib/passwordSecurity';
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

export default function PasswordCard({ item, onClick, onShare }) {
    const [showPassword, setShowPassword] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const {
        deletePassword,
        duplicatePassword,
        getPasswordShares,
        permanentlyDeletePassword,
        restorePassword,
        toggleFavorite,
    } = usePasswords();
    const { trackCopy } = useUsage();

    const stop = (handler) => (event) => {
        event.stopPropagation();
        handler();
    };

    const copyToClipboard = (text, label = 'Texto') => {
        navigator.clipboard.writeText(text);
        trackCopy();
        toast.success(`${label} copiado`);
    };

    const copyAll = () => {
        navigator.clipboard.writeText(`${item.username}\t${item.password}`);
        trackCopy();
        toast.success('Usuario y contrasena copiados');
    };

    return (
        <div
            data-testid={`password-card-${item.id}`}
            onClick={onClick}
            className={cn(
                'group relative rounded-xl border border-slate-700 bg-surface p-5 transition-all hover:border-primary/50',
                onClick && 'cursor-pointer',
                item.isDeleted && 'opacity-75 grayscale hover:grayscale-0'
            )}
        >
            <div className="absolute right-4 top-4 flex gap-2">
                {item.isDeleted ? (
                    <>
                        <button
                            data-testid={`password-restore-${item.id}`}
                            onClick={stop(() => restorePassword(item.id))}
                            className="rounded-lg p-1 text-primary transition-colors hover:bg-slate-800 hover:text-emerald-400"
                            title="Restaurar"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                            data-testid={`password-hard-delete-${item.id}`}
                            onClick={stop(() => permanentlyDeletePassword(item.id))}
                            className="rounded-lg p-1 text-danger transition-colors hover:bg-slate-800 hover:text-red-400"
                            title="Eliminar permanentemente"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={stop(() => toggleFavorite(item.id))}
                            className={cn(
                                'rounded-lg p-1 transition-colors hover:bg-slate-800',
                                item.isFavorite ? 'fill-warning text-warning' : 'text-slate-500 hover:text-warning'
                            )}
                            title="Favorito"
                        >
                            <Star className="h-4 w-4" />
                        </button>
                        <button
                            onClick={stop(() => duplicatePassword(item.id))}
                            className="rounded-lg p-1 text-slate-500 opacity-0 transition-colors hover:bg-slate-800 hover:text-white group-hover:opacity-100"
                            title="Duplicar"
                        >
                            <Files className="h-4 w-4" />
                        </button>
                        <button
                            onClick={stop(() => setIsHistoryOpen(true))}
                            className="relative rounded-lg p-1 text-slate-500 opacity-0 transition-colors hover:bg-slate-800 hover:text-blue-400 group-hover:opacity-100"
                            title="Ver historial"
                        >
                            <Clock className="h-4 w-4" />
                        </button>
                        <button
                            onClick={stop(() => setIsEditOpen(true))}
                            className="rounded-lg p-1 text-slate-500 opacity-0 transition-colors hover:bg-slate-800 hover:text-primary group-hover:opacity-100"
                            title="Editar"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                        <button
                            data-testid={`password-share-${item.id}`}
                            onClick={stop(() => {
                                if (onShare) {
                                    onShare();
                                    return;
                                }
                                setIsShareOpen(true);
                            })}
                            className="relative rounded-lg p-1 text-slate-500 opacity-0 transition-colors hover:bg-slate-800 hover:text-primary group-hover:opacity-100"
                            title="Compartir"
                        >
                            <Share2 className="h-4 w-4" />
                            {getPasswordShares(item.id).length > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                                    {getPasswordShares(item.id).length}
                                </span>
                            )}
                        </button>
                        <button
                            data-testid={`password-delete-${item.id}`}
                            onClick={stop(() => deletePassword(item.id))}
                            className="rounded-lg p-1 text-slate-500 opacity-0 transition-colors hover:bg-slate-800 hover:text-danger group-hover:opacity-100"
                            title="Mover a papelera"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </>
                )}
            </div>

            <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl font-bold text-white">
                    {item.title.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate pr-20 font-semibold text-white">{item.title}</h3>
                    <p className="truncate text-sm text-slate-400">{item.username}</p>
                </div>
            </div>

            {!item.isDeleted && (item.checkedOutBy || isReviewDue(item)) && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {item.checkedOutBy && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                            <Clock className="h-3 w-3" />
                            Checkout activo
                        </span>
                    )}
                    {isReviewDue(item) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                            <AlertTriangle className="h-3 w-3" />
                            Revision pendiente
                        </span>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <div className="group/field flex items-center justify-between rounded-lg bg-slate-900/50 p-3 transition-colors hover:bg-slate-900">
                    <div className="mr-2 min-w-0 flex-1">
                        <p className="mb-0.5 text-xs font-semibold uppercase text-slate-500">Usuario</p>
                        <p className="truncate text-sm text-slate-300">{item.username}</p>
                    </div>
                    <button
                        onClick={stop(() => copyToClipboard(item.username, 'Usuario'))}
                        className="text-slate-500 opacity-0 transition-opacity group-hover/field:opacity-100 hover:text-white"
                        title="Copiar usuario"
                    >
                        <Copy className="h-4 w-4" />
                    </button>
                </div>

                <div className="group/field flex items-center justify-between rounded-lg bg-slate-900/50 p-3 transition-colors hover:bg-slate-900">
                    <div className="mr-2 min-w-0 flex-1">
                        <p className="mb-0.5 text-xs font-semibold uppercase text-slate-500">Contrasena</p>
                        <p className="truncate font-mono text-sm text-slate-300">
                            {showPassword ? item.password : '••••••••••••'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover/field:opacity-100">
                        <button
                            onClick={stop(() => setShowPassword((previous) => !previous))}
                            className="text-slate-500 hover:text-white"
                            title={showPassword ? 'Ocultar' : 'Mostrar'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={stop(() => copyToClipboard(item.password, 'Contrasena'))}
                            className="text-slate-500 hover:text-white"
                            title="Copiar contrasena"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                        <button
                            onClick={stop(copyAll)}
                            className="text-slate-500 hover:text-primary"
                            title="Copiar usuario y contrasena"
                        >
                            <Clipboard className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {item.url && (
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="mt-2 flex items-center gap-2 text-xs text-secondary hover:text-secondary/80"
                    >
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{item.url}</span>
                    </a>
                )}

                {!item.isDeleted && (() => {
                    const security = calculateCrackTime(item.password);
                    return (
                        <div className={cn('mt-3 rounded-lg border p-2 transition-colors', security.bgColor, security.borderColor)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className={cn('h-3.5 w-3.5', security.color)} />
                                    <span className={cn('text-xs font-medium', security.color)}>
                                        {getSecurityEmoji(security.level)} Tiempo de hackeo
                                    </span>
                                </div>
                                <span className={cn('text-xs font-bold', security.color)}>{security.time}</span>
                            </div>
                        </div>
                    );
                })()}

                {!item.isDeleted && item.breachCount > 0 && (
                    <div className="mt-3 rounded-lg border-2 border-red-500/50 bg-red-500/10 p-3 animate-pulse">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <div className="flex-1">
                                <div className="mb-1 text-sm font-bold text-red-500">Contrasena comprometida</div>
                                <p className="text-xs text-red-400">
                                    Esta contrasena ha aparecido en <strong>{item.breachCount.toLocaleString()}</strong> filtraciones.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PasswordHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                passwordItem={item}
            />
            <SharePasswordModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                passwordItem={item}
            />
            <EditPasswordModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                password={item}
            />
        </div>
    );
}
