import { useState, useMemo } from 'react';
import { X, Save, Smartphone, Laptop, Monitor, Printer, Mouse, Box, Package, UserPlus } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useConfig } from '../../context/ConfigContext';
import { deviceTypes, deviceStatus, predefinedCatalog } from '../../data/inventoryCatalog';

export default function AddDeviceModal({ isOpen, onClose }) {
    const { addItem } = useInventory();
    const { assignablePeople, addEmployee } = useConfig();
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [formData, setFormData] = useState({
        type: 'ordenador',
        brand: '',
        model: '',
        serial: '',
        assignedTo: '',
        status: 'en_uso',
        notes: ''
    });

    // const [customModel, setCustomModel] = useState(''); // Removed, using direct input with datalist

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
        addItem(formData);
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

                            <input
                                list="model-options"
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="Escribe o selecciona..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />

                            {/* Datalist for autocomplete suggestions */}
                            <datalist id="model-options">
                                {availableModels.map((model, index) => (
                                    <option key={`${model}-${index}`} value={model} />
                                ))}
                            </datalist>
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
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <select
                                        name="assignedTo"
                                        value={formData.assignedTo}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        <optgroup label="Usuarios Registrados / Empleados">
                                            {assignablePeople.map(person => (
                                                <option key={`${person.type}-${person.id}`} value={person.label}>
                                                    {person.displayName}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <option value="other_manual">📝 Otro (Escribir nombre manual)</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingEmployee(!isAddingEmployee)}
                                        className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        title="Añadir nuevo empleado a la lista"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                    </button>
                                </div>

                                {(isAddingEmployee || formData.assignedTo === 'other_manual') && (
                                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del nuevo empleado / externo:</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newEmployeeName}
                                                onChange={(e) => {
                                                    setNewEmployeeName(e.target.value);
                                                    setFormData(prev => ({ ...prev, assignedTo: e.target.value }));
                                                }}
                                                placeholder="Ej. Juan Pérez"
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            />
                                            {isAddingEmployee && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!newEmployeeName) return;
                                                        const success = await addEmployee({ full_name: newEmployeeName });
                                                        if (success) {
                                                            setIsAddingEmployee(false);
                                                            setFormData(prev => ({ ...prev, assignedTo: newEmployeeName }));
                                                            setNewEmployeeName('');
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Guardar Ficha
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                        disabled={!formData.type || !formData.brand || !formData.model}
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
