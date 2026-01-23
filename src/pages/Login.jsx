import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck } from 'lucide-react';


export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code2fa, setCode2fa] = useState('');
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [error, setError] = useState('');
    const { login, verify2FA } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (requires2FA) {
            const result = await verify2FA(tempToken, code2fa);
            if (!result.success) setError(result.error);
            return;
        }

        const result = await login(email, password);
        if (result.success) {
            if (result.requires2FA) {
                setRequires2FA(true);
                setTempToken(result.tempToken);
            }
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />

            <div className="w-full max-w-md bg-surface/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        SecureVault
                    </h1>
                    <p className="text-slate-400 mt-2">Seguridad Empresarial</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!requires2FA ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    placeholder="admin@company.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Contraseña</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                        placeholder="admin123"
                                    />
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex gap-3 text-xs text-slate-300">
                                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                                <p>Tu cuenta tiene activada la verificación en dos pasos. Introduce el código de tu app autenticadora.</p>
                            </div>
                            <div className="space-y-2 text-center">
                                <label className="text-sm font-medium text-slate-300 block">Código 2FA</label>
                                <input
                                    autoFocus
                                    type="text"
                                    maxLength={6}
                                    value={code2fa}
                                    onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-slate-900 border border-primary/30 rounded-xl px-4 py-4 text-white text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="000000"
                                />
                                <button
                                    type="button"
                                    onClick={() => setRequires2FA(false)}
                                    className="text-xs text-slate-500 hover:text-white transition-colors mt-2"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {requires2FA ? 'Verificar y Acceder' : 'Acceder a la Bóveda'}
                    </button>
                </form>

                <p className="mt-6 text-center text-slate-500 text-xs">
                    Protegido por Encriptación AES-256
                </p>
            </div>
        </div>
    );
}
