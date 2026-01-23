import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Wand2 } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import { useFolders } from '../../context/FolderContext';
import PasswordGeneratorModal from './PasswordGeneratorModal';
import TagInput from '../common/TagInput';
import CustomFieldsInput from '../common/CustomFieldsInput';
import toast from 'react-hot-toast';
export default function EditPasswordModal({ isOpen, onClose, password }) {
    const { updatePassword } = usePasswords();
    const { folders } = useFolders(); // Get folders
    const [showPassword, setShowPassword] = useState(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        tags: [],
        custom_fields: [],
        folderId: ''
    });

    useEffect(() => {
        if (password) {
            setFormData({
                title: password.title || '',
                username: password.username || '',
                password: password.password || '',
                url: password.url || '',
                notes: password.notes || '',
                tags: password.tags || [],
                custom_fields: password.custom_fields || [],
                folderId: password.folderId || ''
            });
        }
    }, [password]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title || !formData.password) {
            toast.error('❌ Título y contraseña son requeridos');
            return;
        }
        updatePassword(password.id, formData);
        toast.success('✅ Contraseña actualizada');
        onClose();
    };

    const handleGeneratedPassword = (generatedPassword) => {
        setFormData({ ...formData, password: generatedPassword });
        setShowGeneratorModal(false);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white">Editar Contraseña</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Título *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Ej: Gmail, Facebook, etc."
                                required
                            />
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Usuario / Email
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Contraseña *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 pr-24 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="••••••••"
                                    required
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowGeneratorModal(true)}
                                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                                        title="Generar contraseña"
                                    >
                                        <Wand2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="p-2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* URL */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                URL / Sitio Web
                            </label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="https://ejemplo.com"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Etiquetas
                            </label>
                            <TagInput
                                tags={formData.tags}
                                onChange={(tags) => setFormData({ ...formData, tags })}
                            />
                        </div>

                        {/* Custom Fields */}
                        <CustomFieldsInput
                            fields={formData.custom_fields}
                            onChange={(newFields) => setFormData({ ...formData, custom_fields: newFields })}
                        />

                        {/* Folder Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Carpeta
                            </label>
                            <select
                                value={formData.folderId}
                                onChange={e => setFormData({ ...formData, folderId: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Sin carpeta</option>
                                {folders.filter(f => f.id !== 'root').map(folder => (
                                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Notas
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                rows="3"
                                placeholder="Notas adicionales..."
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div >
            </div >

            {/* Password Generator Modal */}
            < PasswordGeneratorModal
                isOpen={showGeneratorModal}
                onClose={() => setShowGeneratorModal(false)
                }
                onGenerate={handleGeneratedPassword}
            />
        </>
    );
}
