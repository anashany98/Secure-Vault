import { useState } from 'react';
import { X, Save, Lock, Wand2 } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import { useFolders } from '../../context/FolderContext';
import PasswordGeneratorModal from './PasswordGeneratorModal';
import TagInput from '../common/TagInput';
import CustomFieldsInput from '../common/CustomFieldsInput';
import toast from 'react-hot-toast';

export default function AddPasswordModal({ isOpen, onClose }) {
    const { addPassword, passwords } = usePasswords();
    const { folders } = useFolders();
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '', // Used for "Person/Owner"
        tags: [],
        custom_fields: [],
        folderId: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        addPassword(formData);
        setFormData({ title: '', username: '', password: '', url: '', notes: '', tags: [], custom_fields: [], folderId: '' });
        toast.success('✅ Contraseña guardada');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-primary" />
                        </div>
                        Nueva Contraseña
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Título (ej. Google)</label>
                        <input
                            required
                            type="text"
                            placeholder="Nombre del servicio"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Usuario/Email</label>
                            <input
                                required
                                type="text"
                                placeholder="usuario@ejemplo.com"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                            <div className="relative">
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsGeneratorOpen(true)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-emerald-400 transition-colors"
                                    title="Generar contraseña"
                                >
                                    <Wand2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Sitio Web (Opcional)</label>
                        <input
                            type="url"
                            placeholder="https://ejemplo.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Propietario / Persona</label>
                        <input
                            type="text"
                            list="owners-list"
                            placeholder="¿A quién pertenece esta cuenta?"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                        <datalist id="owners-list">
                            {[...new Set(passwords.map(p => p.meta_person).filter(Boolean))].sort().map(person => (
                                <option key={person} value={person} />
                            ))}
                        </datalist>
                    </div>

                    {/* Tags Input */}
                    <TagInput
                        tags={formData.tags}
                        onChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                    />

                    {/* Custom Fields */}
                    <CustomFieldsInput
                        fields={formData.custom_fields}
                        onChange={(newFields) => setFormData({ ...formData, custom_fields: newFields })}
                    />

                    {/* Folder Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Carpeta</label>
                        <select
                            value={formData.folderId || ''}
                            onChange={e => setFormData({ ...formData, folderId: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Sin carpeta</option>
                            {folders.filter(f => f.id !== 'root').map(folder => (
                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                        </select>
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

                <PasswordGeneratorModal
                    isOpen={isGeneratorOpen}
                    onClose={() => setIsGeneratorOpen(false)}
                    onUsePassword={(password) => {
                        setFormData({ ...formData, password });
                        toast.success('✅ Contraseña generada');
                    }}
                />
            </div>
        </div>
    );
}
