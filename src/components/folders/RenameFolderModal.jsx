import { useState, useEffect } from 'react';
import { X, Save, Edit } from 'lucide-react';
import { useFolders } from '../../context/FolderContext';
import toast from 'react-hot-toast';

export default function RenameFolderModal({ isOpen, onClose, folderId, currentName }) {
    const { renameFolder } = useFolders();
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen && currentName) {
            setName(currentName);
        }
    }, [isOpen, currentName]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        renameFolder(folderId, name);
        toast.success('Carpeta renombrada');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Edit className="w-4 h-4 text-primary" />
                        </div>
                        Renombrar Carpeta
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nombre de la carpeta</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="Ej. Finanzas"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-primary/20"
                        >
                            <Save className="w-4 h-4" />
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
