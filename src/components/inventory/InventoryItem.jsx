import { Trash2, Edit2, Smartphone, Laptop, Monitor, Printer, Mouse, Box, User, Calendar, QrCode } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { deviceStatus } from '../../data/inventoryCatalog';

export default function InventoryItem({ item, onShowQR }) {
    const { deleteItem } = useInventory();

    const getTypeIcon = (typeId) => {
        switch (typeId) {
            case 'movil': return <Smartphone className="w-8 h-8 text-primary" />;
            case 'ordenador': return <Laptop className="w-8 h-8 text-primary" />;
            case 'pantalla': return <Monitor className="w-8 h-8 text-primary" />;
            case 'impresora': return <Printer className="w-8 h-8 text-primary" />;
            case 'periferico': return <Mouse className="w-8 h-8 text-primary" />;
            default: return <Box className="w-8 h-8 text-primary" />;
        }
    };

    const getStatusBadge = (statusId) => {
        const status = deviceStatus.find(s => s.id === statusId);
        return (
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${status?.color || 'bg-slate-700 text-slate-400'}`}>
                {status?.label || statusId}
            </span>
        );
    };

    return (
        <div className="bg-surface border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-all group relative">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
                    {getTypeIcon(item.type)}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onShowQR(item); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Generar Etiqueta QR"
                    >
                        <QrCode className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-white text-lg leading-tight">{item.brand}</h3>
                    {getStatusBadge(item.status)}
                </div>
                <p className="text-slate-400 text-sm mb-4">{item.model}</p>

                <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <Box className="w-4 h-4" />
                        <span className="font-mono bg-slate-900 px-1 rounded">{item.serial || 'S/N: ---'}</span>
                    </div>
                    {item.assignedTo && (
                        <div className="flex items-center gap-2 text-slate-300">
                            <User className="w-4 h-4 text-secondary" />
                            <span>{item.assignedTo}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
