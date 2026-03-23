import { useState } from 'react';
import { X, Save, Lock, Wand2 } from 'lucide-react';
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

export default function AddPasswordModal({ isOpen, onClose }) {
    const { addPassword, createTemplate, passwords, templates } = usePasswords();
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState([]);
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

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({
            title: '',
            username: '',
            password: '',
            url: '',
            notes: '',
            nextReviewAt: '',
            renewalIntervalDays: '',
            tags: [],
            custom_fields: [],
        });
        setPendingAttachments([]);
        setSelectedTemplateId('');
    };

    const handleAttachmentsSelected = (files) => {
        try {
            files.forEach(validateAttachmentFile);
            setPendingAttachments((previous) => {
                const next = [...previous, ...files];
                if (next.length > MAX_ATTACHMENTS_PER_ITEM) {
                    throw new Error(`Maximo ${MAX_ATTACHMENTS_PER_ITEM} adjuntos por contrasena`);
                }

                return next;
            });
        } catch (error) {
            toast.error(error.message || 'No se pudieron anadir los adjuntos');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const result = await addPassword({
            ...formData,
            attachments: pendingAttachments,
        });

        if (result.success) {
            resetForm();
            onClose();
        }
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-primary" />
                        </div>
                        Nueva Contrasena
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">Titulo (ej. Google)</label>
                        <input
                            data-testid="add-password-title"
                            required
                            type="text"
                            placeholder="Nombre del servicio"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.title}
                            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Usuario/Email</label>
                            <input
                                data-testid="add-password-username"
                                required
                                type="text"
                                placeholder="usuario@ejemplo.com"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={formData.username}
                                onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Contrasena</label>
                            <div className="relative">
                                <input
                                    data-testid="add-password-password"
                                    required
                                    type="password"
                                    placeholder="........"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                                    value={formData.password}
                                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsGeneratorOpen(true)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-emerald-400 transition-colors"
                                    title="Generar contrasena"
                                >
                                    <Wand2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Sitio Web (Opcional)</label>
                        <input
                            data-testid="add-password-url"
                            type="url"
                            placeholder="https://ejemplo.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.url}
                            onChange={(event) => setFormData({ ...formData, url: event.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Propietario / Persona</label>
                        <input
                            data-testid="add-password-owner"
                            type="text"
                            list="owners-list"
                            placeholder="A quien pertenece esta cuenta?"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.notes}
                            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                        />
                        <datalist id="owners-list">
                            {[...new Set(passwords.map((password) => password.meta_person).filter(Boolean))].sort().map((person) => (
                                <option key={person} value={person} />
                            ))}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-300">Proxima revision</label>
                            <input
                                type="date"
                                value={formData.nextReviewAt}
                                onChange={(event) => setFormData({ ...formData, nextReviewAt: event.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-300">Renovar cada (dias)</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.renewalIntervalDays}
                                onChange={(event) => setFormData({ ...formData, renewalIntervalDays: event.target.value })}
                                placeholder="90"
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    <TagInput
                        tags={formData.tags}
                        onChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                    />

                    <CustomFieldsInput
                        fields={formData.custom_fields}
                        onChange={(newFields) => setFormData({ ...formData, custom_fields: newFields })}
                    />

                    <VaultAttachmentsField
                        existingAttachments={[]}
                        onFilesSelected={handleAttachmentsSelected}
                        pendingFiles={pendingAttachments}
                        onRemovePending={(index) => {
                            setPendingAttachments((previous) => previous.filter((_, fileIndex) => fileIndex !== index));
                        }}
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={handleSaveTemplate}
                            className="px-4 py-2 text-slate-300 transition-colors hover:text-white"
                        >
                            Guardar como plantilla
                        </button>
                        <button
                            data-testid="add-password-cancel"
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="add-password-save"
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
                        toast.success('Contrasena generada');
                    }}
                />
            </div>
        </div>
    );
}
