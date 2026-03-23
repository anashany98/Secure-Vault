import { useMemo, useState } from 'react';
import { CheckCircle, Copy, KeyRound, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code2fa, setCode2fa] = useState('');
    const [enrollmentCode, setEnrollmentCode] = useState('');
    const [error, setError] = useState('');
    const [setupData, setSetupData] = useState(null);
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [loadingSetup, setLoadingSetup] = useState(false);
    const {
        cancelPendingChallenge,
        completeMandatory2FASetup,
        finalizeMandatory2FASetup,
        login,
        pendingChallengeType,
        pendingEnrollmentResult,
        pendingSetupUser,
        startMandatory2FASetup,
        verify2FA,
    } = useAuth();

    const isTwoFactorChallenge = pendingChallengeType === 'login';
    const isMandatorySetup = pendingChallengeType === 'setup';
    const hasRecoveryCodes = recoveryCodes.length > 0;
    const headline = useMemo(() => {
        if (isMandatorySetup) {
            return 'Activacion obligatoria de 2FA';
        }
        if (isTwoFactorChallenge) {
            return 'Verificacion en dos pasos';
        }
        return 'SecureVault';
    }, [isMandatorySetup, isTwoFactorChallenge]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (isTwoFactorChallenge) {
            const result = await verify2FA(code2fa);
            if (!result.success) {
                setError(result.error);
            }
            return;
        }

        const result = await login(email, password);
        if (!result.success) {
            setError(result.error);
        }
    };

    const startSetup = async () => {
        try {
            setLoadingSetup(true);
            const data = await startMandatory2FASetup();
            setSetupData(data);
        } catch {
            setError('No se pudo iniciar la configuracion de 2FA');
        } finally {
            setLoadingSetup(false);
        }
    };

    const enableMandatorySetup = async () => {
        const result = await completeMandatory2FASetup(enrollmentCode);
        if (!result.success) {
            setError(result.error);
            return;
        }

        setRecoveryCodes(result.recoveryCodes || []);
    };

    const renderMandatorySetup = () => {
        if (hasRecoveryCodes && pendingEnrollmentResult) {
            return (
                <div className="space-y-6">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-slate-200">
                        2FA se ha activado correctamente. Guarda estos codigos de recuperacion antes de continuar.
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-4 font-mono text-xs text-slate-200">
                        {recoveryCodes.map((code) => (
                            <div key={code} className="rounded bg-slate-900 px-3 py-2 text-center">
                                {code}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={finalizeMandatory2FASetup}
                        className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3.5 font-bold text-white transition-all hover:scale-[1.01]"
                    >
                        He guardado los codigos y quiero entrar
                    </button>
                </div>
            );
        }

        if (!setupData) {
            return (
                <div className="space-y-5">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-slate-200">
                        Tu cuenta requiere 2FA para acceder. Configuralo una vez y quedara activo para siguientes inicios de sesion.
                    </div>

                    {pendingSetupUser && (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
                            Cuenta: <strong>{pendingSetupUser.email}</strong>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={startSetup}
                        disabled={loadingSetup}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3.5 font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-60"
                    >
                        <KeyRound className="h-4 w-4" />
                        {loadingSetup ? 'Preparando 2FA...' : 'Iniciar configuracion 2FA'}
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                    <div className="rounded-2xl bg-white p-4 shadow-lg">
                        <img alt="Codigo QR 2FA" className="h-52 w-52" src={setupData.qrCode} />
                    </div>
                    <div className="w-full space-y-2">
                        <p className="text-sm text-slate-300">
                            Escanea el codigo QR con Google Authenticator, Microsoft Authenticator o Authy.
                        </p>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                            <code className="truncate text-sm text-primary">{setupData.secret}</code>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(setupData.secret || '');
                                    toast.success('Secreto copiado');
                                }}
                                className="ml-auto rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-center text-sm font-medium text-slate-300">Codigo de verificacion</label>
                    <input
                        data-testid="login-2fa-setup-code"
                        autoFocus
                        type="text"
                        maxLength={6}
                        value={enrollmentCode}
                        onChange={(event) => setEnrollmentCode(event.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-xl border border-primary/30 bg-slate-900 px-4 py-4 text-center font-mono text-3xl tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="000000"
                    />
                    <button
                        type="button"
                        disabled={enrollmentCode.length !== 6}
                        onClick={enableMandatorySetup}
                        className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3.5 font-bold text-white transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Activar 2FA y continuar
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
            <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[100px]" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-surface/50 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
                        {isMandatorySetup ? (
                            <Smartphone className="h-10 w-10 text-white" />
                        ) : hasRecoveryCodes ? (
                            <CheckCircle className="h-10 w-10 text-white" />
                        ) : (
                            <ShieldCheck className="h-10 w-10 text-white" />
                        )}
                    </div>
                    <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-center text-3xl font-bold text-transparent">
                        {headline}
                    </h1>
                    <p className="mt-2 text-center text-slate-400">
                        {isMandatorySetup
                            ? 'Proteccion obligatoria para cuentas con acceso sensible'
                            : isTwoFactorChallenge
                                ? 'Introduce el codigo de tu aplicacion autenticadora'
                                : 'Seguridad Empresarial'}
                    </p>
                </div>

                {!isMandatorySetup ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isTwoFactorChallenge ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Correo Electronico</label>
                                    <input
                                        data-testid="login-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="admin@company.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Contrasena</label>
                                    <div className="relative">
                                        <input
                                            data-testid="login-password"
                                            type="password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="Introduce tu contrasena"
                                        />
                                        <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-slate-300">
                                    <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                                    <p>Introduce el codigo actual de tu app autenticadora para completar el acceso.</p>
                                </div>
                                <div className="space-y-2 text-center">
                                    <label className="block text-sm font-medium text-slate-300">Codigo 2FA</label>
                                    <input
                                        data-testid="login-2fa-code"
                                        autoFocus
                                        type="text"
                                        maxLength={6}
                                        value={code2fa}
                                        onChange={(event) => setCode2fa(event.target.value.replace(/\D/g, ''))}
                                        className="w-full rounded-xl border border-primary/30 bg-slate-900 px-4 py-4 text-center font-mono text-3xl tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="000000"
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await cancelPendingChallenge();
                                            setCode2fa('');
                                        }}
                                        className="mt-2 text-xs text-slate-500 transition-colors hover:text-white"
                                    >
                                        Volver al inicio de sesion
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-sm text-danger">
                                {error}
                            </div>
                        )}

                        <button
                            data-testid="login-submit"
                            type="submit"
                            className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isTwoFactorChallenge ? 'Verificar y Acceder' : 'Acceder a la Boveda'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-5">
                        {renderMandatorySetup()}
                        {setupData && !hasRecoveryCodes && (
                            <button
                                type="button"
                                onClick={async () => {
                                    await cancelPendingChallenge();
                                    setSetupData(null);
                                    setEnrollmentCode('');
                                    setRecoveryCodes([]);
                                }}
                                className="w-full text-xs text-slate-500 transition-colors hover:text-white"
                            >
                                Cancelar y volver al login
                            </button>
                        )}
                    </div>
                )}

                <p className="mt-6 text-center text-xs text-slate-500">
                    El acceso y el alta de usuarios los gestiona un administrador interno.
                </p>
                <p className="mt-2 text-center text-[10px] text-slate-500">
                    Protegido por Encriptacion AES-256
                </p>
            </div>
        </div>
    );
}
