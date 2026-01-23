import { useState } from 'react';
import { Plus, Trash2, AlignLeft } from 'lucide-react';

export default function CustomFieldsInput({ fields = [], onChange }) {
    const handleAddField = () => {
        onChange([...fields, { label: '', value: '', type: 'text' }]);
    };

    const handleRemoveField = (index) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        onChange(newFields);
    };

    const handleChange = (index, key, newValue) => {
        const newFields = [...fields];
        newFields[index][key] = newValue;
        onChange(newFields);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                    Campos Personalizados
                </label>
                <button
                    type="button"
                    onClick={handleAddField}
                    className="text-xs flex items-center gap-1 text-primary hover:text-emerald-400 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Añadir Campo
                </button>
            </div>

            {fields.length === 0 && (
                <div className="text-xs text-slate-500 italic p-2 border border-slate-700/50 rounded-lg text-center">
                    No hay campos extra (ej: PIN, Pregunta de Seguridad)
                </div>
            )}

            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={index} className="flex items-start gap-2 animate-in slide-in-from-left-2">
                        <div className="flex-1 space-y-1">
                            <input
                                type="text"
                                placeholder="Nombre (ej: PIN)"
                                value={field.label}
                                onChange={(e) => handleChange(index, 'label', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-slate-600"
                            />
                        </div>
                        <div className="flex-[1.5] space-y-1">
                            <div className="relative">
                                <input
                                    type={field.type === 'hidden' ? 'password' : 'text'}
                                    placeholder="Valor"
                                    value={field.value}
                                    onChange={(e) => handleChange(index, 'value', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRemoveField(index)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors mt-0.5"
                            title="Eliminar campo"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
