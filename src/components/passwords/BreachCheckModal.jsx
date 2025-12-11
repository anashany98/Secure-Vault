import { X, Shield, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useState } from 'react';

export default function BreachCheckModal({ isOpen, onClose, onStartCheck }) {
    const [isChecking, setIsChecking] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
    const [results, setResults] = useState(null);

    if (!isOpen) return null;

    const handleStartCheck = async () => {
        setIsChecking(true);
        setProgress({ current: 0, total: 0, percentage: 0 });
        setResults(null);

        await onStartCheck((progressData) => {
            setProgress(progressData);
        });

        setIsChecking(false);
        // Results will be visible in the passwords themselves
        setResults({ completed: true });
    };

    const handleClose = () => {
        if (!isChecking) {
            onClose();
            setProgress({ current: 0, total: 0, percentage: 0 });
            setResults(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            Verificar Filtraciones
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Verifica si tus contraseñas han sido comprometidas
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isChecking}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!isChecking && !results && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                ¿Verificar todas las contraseñas?
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Usaremos HaveIBeenPwned para verificar si tus contraseñas han aparecido en filtraciones.
                                El proceso es seguro y privado (k-Anonymity).
                            </p>
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                                <p className="text-xs text-blue-400">
                                    <strong>🔒 Privacidad:</strong> Solo se envían los primeros 5 caracteres del hash. Tu contraseña nunca sale de tu dispositivo.
                                </p>
                            </div>
                            <button
                                onClick={handleStartCheck}
                                className="w-full bg-primary hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Shield className="w-4 h-4" />
                                Iniciar Verificación
                            </button>
                        </div>
                    )}

                    {isChecking && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Loader className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Verificando...
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                {progress.current} de {progress.total} contraseñas verificadas
                            </p>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
                                <div
                                    className="bg-gradient-to-r from-primary to-emerald-400 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                {Math.round(progress.percentage)}%
                            </p>

                            <p className="text-xs text-slate-500 mt-4">
                                ⏱️ Respetando límites de API (1.5s entre solicitudes)
                            </p>
                        </div>
                    )}

                    {results && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                ✅ Verificación Completada
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Todas las contraseñas han sido verificadas. Las contraseñas comprometidas mostrarán una alerta roja.
                            </p>
                            <button
                                onClick={handleClose}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
