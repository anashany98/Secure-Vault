import { useState, useEffect } from 'react';
import { Shield, Smartphone, CheckCircle, AlertTriangle, Key, X, Info, Copy } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function TwoFactorSettings({ user }) {
    const [isEnabled, setIsEnabled] = useState(user?.two_factor_enabled || false);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: QR, 3: Verify/Recovery
    const [setupData, setSetupData] = useState(null);
    const [token, setToken] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [loading, setLoading] = useState(false);

    const startSetup = async () => {
        try {
            setLoading(true);
            const data = await api.post('/auth/2fa/setup');
            setSetupData(data);
            setStep(2);
            setIsSettingUp(true);
        } catch (err) {
            toast.error('Error al iniciar configuración 2FA');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (token.length !== 6) return;
        try {
            setLoading(true);
            const data = await api.post('/auth/2fa/enable', { token });
            setRecoveryCodes(data.recoveryCodes);
            setIsEnabled(true);
            setStep(3);
            toast.success('2FA habilitado correctamente');
        } catch (err) {
            toast.error(err.message || 'Código inválido');
        } finally {
            setLoading(false);
        }
    };

    const disable2FA = async () => {
        const password = window.prompt('Por favor, introduce tu contraseña maestra para deshabilitar 2FA:');
        if (!password) return;
        const totp = window.prompt('Introduce el código actual de tu aplicación autenticadora:');
        if (!totp) return;

        try {
            setLoading(true);
            await api.post('/auth/2fa/disable', { password, token: totp });
            setIsEnabled(false);
            toast.success('2FA deshabilitado');
        } catch (err) {
            toast.error(err.message || 'Error al deshabilitar 2FA');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                    )}>
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">Autenticación de Dos Factores (2FA)</h3>
                        <p className="text-xs text-slate-400">Protege tu cuenta con un código temporal de tu móvil</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEnabled ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3" />
                            Activado
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-slate-700/50 text-slate-400 border border-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Desactivado
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6">
                {!isSettingUp ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Al activar el 2FA, SecureVault solicitará un código de seguridad generado por una aplicación como Google Authenticator o Authy cada vez que intentes iniciar sesión.
                        </p>
                        <div className="pt-2">
                            {isEnabled ? (
                                <button
                                    data-testid="twofa-disable"
                                    onClick={disable2FA}
                                    className="px-4 py-2 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/20 rounded-xl transition-all text-sm font-bold"
                                >
                                    Desactivar 2FA
                                </button>
                            ) : (
                                <button
                                    data-testid="twofa-start-setup"
                                    onClick={startSetup}
                                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    <Key className="w-4 h-4" />
                                    Configurar 2FA
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="bg-white p-4 rounded-xl shadow-inner shrink-0">
                                        <img src={setupData?.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-white font-bold flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">1</span>
                                            Escanea el código QR
                                        </h4>
                                        <p className="text-sm text-slate-400">
                                            Usa tu aplicación de autenticación para escanear este código. Si no puedes escanearlo, usa el código manual:
                                        </p>
                                        <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg group">
                                            <code className="text-primary font-mono text-sm">{setupData?.secret}</code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(setupData?.secret);
                                                    toast.success('Copiado al portapapeles');
                                                }}
                                                className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 rounded transition-all text-slate-500"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">2</span>
                                        Introduce el código de verificación
                                    </h4>
                                    <div className="flex gap-2">
                                        <input
                                            data-testid="twofa-token-input"
                                            type="text"
                                            maxLength={6}
                                            value={token}
                                            onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                                            placeholder="000000"
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-2xl font-mono tracking-[0.5em] w-48"
                                        />
                                        <button
                                            data-testid="twofa-verify-enable"
                                            disabled={token.length !== 6 || loading}
                                            onClick={verifyAndEnable}
                                            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-bold"
                                        >
                                            Verificar y Activar
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSettingUp(false)}
                                    className="text-xs text-slate-500 hover:text-white transition-colors"
                                >
                                    Cancelar configuración
                                </button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <div>
                                        <h4 className="text-emerald-400 font-bold text-sm">¡2FA Habilitado con éxito!</h4>
                                        <p className="text-xs text-slate-400 mt-1">Guarda estos códigos de recuperación en un lugar seguro. Los necesitarás si pierdes acceso a tu móvil.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs">
                                    {recoveryCodes.map((code, i) => (
                                        <div key={i} className="text-slate-300 flex justify-between px-2">
                                            <span className="opacity-30">{i + 1}.</span>
                                            <span>{code}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    data-testid="twofa-finish"
                                    onClick={() => {
                                        setIsSettingUp(false);
                                        setStep(1);
                                        setToken('');
                                    }}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-all font-bold border border-slate-700"
                                >
                                    Entendido, he guardado los códigos
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="px-6 py-4 bg-blue-500/5 border-t border-slate-700 flex gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-normal">
                    Importante: Si habilitas 2FA y pierdes tu dispositivo y tus códigos de recuperación, **perderás el acceso a tu cuenta permanentemente** ya que no tenemos acceso a tus datos personales.
                </p>
            </div>
        </div>
    );
}
