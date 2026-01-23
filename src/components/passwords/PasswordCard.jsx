import { useState } from 'react';
import { Eye, EyeOff, Copy, Clipboard, Star, Trash2, Edit, ExternalLink, History, Share2, AlertTriangle, Clock, Globe, RotateCcw, XCircle, Shield } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import { useUsage } from '../../context/UsageContext';
import { calculateCrackTime, getSecurityEmoji } from '../../lib/passwordSecurity';
import PasswordHistoryModal from './PasswordHistoryModal';
import EditPasswordModal from './EditPasswordModal';
import SharePasswordModal from './SharePasswordModal';
import toast from 'react-hot-toast';

import { cn } from '../../lib/utils';

export default function PasswordCard({ item, onClick, onShare }) {
    const [showPassword, setShowPassword] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { deletePassword, toggleFavorite, restorePassword, permanentlyDeletePassword, getPasswordShares, checkPasswordForBreach } = usePasswords();
    const { trackCopy } = useUsage();
    // const { currentView } = useView();

    const copyToClipboard = (text, label = 'Texto') => {
        navigator.clipboard.writeText(text);
        trackCopy(); // Track copy action
        toast.success(`✅ ${label} copiado`);
    };

    const copyAll = () => {
        const text = `${item.username}\t${item.password}`;
        navigator.clipboard.writeText(text);
        trackCopy(); // Track copy action
        toast.success('✅ Usuario y contraseña copiados');
    };

    return (
        <div className={cn(
            "bg-surface border border-slate-700 rounded-xl p-5 hover:border-primary/50 transition-all group relative",
            item.isDeleted && "opacity-75 grayscale hover:grayscale-0"
        )}>
            <div className="absolute top-4 right-4 flex gap-2">
                {item.isDeleted ? (
                    <>
                        <button
                            onClick={() => restorePassword(item.id)}
                            className="text-primary hover:text-emerald-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Restaurar"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => permanentlyDeletePassword(item.id)}
                            className="text-danger hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Eliminar permanentemente"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => toggleFavorite(item.id)}
                            className={cn(
                                "p-1 rounded-lg hover:bg-slate-800 transition-colors",
                                item.isFavorite ? "text-warning fill-warning" : "text-slate-500 hover:text-warning"
                            )}
                            title="Favorito"
                        >
                            <Star className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsHistoryOpen(true)}
                            className="text-slate-500 hover:text-blue-400 p-1 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 relative"
                            title="Ver historial"
                        >
                            <Clock className="w-4 h-4" />
                            {item.history && item.history.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {item.history.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setIsEditOpen(true)}
                            className="text-slate-500 hover:text-primary p-1 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onShare ? onShare : () => setIsShareOpen(true)}
                            className="text-slate-500 hover:text-primary p-1 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 relative"
                            title="Compartir"
                        >
                            <Share2 className="w-4 h-4" />
                            {(() => {
                                const shares = getPasswordShares(item.id);
                                return shares.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {shares.length}
                                    </span>
                                );
                            })()}
                        </button>
                        <button
                            onClick={() => deletePassword(item.id)}
                            className="text-slate-500 hover:text-danger p-1 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Mover a papelera"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl font-bold text-white shrink-0">
                    {item.title.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate pr-16">{item.title}</h3>
                    <p className="text-slate-400 text-sm truncate">{item.username}</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between group/field hover:bg-slate-900 transition-colors">
                    <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Usuario</p>
                        <p className="text-slate-300 text-sm truncate">{item.username}</p>
                    </div>
                    <button
                        onClick={() => copyToClipboard(item.username)}
                        className="text-slate-500 hover:text-white opacity-0 group-hover/field:opacity-100 transition-opacity"
                        title="Copiar usuario"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between group/field hover:bg-slate-900 transition-colors">
                    <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-0.5">Contraseña</p>
                        <p className="text-slate-300 text-sm truncate font-mono">
                            {showPassword ? item.password : '••••••••••••'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover/field:opacity-100 transition-opacity">
                        <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-500 hover:text-white"
                            title={showPassword ? "Ocultar" : "Mostrar"}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => copyToClipboard(item.password, 'Contraseña')}
                            className="text-slate-500 hover:text-white"
                            title="Copiar contraseña"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={copyAll}
                            className="text-slate-500 hover:text-primary"
                            title="Copiar usuario y contraseña"
                        >
                            <Clipboard className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {item.url && (
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-secondary hover:text-secondary/80 mt-2"
                    >
                        <Globe className="w-3 h-3" />
                        <span className="truncate">{item.url}</span>
                    </a>
                )}

                {/* Security Indicator */}
                {!item.isDeleted && (() => {
                    const security = calculateCrackTime(item.password);
                    return (
                        <div className={cn(
                            "mt-3 p-2 rounded-lg border transition-colors",
                            security.bgColor,
                            security.borderColor
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className={cn("w-3.5 h-3.5", security.color)} />
                                    <span className={cn("text-xs font-medium", security.color)}>
                                        {getSecurityEmoji(security.level)} Tiempo de hackeo
                                    </span>
                                </div>
                                <span className={cn("text-xs font-bold", security.color)}>
                                    {security.time}
                                </span>
                            </div>
                        </div>
                    );
                })()}

                {/* Breach Alert */}
                {!item.isDeleted && item.breachCount > 0 && (
                    <div className="mt-3 p-3 rounded-lg border-2 border-red-500/50 bg-red-500/10 animate-pulse">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-red-500 font-bold text-sm mb-1">
                                    ⚠️ Contraseña Comprometida
                                </div>
                                <p className="text-xs text-red-400">
                                    Esta contraseña ha aparecido en <strong>{item.breachCount.toLocaleString()}</strong> filtraciones de datos.
                                    {' '}
                                    <button
                                        className="underline hover:text-red-300"
                                        onClick={() => alert('Se recomienda cambiar esta contraseña inmediatamente por una única y segura.')}
                                    >
                                        ¿Qué hacer?
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Password History Modal */}
            <PasswordHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                passwordItem={item}
            />

            {/* Share Password Modal */}
            <SharePasswordModal
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                passwordItem={item}
            />

            {/* Edit Password Modal */}
            <EditPasswordModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                password={item}
            />
        </div>
    );
}
