import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { usePasswords } from '../../context/PasswordContext';
import {
    MAX_ATTACHMENTS_PER_ITEM,
    validateAttachmentFile,
} from '../../lib/attachments';
import PasswordGeneratorModal from './PasswordGeneratorModal';
import TagInput from '../common/TagInput';
import CustomFieldsInput from '../common/CustomFieldsInput';
import VaultAttachmentsField from './VaultAttachmentsField';

export default function EditPasswordModal({ isOpen, onClose, password }) {
    const { createTemplate, getPasswordAttachments, templates, updatePassword } = usePasswords();
    const [showPassword, setShowPassword] = useState(false);
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        nextReviewAt: '',
        renewalIntervalDays: '',
        tags: [],
        custom_fields: []
    });

    useEffect(() => {
        if (password) {
            setFormData({
                title: password.title || '',
                username: password.username || '',
                password: password.password || '',
                url: password.url || '',
                notes: password.owner || password.meta_person || password.notes || '',
                nextReviewAt: password.nextReviewAt ? String(password.nextReviewAt).slice(0, 10) : '',
                renewalIntervalDays: password.renewalIntervalDays ?? '',
                tags: password.tags || [],
                custom_fields: password.custom_fields || []
            });
            setSelectedTemplateId('');
        }
    }, [password]);

    useEffect(() => {
        let cancelled = false;

        if (!isOpen || !password?.id) {
            setExistingAttachments([]);
            setPendingAttachments([]);
            setAttachmentsToDelete([]);
            return () => {
                cancelled = true;
            };
        }

        getPasswordAttachments(password.id)
            .then((attachments) => {
                if (!cancelled) {
                    setExistingAttachments(attachments);
                    setPendingAttachments([]);
                    setAttachmentsToDelete([]);
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    toast.error(error.message || 'No se pudieron cargar los adjuntos');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [getPasswordAttachments, isOpen, password?.id]);

    const handleAttachmentsSelected = (files) => {
        try {
            files.forEach(validateAttachmentFile);
            const totalCount = existingAttachments.length + pendingAttachments.length + files.length;
            if (totalCount > MAX_ATTACHMENTS_PER_ITEM) {
                throw new Error(`Maximo ${MAX_ATTACHMENTS_PER_ITEM} adjuntos por contrasena`);
            }

            setPendingAttachments((previous) => [...previous, ...files]);
        } catch (error) {
            toast.error(error.message || 'No se pudieron anadir los adjuntos');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.title || !formData.password) {
            toast.error('Titulo y contrasena son requeridos');
            return;
        }

        const result = await updatePassword(password.id, {
            ...formData,
            attachmentsToAdd: pendingAttachments,
            attachmentsToDelete,
            existingAttachmentsCount: existingAttachments.length,
        });

        if (result.success) {
            onClose();
        }
    };

    const handleGeneratedPassword = (generatedPassword) => {
        setFormData({ ...formData, password: generatedPassword });
        setShowGeneratorModal(false);
    };

    const handleApplyTemplate = () => {
        const template = templates.find((item) => item.id === selectedTemplateId);
        if (!template) {
            return;
        }

        setFormData((previous) => ({
            ...previous,
            title: template.title || previous.title,
            username: template.username || '',
            url: template.url || '',
            notes: template.owner || template.meta_person || '',
            renewalIntervalDays: template.renewalIntervalDays ?? '',
            tags: template.tags || [],
            custom_fields: template.customFields || [],
        }));
        toast.success('Plantilla aplicada');
    };

    const handleSaveTemplate = async () => {
        const name = window.prompt('Nombre de la plantilla');
        if (!name) {
            return;
        }

        await createTemplate({
            ...formData,
            name,
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white">Editar Contrasena</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                        {templates.length > 0 && (
                            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                                <div className="flex flex-col gap-3 md:flex-row">
                                    <div className="flex-1">
                                        <label className="mb-1 block text-sm font-medium text-slate-300">Plantilla</label>
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(event) => setSelectedTemplateId(event.target.value)}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="">Seleccionar plantilla...</option>
                                            {templates.map((template) => (
                                                <option key={template.id} value={template.id}>
                                                    {template.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleApplyTemplate}
                                        disabled={!selectedTemplateId}
                                        className="self-end rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Aplicar plantilla
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Titulo *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Ej: Gmail, Facebook, etc."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Usuario / Email
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Contrasena *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 pr-24 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="........"
                                    required
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowGeneratorModal(true)}
                                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                                        title="Generar contrasena"
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

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                URL / Sitio Web
                            </label>
                            <input
                                type="url"
                                value={formData.url}
                                onChange={(event) => setFormData({ ...formData, url: event.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="https://ejemplo.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Proxima revision
                                </label>
                                <input
                                    type="date"
                                    value={formData.nextReviewAt}
                                    onChange={(event) => setFormData({ ...formData, nextReviewAt: event.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Renovar cada (dias)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.renewalIntervalDays}
                                    onChange={(event) => setFormData({ ...formData, renewalIntervalDays: event.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="90"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Etiquetas
                            </label>
                            <TagInput
                                tags={formData.tags}
                                onChange={(tags) => setFormData({ ...formData, tags })}
                            />
                        </div>

                        <CustomFieldsInput
                            fields={formData.custom_fields}
                            onChange={(newFields) => setFormData({ ...formData, custom_fields: newFields })}
                        />

                        <VaultAttachmentsField
                            existingAttachments={existingAttachments}
                            onRemoveExisting={(attachmentId) => {
                                setExistingAttachments((previous) =>
                                    previous.filter((attachment) => attachment.id !== attachmentId)
                                );
                                setAttachmentsToDelete((previous) =>
                                    previous.includes(attachmentId) ? previous : [...previous, attachmentId]
                                );
                            }}
                            onFilesSelected={handleAttachmentsSelected}
                            pendingFiles={pendingAttachments}
                            onRemovePending={(index) => {
                                setPendingAttachments((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
                            }}
                        />

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Propietario / Persona
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                rows="3"
                                placeholder="A quien pertenece esta cuenta?"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                            >
                                Guardar como plantilla
                            </button>
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
                </div>
            </div>

            <PasswordGeneratorModal
                isOpen={showGeneratorModal}
                onClose={() => setShowGeneratorModal(false)}
                onGenerate={handleGeneratedPassword}
            />
        </>
    );
}
