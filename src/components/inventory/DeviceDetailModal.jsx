import { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Wrench, Clock, ShieldCheck, Plus, Key, Trash2, ExternalLink, Globe } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { api } from '../../lib/api';
import LicensePickerModal from './LicensePickerModal';
import toast from 'react-hot-toast';

export default function DeviceDetailModal({ isOpen, onClose, device }) {
    const { addHistoryEvent } = useInventory();
    const [activeTab, setActiveTab] = useState('details'); // details, software
    const [note, setNote] = useState('');
    const [eventType, setEventType] = useState('note');

    // License State
    const [licenses, setLicenses] = useState([]);
    const [isLicensePickerOpen, setIsLicensePickerOpen] = useState(false);

    useEffect(() => {
        if (isOpen && device) {
            fetchLicenses();
            setActiveTab('details'); // Reset tab on open
        }
    }, [isOpen, device]);

    const fetchLicenses = async () => {
        try {
            const data = await api.get(`/inventory/${device.id}/licenses`);
            setLicenses(data);
        } catch (err) {
            console.error("Failed to load licenses", err);
        }
    };

    const handleLinkLicense = async (vaultItemId) => {
        try {
            await api.post(`/inventory/${device.id}/licenses`, { vault_item_id: vaultItemId });
            toast.success('Licencia vinculada');
            fetchLicenses();
            addHistoryEvent(device.id, {
                type: 'maintenance',
                description: 'Se vinculó una licencia de software',
                user: 'Admin'
            });
        } catch (err) {
            if (err.response?.status === 409) {
                toast.error('Esta licencia ya está vinculada');
            } else {
                toast.error('Error al vincular licencia');
            }
        }
    };

    const handleUnlinkLicense = async (linkId) => {
        if (!confirm('¿Desvincular esta licencia?')) return;
        try {
            await api.del(`/inventory/${device.id}/licenses/${linkId}`);
            toast.success('Licencia desvinculada');
            fetchLicenses();
        } catch (err) {
            toast.error('Error al desvincular');
        }
    };

    if (!isOpen || !device) return null;

    const handleSubmitNote = (e) => {
        e.preventDefault();
        if (!note.trim()) return;

        addHistoryEvent(device.id, {
            type: eventType,
            description: note,
            user: 'Admin'
        });
        setNote('');
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'repair': return <Wrench className="w-4 h-4 text-amber-500" />;
            case 'assignment': return <User className="w-4 h-4 text-secondary" />;
            case 'maintenance': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
            default: return <FileText className="w-4 h-4 text-slate-400" />;
        }
    };

    const sortedHistory = [...(device.history || [])].sort((a, b) => b.date - a.date);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {device.brand} {device.model}
                        </h2>
                        <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">{device.serial}</span>
                            <span>•</span>
                            <span className="uppercase text-xs font-bold text-primary">{device.type}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900/30 px-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        Detalles
                    </button>
                    <button
                        onClick={() => setActiveTab('software')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'software' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        Software y Licencias ({licenses.length})
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {activeTab === 'details' ? (
                        <>
                            {/* Left Panel: Info & Quick Actions */}
                            <div className="w-full md:w-1/3 bg-slate-900/50 p-6 border-r border-slate-700 overflow-y-auto">
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Información</h3>
                                <div className="space-y-4 mb-8">
                                    {/* Existing info fields */}
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Asignado a</label>
                                        <div className="flex items-center gap-2 text-white">
                                            <User className="w-4 h-4 text-secondary" />
                                            <span>{device.assignedTo || 'Sin asignar'}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Estado</label>
                                            <div className="inline-block px-2 py-1 rounded bg-slate-800 text-xs font-bold text-white uppercase">
                                                {device.status}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Adquisición</label>
                                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(device.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Añadir Evento</h3>
                                <form onSubmit={handleSubmitNote} className="space-y-3">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setEventType('note')} className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${eventType === 'note' ? 'bg-primary/20 border-primary text-primary' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>Nota</button>
                                        <button type="button" onClick={() => setEventType('repair')} className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${eventType === 'repair' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>Reparación</button>
                                    </div>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Describe el evento..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary/50 min-h-[80px] resize-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!note.trim()}
                                        className="w-full bg-primary hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Registrar
                                    </button>
                                </form>
                            </div>

                            {/* Right Panel: Timeline */}
                            <div className="flex-1 p-6 overflow-y-auto bg-surface">
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Historial de Actividad
                                </h3>
                                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-800">
                                    {sortedHistory.length > 0 ? (
                                        sortedHistory.map((event, index) => (
                                            <div key={event.id || index} className="relative pl-8 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                                <div className="absolute left-0 top-1 w-4.5 h-4.5 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center z-10">
                                                    {getEventIcon(event.type)}
                                                </div>
                                                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {new Date(event.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                                                            {event.user}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-300 text-sm leading-relaxed">{event.description}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="pl-8 text-slate-500 text-sm italic">No hay eventos registrados aún.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 p-6 overflow-y-auto bg-surface">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Key className="w-5 h-5 text-primary" />
                                        Software Instalado
                                    </h3>
                                    <p className="text-slate-400 text-sm">Gestiona las licencias y cuentas vinculadas a este equipo.</p>
                                </div>
                                <button
                                    onClick={() => setIsLicensePickerOpen(true)}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    Vincular Licencia
                                </button>
                            </div>

                            {licenses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {licenses.map(lic => (
                                        <div key={lic.link_id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex items-start justify-between group hover:border-slate-600 transition-colors">
                                            <div className="flex items-start gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                                    {lic.url ? <Globe className="w-5 h-5 text-blue-400" /> : <Key className="w-5 h-5 text-amber-400" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-white truncate">{lic.title}</h4>
                                                    <p className="text-sm text-slate-400 truncate">{lic.username}</p>
                                                    <p className="text-xs text-slate-600 mt-1">Vinculado: {new Date(lic.assigned_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {lic.url && (
                                                    <a
                                                        href={lic.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                                                        title="Abrir URL"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleUnlinkLicense(lic.link_id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Desvincular"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                                    <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No hay software vinculado</p>
                                    <button
                                        onClick={() => setIsLicensePickerOpen(true)}
                                        className="text-primary text-sm hover:underline mt-2"
                                    >
                                        Buscar en la Bóveda
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <LicensePickerModal
                isOpen={isLicensePickerOpen}
                onClose={() => setIsLicensePickerOpen(false)}
                onSelect={handleLinkLicense}
            />
        </div>
    );
}
