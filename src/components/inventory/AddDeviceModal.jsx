import { useState, useMemo } from 'react';
import { X, Save, Smartphone, Laptop, Monitor, Printer, Mouse, Box, Package } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { deviceTypes, deviceStatus, predefinedCatalog } from '../../data/inventoryCatalog';

export default function AddDeviceModal({ isOpen, onClose }) {
    const { addItem } = useInventory();
    const [formData, setFormData] = useState({
        type: 'ordenador',
        brand: '',
        model: '',
        serial: '',
        assignedTo: '',
        status: 'en_uso',
        notes: ''
    });

    const [customModel, setCustomModel] = useState('');

    // Get available brands for selected type
    const availableBrands = useMemo(() => {
        const typeData = predefinedCatalog[formData.type];
        return typeData ? typeData.brands : [];
    }, [formData.type]);

    // Get available models for selected brand
    const availableModels = useMemo(() => {
        const typeData = predefinedCatalog[formData.type];
        if (typeData && typeData.models && formData.brand) {
            return typeData.models[formData.brand] || [];
        }
        return [];
    }, [formData.type, formData.brand]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset dependent fields
        if (name === 'type') {
            setFormData(prev => ({ ...prev, [name]: value, brand: '', model: '' }));
        }
        if (name === 'brand') {
            setFormData(prev => ({ ...prev, [name]: value, model: '' }));
        }
    };

    const getTypeIcon = (typeId) => {
        switch (typeId) {
            case 'movil': return <Smartphone className="w-5 h-5" />;
            case 'ordenador': return <Laptop className="w-5 h-5" />;
            case 'pantalla': return <Monitor className="w-5 h-5" />;
            case 'impresora': return <Printer className="w-5 h-5" />;
            case 'periferico': return <Mouse className="w-5 h-5" />;
            default: return <Box className="w-5 h-5" />;
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        addItem({
            ...formData,
            model: formData.model === 'other' ? customModel : formData.model
        });
        onClose();
        setFormData({
            type: 'ordenador',
            brand: '',
            model: '',
            serial: '',
            assignedTo: '',
            status: 'en_uso',
            notes: ''
        });
        setCustomModel('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Package className="w-4 h-4 text-primary" />
                        </div>
                        Nuevo Dispositivo
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Dispositivo</label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {deviceTypes.map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: type.id, brand: '', model: '' }))}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${formData.type === type.id ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        {getTypeIcon(type.id)}
                                        <span className="text-xs mt-1 font-medium">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Brand & Model */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Marca</label>
                            {availableBrands.length > 0 ? (
                                <select
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Seleccionar Marca</option>
                                    {availableBrands.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej. Generico"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Modelo</label>
                            {availableModels.length > 0 ? (
                                <div className="space-y-2">
                                    <select
                                        name="model"
                                        value={formData.model}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">Seleccionar Modelo</option>
                                        {availableModels.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                        <option value="other">Otro (Manual)</option>
                                    </select>
                                    {formData.model === 'other' && (
                                        <input
                                            type="text"
                                            value={customModel}
                                            onChange={(e) => setCustomModel(e.target.value)}
                                            placeholder="Escribe el modelo..."
                                            required
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 animate-in fade-in slide-in-from-top-1"
                                        />
                                    )}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej. Modelo X"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            )}
                        </div>

                        {/* Details */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Nº de Serie</label>
                            <input
                                type="text"
                                name="serial"
                                value={formData.serial}
                                onChange={handleChange}
                                placeholder="SN-123456"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Asignado a</label>
                            <input
                                type="text"
                                name="assignedTo"
                                value={formData.assignedTo}
                                onChange={handleChange}
                                placeholder="Nombre completo"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Estado</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {deviceStatus.map(status => (
                                    <option key={status.id} value={status.id}>{status.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!formData.type || !formData.brand || (!formData.model && !customModel)}
                        className="flex items-center gap-2 bg-primary hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                    >
                        <Save className="w-5 h-5" />
                        Guardar Dispositivo
                    </button>
                </div>
            </div>
        </div>
    );
}
