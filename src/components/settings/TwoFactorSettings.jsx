import { useState } from 'react';
import { CheckCircle, Copy, Info, Key, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export default function TwoFactorSettings({ user }) {
    const [isEnabled, setIsEnabled] = useState(user?.two_factor_enabled || false);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [step, setStep] = useState(1);
    const [setupData, setSetupData] = useState(null);
    const [token, setToken] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const isRequired = Boolean(user?.two_factor_required);

    const startSetup = async () => {
        try {
            setLoading(true);
            const data = await api.post('/auth/2fa/setup');
            setSetupData(data);
            setStep(2);
            setIsSettingUp(true);
        } catch {
            toast.error('Error al iniciar configuracion 2FA');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (token.length !== 6) {
            return;
        }

        try {
            setLoading(true);
            const data = await api.post('/auth/2fa/enable', { token });
            setRecoveryCodes(data.recoveryCodes);
            setIsEnabled(true);
            setStep(3);
            toast.success('2FA habilitado correctamente');
        } catch (error) {
            toast.error(error.message || 'Codigo invalido');
        } finally {
            setLoading(false);
        }
    };

    const disable2FA = async () => {
        const password = window.prompt('Introduce tu contrasena maestra para deshabilitar 2FA:');
        if (!password) {
            return;
        }

        const totp = window.prompt('Introduce el codigo actual de tu aplicacion autenticadora:');
        if (!totp) {
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/2fa/disable', { password, token: totp });
            setIsEnabled(false);
            toast.success('2FA deshabilitado');
        } catch (error) {
            toast.error(error.message || 'Error al deshabilitar 2FA');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-surface">
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 p-6">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                        )}
                    >
                        <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Autenticacion de Dos Factores (2FA)</h3>
                        <p className="text-xs text-slate-400">
                            Protege tu cuenta con un codigo temporal de tu movil
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEnabled ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            Activado
                        </span>
                    ) : (
                        <span className="rounded-full border border-slate-700 bg-slate-700/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Desactivado
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6">
                {!isSettingUp ? (
                    <div className="space-y-4">
                        <p className="text-sm leading-relaxed text-slate-400">
                            Al activar el 2FA, SecureVault solicitara un codigo de seguridad generado por una aplicacion
                            como Google Authenticator o Authy cada vez que intentes iniciar sesion.
                        </p>
                        <div className="pt-2">
                            {isEnabled ? (
                                <button
                                    disabled={isRequired}
                                    className="rounded-xl border border-red-900/20 bg-red-900/10 px-4 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-900/20"
                                    data-testid="twofa-disable"
                                    onClick={disable2FA}
                                >
                                    {isRequired ? '2FA obligatorio' : 'Desactivar 2FA'}
                                </button>
                            ) : (
                                <button
                                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                                    data-testid="twofa-start-setup"
                                    onClick={startSetup}
                                >
                                    <Key className="h-4 w-4" />
                                    Configurar 2FA
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-8 md:flex-row">
                                    <div className="shrink-0 rounded-xl bg-white p-4 shadow-inner">
                                        <img alt="2FA QR Code" className="h-48 w-48" src={setupData?.qrCode} />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-2 font-bold text-white">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                                                1
                                            </span>
                                            Escanea el codigo QR
                                        </h4>
                                        <p className="text-sm text-slate-400">
                                            Usa tu aplicacion de autenticacion para escanear este codigo. Si no puedes
                                            escanearlo, usa el codigo manual:
                                        </p>
                                        <div className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2">
                                            <code className="font-mono text-sm text-primary">{setupData?.secret}</code>
                                            <button
                                                className="ml-auto rounded p-1 text-slate-500 opacity-0 transition-all hover:bg-slate-800 group-hover:opacity-100"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(setupData?.secret || '');
                                                    toast.success('Copiado al portapapeles');
                                                }}
                                                type="button"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 font-bold text-white">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                                            2
                                        </span>
                                        Introduce el codigo de verificacion
                                    </h4>
                                    <div className="flex gap-2">
                                        <input
                                            className="w-48 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            data-testid="twofa-token-input"
                                            maxLength={6}
                                            onChange={(event) => setToken(event.target.value.replace(/\D/g, ''))}
                                            placeholder="000000"
                                            type="text"
                                            value={token}
                                        />
                                        <button
                                            className="flex-1 rounded-xl bg-primary font-bold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                            data-testid="twofa-verify-enable"
                                            disabled={token.length !== 6 || loading}
                                            onClick={verifyAndEnable}
                                            type="button"
                                        >
                                            Verificar y Activar
                                        </button>
                                    </div>
                                </div>

                                <button
                                    className="text-xs text-slate-500 transition-colors hover:text-white"
                                    onClick={() => setIsSettingUp(false)}
                                    type="button"
                                >
                                    Cancelar configuracion
                                </button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                    <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-400">2FA habilitado con exito</h4>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Guarda estos codigos de recuperacion en un lugar seguro.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs">
                                    {recoveryCodes.map((code, index) => (
                                        <div key={code} className="flex justify-between px-2 text-slate-300">
                                            <span className="opacity-30">{index + 1}.</span>
                                            <span>{code}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 font-bold text-white transition-all hover:bg-slate-700"
                                    data-testid="twofa-finish"
                                    onClick={() => {
                                        setIsSettingUp(false);
                                        setStep(1);
                                        setToken('');
                                    }}
                                    type="button"
                                >
                                    Entendido, he guardado los codigos
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-3 border-t border-slate-700 bg-blue-500/5 px-6 py-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <p className="text-[10px] leading-normal text-slate-500">
                    Importante: si habilitas 2FA y pierdes tu dispositivo y tus codigos de recuperacion,
                    perderas el acceso a tu cuenta permanentemente.
                    {isRequired ? ' Esta cuenta tiene 2FA obligatorio y no puede desactivarlo.' : ''}
                </p>
            </div>
        </div>
    );
}
