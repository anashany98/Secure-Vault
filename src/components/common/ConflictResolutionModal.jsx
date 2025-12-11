import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConflictResolutionModal({ isOpen, onClose, conflict, onResolve }) {
    const [selectedVersion, setSelectedVersion] = useState(null);

    if (!isOpen || !conflict) return null;

    const handleResolve = () => {
        if (selectedVersion) {
            onResolve(selectedVersion);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-warning" />
                            Conflicto de Sincronización
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Se encontraron cambios conflictivos. Elige qué versión conservar.
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
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Local Version */}
                        <div
                            onClick={() => setSelectedVersion('local')}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedVersion === 'local'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-slate-700 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-white">Versión Local</h3>
                                {selectedVersion === 'local' && (
                                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-slate-400">Título:</span>
                                    <p className="text-white">{conflict?.local?.title || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Usuario:</span>
                                    <p className="text-white">{conflict?.local?.username || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Modificado:</span>
                                    <p className="text-white">
                                        {conflict?.local?.updatedAt
                                            ? new Date(conflict.local.updatedAt).toLocaleString('es-ES')
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Remote Version */}
                        <div
                            onClick={() => setSelectedVersion('remote')}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedVersion === 'remote'
                                    ? 'border-warning bg-warning/10'
                                    : 'border-slate-700 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-white">Versión Remota</h3>
                                {selectedVersion === 'remote' && (
                                    <div className="w-5 h-5 bg-warning rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-slate-400">Título:</span>
                                    <p className="text-white">{conflict?.remote?.title || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Usuario:</span>
                                    <p className="text-white">{conflict?.remote?.username || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Modificado:</span>
                                    <p className="text-white">
                                        {conflict?.remote?.updatedAt
                                            ? new Date(conflict.remote.updatedAt).toLocaleString('es-ES')
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mb-6">
                        <p className="text-sm text-orange-400">
                            <strong>⚠️ Advertencia:</strong> La versión no seleccionada se descartará permanentemente.
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleResolve}
                        disabled={!selectedVersion}
                        className="px-6 py-2 bg-primary hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        Resolver Conflicto
                    </button>
                </div>
            </div>
        </div>
    );
}
