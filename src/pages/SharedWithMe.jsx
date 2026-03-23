import { useEffect, useMemo } from 'react';
import { Clock, Lock, Share2, Shield, User } from 'lucide-react';

import PasswordCard from '../components/passwords/PasswordCard';
import { useAuth } from '../context/AuthContext';
import { usePasswords } from '../context/PasswordContext';

export default function SharedWithMe() {
    const { vaultAccess } = useAuth();
    const { getSharedPasswords, updateShareAccess } = usePasswords();

    const sharedPasswords = useMemo(() => getSharedPasswords(), [getSharedPasswords]);

    useEffect(() => {
        sharedPasswords.forEach((item) => {
            if (item.share) {
                updateShareAccess(item.share.id);
            }
        });
    }, [sharedPasswords, updateShareAccess]);

    const getExpirationText = (expiresAt) => {
        if (!expiresAt) return 'Sin expiracion';

        const now = Date.now();
        const timeLeft = new Date(expiresAt).getTime() - now;

        if (timeLeft < 0) return 'Expirado';

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `Expira en ${days}d`;
        if (hours > 0) return `Expira en ${hours}h`;
        return 'Expira pronto';
    };

    return (
        <>
            <div className="mb-8">
                <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                        <Share2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Compartidas Conmigo</h1>
                        <p className="text-slate-400">Credenciales que otros usuarios han compartido contigo</p>
                    </div>
                </div>
            </div>

            {vaultAccess?.mode === 'team' && (
                <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-200">
                    La boveda del equipo ya es compartida entre los usuarios autorizados.
                    Esta seccion solo muestra shares clasicos del esquema anterior.
                </div>
            )}

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-700 bg-surface p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="mb-1 text-sm text-slate-400">Total Compartidas</p>
                            <p className="text-3xl font-bold text-white">{sharedPasswords.length}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                            <Lock className="h-6 w-6 text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-surface p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="mb-1 text-sm text-slate-400">Con Permisos de Edicion</p>
                            <p className="text-3xl font-bold text-white">
                                {sharedPasswords.filter((item) => item.share?.permission === 'write').length}
                            </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
                            <Shield className="h-6 w-6 text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-surface p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="mb-1 text-sm text-slate-400">Proximas a Expirar</p>
                            <p className="text-3xl font-bold text-white">
                                {sharedPasswords.filter((item) => {
                                    if (!item.share?.expiresAt) return false;
                                    const timeLeft = new Date(item.share.expiresAt).getTime() - Date.now();
                                    return timeLeft > 0 && timeLeft < 7 * 24 * 60 * 60 * 1000;
                                }).length}
                            </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20">
                            <Clock className="h-6 w-6 text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>

            {sharedPasswords.length === 0 ? (
                <div className="rounded-2xl border border-slate-700 bg-surface p-12 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                        <Share2 className="h-10 w-10 text-slate-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                        No hay contrasenas compartidas
                    </h3>
                    <p className="mx-auto max-w-md text-slate-400">
                        Cuando alguien comparta una contrasena compatible contigo, aparecera aqui.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sharedPasswords.map((item) => (
                        <div key={item.id} className="relative">
                            <div className="flex items-center justify-between rounded-t-xl border border-blue-900/50 bg-blue-900/20 p-3 text-sm">
                                <div className="flex items-center gap-4 text-blue-400">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>Compartido por: <strong>Usuario {item.share.sharedBy}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${item.share.permission === 'write'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-slate-700 text-slate-300'
                                            }`}>
                                            {item.share.permission === 'write' ? 'Puede editar' : 'Solo lectura'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{getExpirationText(item.share.expiresAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-b-xl border-x border-b border-slate-700">
                                <PasswordCard item={item} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
