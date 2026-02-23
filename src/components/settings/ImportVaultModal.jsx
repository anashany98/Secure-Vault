import { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, FileJson, RefreshCw } from 'lucide-react';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export default function ImportVaultModal({ isOpen, onClose }) {
    const [password, setPassword] = useState('');
    const [file, setFile] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const isJson = selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json');
            const isCsv = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');

            if (!isJson && !isCsv) {
                toast.error('Por favor selecciona un archivo .json o .csv válido');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleRestore = async (e) => {
        e.preventDefault();

        if (!file) {
            toast.error('Por favor selecciona un archivo');
            return;
        }

        const isCsv = file.name.endsWith('.csv');

        if (!isCsv && !password) {
            toast.error('Introduce la contraseña de encriptación para el archivo JSON');
            return;
        }

        setIsRestoring(true);

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const content = event.target.result;

                if (isCsv) {
                    // CSV Import logic (Append)
                    const Papa = await import('papaparse');
                    Papa.default.parse(content, {
                        header: true,
                        skipEmptyLines: true,
                        complete: async (results) => {
                            try {
                                const SERVER_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'fallback-dev-key';
                                const itemsToImport = results.data.map(row => {
                                    const rawPassword = row.password || row.Password || row.Password_value;
                                    if (!rawPassword) return null;

                                    return {
                                        title: row.title || row.Title || row.name || 'Sin Título',
                                        username: row.username || row.Username || row.login_name || '',
                                        encrypted_password: CryptoJS.AES.encrypt(rawPassword, SERVER_KEY).toString(),
                                        url: row.url || row.URL || row.website || '',
                                        meta_person: row.notes || row.Notes || '',
                                        is_favorite: false,
                                        tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
                                        custom_fields: []
                                    };
                                }).filter(Boolean);

                                if (itemsToImport.length === 0) {
                                    throw new Error("No se encontraron datos válidos en el CSV");
                                }

                                await api.post('/vault/import', { items: itemsToImport });
                                toast.success(`Importadas ${itemsToImport.length} contraseñas correctamente`);
                                setTimeout(() => window.location.reload(), 1000);
                            } catch (err) {
                                toast.error(err.message || 'Error al procesar CSV');
                                setIsRestoring(false);
                            }
                        }
                    });
                } else {
                    // JSON Restore logic (Overwrite)
                    // 1. Decrypt with User's Backup Password
                    const bytes = CryptoJS.AES.decrypt(content, password);
                    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

                    if (!decryptedString) {
                        throw new Error('Contraseña incorrecta o archivo dañado');
                    }

                    // 2. Parse JSON
                    const vaultData = JSON.parse(decryptedString);

                    if (!vaultData.data || !vaultData.data.passwords) {
                        throw new Error('Formato de copia de seguridad no válido');
                    }

                    // 3. Prepare items for Server (Re-encrypt with Server Key)
                    const SERVER_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'fallback-dev-key';
                    const { passwords } = vaultData.data;

                    if (!passwords || !Array.isArray(passwords)) {
                        throw new Error("No hay contraseñas válidas en la copia de seguridad");
                    }

                    // Prepare passwords payload
                    const itemsToRestore = passwords.map(p => ({
                        title: p.title,
                        username: p.username,
                        encrypted_password: CryptoJS.AES.encrypt(p.password, SERVER_KEY).toString(), // Re-encrypt
                        url: p.url || p.website,
                        meta_person: p.meta_person || p.notes,
                        is_favorite: p.isFavorite,
                        tags: p.tags || [],
                        custom_fields: p.custom_fields || []
                    }));

                    // 4. Send to API
                    await api.post('/vault/restore', { items: itemsToRestore });

                    toast.success('Copia de seguridad restaurada correctamente (Sincronizado)');

                    // 5. Reload to apply changes (fetch from server)
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }

            } catch (error) {
                console.error('Import error:', error);
                toast.error(error.message || 'Error al procesar el archivo');
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-red-500" />
                        </div>
                        Restaurar Copia de Seguridad
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-red-500 font-semibold text-sm mb-1">¡Acción Destructiva!</h4>
                            <p className="text-slate-400 text-sm">
                                Al restaurar, se <strong>borrarán todos los datos actuales</strong> y se reemplazarán por los de la copia de seguridad. Esta acción no se puede deshacer.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleRestore} className="space-y-4">

                        {/* File Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Archivo (.json o .csv)</label>
                            <input
                                data-testid="import-file-input"
                                type="file"
                                accept=".json,.csv"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-700 hover:border-primary/50 hover:bg-slate-800/50 rounded-xl p-6 text-center cursor-pointer transition-all"
                            >
                                {file ? (
                                    <div className="flex items-center justify-center gap-2 text-white font-medium">
                                        <FileJson className="w-5 h-5 text-primary" />
                                        {file.name}
                                    </div>
                                ) : (
                                    <div className="text-slate-500">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <span className="text-sm">Selecciona un archivo JSON o CSV</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password - Only for JSON */}
                        {file && !file.name.endsWith('.csv') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña de desencriptación (JSON)</label>
                                <input
                                    data-testid="import-json-password"
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                data-testid="import-cancel"
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                data-testid="import-submit"
                                type="submit"
                                disabled={isRestoring}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${file?.name.endsWith('.csv')
                                        ? 'bg-primary hover:bg-emerald-600 shadow-emerald-900/20'
                                        : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'
                                    }`}
                            >
                                {isRestoring ? (
                                    'Procesando...'
                                ) : (
                                    <>
                                        {file?.name.endsWith('.csv') ? (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Importar Datos
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4" />
                                                Restaurar Datos
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
