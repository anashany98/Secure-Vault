import { useState, useMemo } from 'react';
import { X, Calendar, User, FileText, Wrench, Clock, ShieldCheck, Plus } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';

export default function DeviceDetailModal({ isOpen, onClose, device }) {
    const { addHistoryEvent } = useInventory();
    const [note, setNote] = useState('');
    const [eventType, setEventType] = useState('note'); // note, repair, maintenance

    if (!isOpen || !device) return null;

    const handleSubmitNote = (e) => {
        e.preventDefault();
        if (!note.trim()) return;

        addHistoryEvent(device.id, {
            type: eventType,
            description: note,
            user: 'Admin' // Hardcoded for now, should come from AuthContext
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
            <div className="bg-surface border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

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

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left Panel: Info & Quick Actions */}
                    <div className="w-full md:w-1/3 bg-slate-900/50 p-6 border-r border-slate-700 overflow-y-auto">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Detalles</h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Asignado a</label>
                                <div className="flex items-center gap-2 text-white">
                                    <User className="w-4 h-4 text-secondary" />
                                    <span>{device.assignedTo || 'Sin asignar'}</span>
                                </div>
                            </div>
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

                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Añadir Evento</h3>
                        <form onSubmit={handleSubmitNote} className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEventType('note')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${eventType === 'note' ? 'bg-primary/20 border-primary text-primary' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    Nota
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEventType('repair')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${eventType === 'repair' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                >
                                    Reparación
                                </button>
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
                                                    {new Date(event.date).toLocaleDateString()} • {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                                                    {event.user}
                                                </span>
                                            </div>
                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                {event.description}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="pl-8 text-slate-500 text-sm italic">
                                    No hay eventos registrados aún.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
