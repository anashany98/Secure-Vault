import { X, RotateCcw, Clock, User, RefreshCw } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import { useState, useEffect } from 'react';

export default function PasswordHistoryModal({ isOpen, onClose, passwordItem }) {
    const { getPasswordHistory, updatePassword } = usePasswords();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});

    useEffect(() => {
        if (isOpen && passwordItem) {
            fetchHistory();
        }
    }, [isOpen, passwordItem]);

    const fetchHistory = async () => {
        setIsLoading(true);
        const data = await getPasswordHistory(passwordItem.id);
        setHistory(data);
        setIsLoading(false);
    };

    if (!isOpen || !passwordItem) return null;

    const handleRestore = (version) => {
        if (window.confirm(`¿Restaurar esta versión de la contraseña?\n\nLa versión actual se guardará en el historial.`)) {
            updatePassword(passwordItem.id, { password: version.password });
            onClose();
        }
    };

    const togglePasswordVisibility = (index) => {
        setShowPasswords(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-400" />
                            </div>
                            Historial de Versiones
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {passwordItem.title} - {history.length} versiones guardadas
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-slate-400">Cargando historial...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Sin historial aún
                            </h3>
                            <p className="text-slate-400">
                                Las versiones anteriores aparecerán aquí cuando modifiques esta contraseña.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Current Version */}
                            <div className="bg-primary/10 border border-primary/50 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                        <span className="text-primary font-semibold text-sm">Versión Actual</span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {passwordItem.updatedAt
                                            ? new Date(passwordItem.updatedAt).toLocaleString()
                                            : new Date(passwordItem.createdAt).toLocaleString()
                                        }
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500 block mb-1">Usuario:</span>
                                        <span className="text-white font-mono">{passwordItem.username}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-1">Contraseña:</span>
                                        <span className="text-white font-mono">{'•'.repeat(passwordItem.password.length)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Previous Versions */}
                            {history.map((version, index) => (
                                <div
                                    key={version.id || index}
                                    className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" />
                                            <span className="text-slate-300 font-medium text-sm">
                                                Versión de {new Date(version.changed_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleRestore(version)}
                                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-lg hover:bg-blue-400/10"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Restaurar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                        <div>
                                            <span className="text-slate-500 block mb-1">Contraseña:</span>
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility(index)}
                                                className="text-slate-300 font-mono hover:text-white"
                                            >
                                                {showPasswords[index] ? version.password : '•'.repeat(version.password.length)}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(version.changed_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-900/50">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <p>
                            💡 Tip: Se guardan hasta 10 versiones anteriores
                        </p>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
