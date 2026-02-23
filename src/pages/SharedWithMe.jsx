import { useEffect } from 'react';
import { Share2, Clock, User, Shield, Lock } from 'lucide-react';
import { usePasswords } from '../context/PasswordContext';
import { useAuth } from '../context/AuthContext';
import PasswordCard from '../components/passwords/PasswordCard';

export default function SharedWithMe() {
    const { getSharedPasswords, updateShareAccess } = usePasswords();
    const { user } = useAuth();

    const sharedPasswords = getSharedPasswords();

    useEffect(() => {
        // Mark shares as accessed
        sharedPasswords.forEach(item => {
            if (item.share) {
                updateShareAccess(item.share.id);
            }
        });
    }, []);

    const getExpirationText = (expiresAt) => {
        if (!expiresAt) return 'Sin expiración';

        const now = Date.now();
        const timeLeft = expiresAt - now;

        if (timeLeft < 0) return '⚠️ Expirado';

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `Expira en ${days}d`;
        if (hours > 0) return `Expira en ${hours}h`;
        return 'Expira pronto';
    };

    return (
        <>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Compartidas Conmigo</h1>
                        <p className="text-slate-400">Contraseñas que otros han compartido contigo</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Total Compartidas</p>
                            <p className="text-3xl font-bold text-white">{sharedPasswords.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Lock className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Con Permisos de Edición</p>
                            <p className="text-3xl font-bold text-white">
                                {sharedPasswords.filter(p => p.share?.permission === 'write').length}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Próximas a Expirar</p>
                            <p className="text-3xl font-bold text-white">
                                {sharedPasswords.filter(p => {
                                    if (!p.share?.expiresAt) return false;
                                    const timeLeft = p.share.expiresAt - Date.now();
                                    return timeLeft > 0 && timeLeft < 7 * 24 * 60 * 60 * 1000; // Less than 7 days
                                }).length}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Shared Passwords List */}
            {sharedPasswords.length === 0 ? (
                <div className="bg-surface border border-slate-700 rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Share2 className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        No hay contraseñas compartidas
                    </h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Cuando alguien comparta una contraseña contigo, aparecerá aquí
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sharedPasswords.map(item => (
                        <div key={item.id} className="relative">
                            {/* Share Info Banner */}
                            <div className="bg-blue-900/20 border border-blue-900/50 rounded-t-xl p-3 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-4 text-blue-400">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>Compartido por: <strong>Usuario {item.share.sharedBy}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.share.permission === 'write'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-slate-700 text-slate-300'
                                            }`}>
                                            {item.share.permission === 'write' ? 'Puede editar' : 'Solo lectura'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{getExpirationText(item.share.expiresAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Password Card */}
                            <div className="border-x border-b border-slate-700 rounded-b-xl overflow-hidden">
                                <PasswordCard item={item} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
