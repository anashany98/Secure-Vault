import { useState, useEffect } from 'react';
import { X, Save, Lock } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import toast from 'react-hot-toast';

const AddNoteModal = ({ isOpen, onClose, editingNote = null }) => {
    const { addNote, updateNote } = useNotes();
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });

    useEffect(() => {
        if (editingNote) {
            setFormData({
                title: editingNote.title,
                content: editingNote.content
            });
        } else {
            setFormData({ title: '', content: '' });
        }
    }, [editingNote, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error('Título y contenido son obligatorios');
            return;
        }

        try {
            if (editingNote) {
                updateNote(editingNote.id, formData);
                toast.success('Nota actualizada correctamente');
            } else {
                addNote(formData);
                toast.success('Nota creada correctamente');
            }
            onClose();
        } catch (error) {
            toast.error('Error al guardar la nota');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {editingNote ? 'Editar Nota Segura' : 'Nueva Nota Segura'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Título
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="Ej: Claves WiFi Oficina"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Contenido Seguro
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 min-h-[200px] font-mono text-sm leading-relaxed"
                            placeholder="Escribe aquí tu información confidencial..."
                        />
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            El contenido será encriptado antes de guardarse.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            <Save className="w-4 h-4" />
                            {editingNote ? 'Guardar Cambios' : 'Crear Nota'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddNoteModal;
