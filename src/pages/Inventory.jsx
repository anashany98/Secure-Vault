import { useState } from 'react';
import { Package, Plus, Search, Monitor, Smartphone, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import InventoryItem from '../components/inventory/InventoryItem';
import AddDeviceModal from '../components/inventory/AddDeviceModal';
import DeviceDetailModal from '../components/inventory/DeviceDetailModal';

import DeviceQRModal from '../components/inventory/DeviceQRModal';

export default function Inventory() {
    const { user } = useAuth();
    const { items } = useInventory();
    const [isModaAddOpen, setIsModalAddOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [qrDevice, setQrDevice] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = items.filter(item =>
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.serial && item.serial.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Stats
    const totalItems = items.length;
    const computers = items.filter(i => i.type === 'ordenador').length;
    const mobiles = items.filter(i => i.type === 'movil').length;
    const inRepair = items.filter(i => i.status === 'reparacion').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Inventario Corporativo</h1>
                    <p className="text-slate-400">Gestiona los activos asignados</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar dispositivo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-surface border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalAddOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Dispositivo
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase">Total</p>
                        <p className="text-xl font-bold text-white">{totalItems}</p>
                    </div>
                </div>
                <div className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase">PCs</p>
                        <p className="text-xl font-bold text-white">{computers}</p>
                    </div>
                </div>
                <div className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase">Móviles</p>
                        <p className="text-xl font-bold text-white">{mobiles}</p>
                    </div>
                </div>
                <div className={`bg-surface border p-4 rounded-xl flex items-center gap-3 ${inRepair > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700'}`}>
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <AlertCircle className={`w-5 h-5 text-amber-500`} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-medium uppercase">Reparación</p>
                        <p className={`text-xl font-bold ${inRepair > 0 ? 'text-amber-500' : 'text-white'}`}>{inRepair}</p>
                    </div>
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Inventario Vacío</h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">
                        Registra los ordenadores, móviles y equipos de la empresa.
                    </p>
                    <button
                        onClick={() => setIsModalAddOpen(true)}
                        className="text-primary hover:text-emerald-400 font-medium px-4 py-2"
                    >
                        Añadir primer activo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => setSelectedDevice(item)} className="cursor-pointer">
                            <InventoryItem item={item} onShowQR={setQrDevice} />
                        </div>
                    ))}
                </div>
            )}

            <AddDeviceModal isOpen={isModaAddOpen} onClose={() => setIsModalAddOpen(false)} />

            <DeviceDetailModal
                isOpen={!!selectedDevice}
                device={selectedDevice}
                onClose={() => setSelectedDevice(null)}
            />

            <DeviceQRModal
                device={qrDevice}
                onClose={() => setQrDevice(null)}
            />
        </div>
    );
}
