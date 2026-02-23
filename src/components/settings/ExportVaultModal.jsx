import { useState } from 'react';
import { X, Download, Lock, AlertTriangle, FileJson } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import { useFolders } from '../../context/FolderContext';
import { useNotes } from '../../context/NotesContext';
import { useGroups } from '../../context/GroupContext';
import { useInventory } from '../../context/InventoryContext';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';

export default function ExportVaultModal({ isOpen, onClose }) {
    const { passwords } = usePasswords();
    const { folders } = useFolders();
    const { notes } = useNotes();
    const { groups } = useGroups();
    const { inventory } = useInventory(); // Assuming this context exists and has inventory data

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleExport = async (e) => {
        e.preventDefault();

        if (password.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setIsExporting(true);

        try {
            // 1. Gather all data
            const vaultData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                data: {
                    passwords,
                    folders,
                    notes,
                    groups,
                    inventory: inventory || []
                }
            };

            // 2. Encrypt
            const jsonString = JSON.stringify(vaultData);
            const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();

            // 3. Create File
            const blob = new Blob([encrypted], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `secure-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

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
                                Este archivo contendrá TODA tu información. Se encriptará con la contraseña que elijas abajo.
                                <br />
                                <strong className="text-amber-400">Si olvidas esta contraseña, no podrás recuperar los datos.</strong>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleExport} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña de encriptación</label>
                            <input
                                data-testid="export-password"
                                required
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar contraseña</label>
                            <input
                                data-testid="export-password-confirm"
                                required
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
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
