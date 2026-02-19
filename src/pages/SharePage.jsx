import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useShare } from '../context/ShareContext';
import { Eye, EyeOff, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SharePage() {
    const { id } = useParams();
    const { getShare, consumeShare } = useShare();
    const [status, setStatus] = useState('loading'); // loading, ready, viewed, error
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);

    useEffect(() => {
        const result = getShare(id);
        if (result.error) {
            setStatus('error');
            setError(result.error);
        } else {
            setData(result.data);
            setStatus('ready');
        }
    }, [id, getShare]);

    const handleReveal = async () => {
        if (status !== 'ready') return;

        const secret = await consumeShare(id); // Returns { encryptedData, type }
        if (secret) {
            setData(prev => ({ ...prev, ...secret }));
            setIsRevealed(true);
            setStatus('viewed');
        } else {
            // Handle error (already consumed or network error)
            setStatus('error');
            setError('No se pudo revelar el secreto (posiblemente ya fue visto)');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado');
    };

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Enlace no válido</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">V</span>
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">SecureVault</span>
                    </div>
                    <p className="text-slate-500">Compartición segura de secretos</p>
                </div>

                <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-8">
                        {!isRevealed ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Eye className="w-8 h-8 text-blue-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Secreto Protegido</h2>
                                <p className="text-slate-400 mb-8">
                                    Este enlace contiene información confidencial.
                                    <br />
                                    <span className="text-amber-400 font-medium">Solo puede ser visto una vez.</span>
                                </p>
                                <button
                                    onClick={handleReveal}
                                    className="bg-primary hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-105"
                                >
                                    Revelar Secreto Ahora
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-2 mb-6 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="text-sm font-medium">Secreto revelado. El enlace ha sido destruido.</span>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Título</label>
                                        <p className="text-xl text-white font-medium">{data?.encryptedData.title}</p>
                                    </div>

                                    {data?.type === 'password' && (
                                        <>
                                            <div>
                                                <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Usuario</label>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-lg text-slate-300 font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 w-full">
                                                        {data?.encryptedData.username}
                                                    </code>
                                                    <button onClick={() => copyToClipboard(data?.encryptedData.username)} className="p-2 text-slate-400 hover:text-white">
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Contraseña</label>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative w-full">
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            readOnly
                                                            value={data?.encryptedData.password}
                                                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-4 py-3 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                        <button
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                                        >
                                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => copyToClipboard(data?.encryptedData.password)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {data?.type === 'note' && (
                                        <div>
                                            <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Contenido</label>
                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300 whitespace-pre-wrap font-mono relative group">
                                                {data?.encryptedData.content}
                                                <button
                                                    onClick={() => copyToClipboard(data?.encryptedData.content)}
                                                    className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 rounded transition-opacity"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
