import { useState } from 'react';
import { X, Copy, Eye, EyeOff, Globe, Calendar, Shield, ExternalLink, User, Lock, Tag, Clock } from 'lucide-react';
import { calculateCrackTime, getSecurityEmoji } from '../../lib/passwordSecurity';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function PasswordDetailModal({ isOpen, onClose, password }) {
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen || !password) return null;

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
    };

    const security = calculateCrackTime(password.password);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                            {password.title.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{password.title}</h2>
                            {password.url && (
                                <a
                                    href={password.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                                >
                                    <Globe className="w-3 h-3" />
                                    {password.url}
                                </a>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                    {/* Security Banner */}
                    <div className={`p-4 rounded-xl border ${security.bgColor} ${security.borderColor}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Shield className={`w-5 h-5 ${security.color}`} />
                                <span className={`font-semibold ${security.color}`}>Seguridad de la contraseña</span>
                            </div>
                            <span className={`text-sm font-bold ${security.color}`}>{security.level.toUpperCase()}</span>
                        </div>
                        <p className={`text-sm ${security.color} opacity-90`}>
                            {getSecurityEmoji(security.level)} Tiempo estimado de hackeo: <strong>{security.time}</strong>
                        </p>
                    </div>


                    {/* Credentials */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <User className="w-3 h-3" /> Usuario
                            </label>
                            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl p-3 group hover:border-slate-700 transition-colors">
                                <span className="flex-1 font-mono text-slate-200 truncate">{password.username}</span>
                                <button
                                    onClick={() => copyToClipboard(password.username, 'Usuario')}
                                    className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <Lock className="w-3 h-3" /> Contraseña
                            </label>
                            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl p-3 group hover:border-slate-700 transition-colors">
                                <span className="flex-1 font-mono text-slate-200 truncate">
                                    {showPassword ? password.password : '••••••••••••••••'}
                                </span>
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(password.password, 'Contraseña')}
                                    className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        {password.meta_person && (
                            <div>
                                <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Propietario / Asignado a
                                </h3>
                                <div className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg inline-flex items-center text-sm border border-blue-500/20">
                                    {password.meta_person}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> Creado
                                </span>
                                <span className="text-slate-300">
                                    {password.created_at ? format(new Date(password.created_at), 'PPP', { locale: es }) : 'N/A'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" /> Actualizado
                                </span>
                                <span className="text-slate-300">
                                    {password.updated_at ? format(new Date(password.updated_at), 'PPP', { locale: es }) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 shrink-0 bg-slate-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
