import { useState, useEffect } from 'react';
import { X, Copy, Link as LinkIcon, Clock, Eye, ShieldCheck } from 'lucide-react';
import { useShare } from '../../context/ShareContext';
import toast from 'react-hot-toast';

export default function ShareModal({ isOpen, onClose, item, type = 'password' }) {
    const { generateShareLink } = useShare();
    const [generatedLink, setGeneratedLink] = useState('');
    const [settings, setSettings] = useState({
        expiration: 3600 * 1000, // 1 hour
        views: 1,
        includeUsername: true
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setGeneratedLink('');
            setSettings({
                expiration: 3600 * 1000,
                views: 1,
                includeUsername: true
            });
        }
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const handleGenerate = () => {
        const link = generateShareLink(item, type, settings);
        setGeneratedLink(link);
        toast.success('Enlace seguro generado');
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        toast.success('Enlace copiado al portapapeles');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <LinkIcon className="w-4 h-4 text-blue-500" />
                        </div>
                        Compartir Seguro
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Item Info */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                        <p className="text-sm text-slate-400 mb-1">Compartiendo:</p>
                        <p className="text-white font-medium flex items-center gap-2">
                            {type === 'password' ? '🔑' : '📝'}
                            {item.title}
                        </p>
                    </div>

                    {!generatedLink ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Expira en
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={settings.expiration}
                                    onChange={e => setSettings({ ...settings, expiration: Number(e.target.value) })}
                                >
                                    <option value={300 * 1000}>5 minutos</option>
                                    <option value={3600 * 1000}>1 hora</option>
                                    <option value={86400 * 1000}>1 día</option>
                                    <option value={604800 * 1000}>1 semana</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Límite de visualizaciones
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={settings.views}
                                    onChange={e => setSettings({ ...settings, views: Number(e.target.value) })}
                                >
                                    <option value={1}>1 visualización (Autodestrucción)</option>
                                    <option value={5}>5 visualizaciones</option>
                                    <option value={100}>Sin límite (Peligroso)</option>
                                </select>
                            </div>

                            {type === 'password' && (
                                <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                    <input
                                        type="checkbox"
                                        id="includeUser"
                                        checked={settings.includeUsername}
                                        onChange={e => setSettings({ ...settings, includeUsername: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                                    />
                                    <label htmlFor="includeUser" className="text-sm text-slate-300 cursor-pointer select-none">
                                        Incluir nombre de usuario en el enlace
                                    </label>
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                Generar Enlace Mágico
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                                <p className="text-emerald-400 text-sm font-medium flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    Enlace listo
                                </p>
                                <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-800">
                                    <code className="text-slate-300 text-xs truncate flex-1 font-mono">
                                        {generatedLink}
                                    </code>
                                    <button
                                        onClick={copyToClipboard}
                                        className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 text-center">
                                Este enlace destructible permite ver el secreto una sola vez. Cuando el receptor lo abra, dejará de funcionar.
                            </p>

                            <button
                                onClick={onClose}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                Hecho
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
