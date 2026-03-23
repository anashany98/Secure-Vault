import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { X, Download, AlertTriangle, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';

import { usePasswords } from '../../context/PasswordContext';
import { useNotes } from '../../context/NotesContext';
import { useGroups } from '../../context/GroupContext';
import { useInventory } from '../../context/InventoryContext';

export default function ExportVaultModal({ isOpen, onClose }) {
    const { getExportablePasswords } = usePasswords();
    const { notes } = useNotes();
    const { groups } = useGroups();
    const { inventory } = useInventory();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleExport = async (event) => {
        event.preventDefault();

        if (password.length < 8) {
            toast.error('La contrasena debe tener al menos 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Las contrasenas no coinciden');
            return;
        }

        setIsExporting(true);

        try {
            const passwords = await getExportablePasswords();
            const vaultData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                data: {
                    passwords,
                    notes,
                    groups,
                    inventory: inventory || []
                }
            };

            const jsonString = JSON.stringify(vaultData);
            const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();
            const blob = new Blob([encrypted], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = `secure-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

            toast.success('Copia de seguridad exportada correctamente');
            onClose();
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Error al exportar los datos');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Download className="w-4 h-4 text-primary" />
                        </div>
                        Exportar Copia de Seguridad
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-amber-500 font-semibold text-sm mb-1">Importante</h4>
                            <p className="text-slate-400 text-sm">
                                Este archivo contendra toda tu informacion. Se encriptara con la contrasena que elijas abajo.
                                <br />
                                <strong className="text-amber-400">Si olvidas esta contrasena, no podras recuperar los datos.</strong>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleExport} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Contrasena de encriptacion</label>
                            <input
                                data-testid="export-password"
                                required
                                type="password"
                                placeholder="........"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar contrasena</label>
                            <input
                                data-testid="export-password-confirm"
                                required
                                type="password"
                                placeholder="........"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                data-testid="export-cancel"
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                data-testid="export-submit"
                                type="submit"
                                disabled={isExporting}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? (
                                    'Exportando...'
                                ) : (
                                    <>
                                        <FileJson className="w-4 h-4" />
                                        Descargar Backup
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
