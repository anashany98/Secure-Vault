import { useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, Key, StickyNote, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePasswords } from '../context/PasswordContext';
import { useNotes } from '../context/NotesContext';
import { useInventory } from '../context/InventoryContext';

const TrashPage = () => {
    const [activeTab, setActiveTab] = useState('passwords'); // 'passwords' | 'notes' | 'inventory'
    const { passwords, restorePassword, permanentlyDeletePassword } = usePasswords();
    const { notes, restoreNote, permanentlyDeleteNote } = useNotes();
    const { items: inventory, restoreItem, permanentlyDeleteItem } = useInventory();

    const deletedPasswords = passwords.filter(p => p.isDeleted);
    const deletedNotes = notes.filter(n => n.isDeleted);
    const deletedInventory = inventory.filter(i => i.isDeleted);

    const getDaysRemaining = (deletedAt) => {
        if (!deletedAt) return '730 días'; // Default 2 years
        const retentionPeriod = 2 * 365 * 24 * 60 * 60 * 1000;
        const elapsed = Date.now() - deletedAt;
        const remaining = retentionPeriod - elapsed;
        const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
        return `${days} días`;
    };

    const handleRestore = (id, type) => {
        if (type === 'passwords') restorePassword(id);
        if (type === 'notes') restoreNote(id);
        if (type === 'inventory') restoreItem(id);
        toast.success('Elemento restaurado');
    };

    const handleDelete = (id, type) => {
        if (window.confirm('¿Estás seguro? Esta acción es irreversible.')) {
            if (type === 'passwords') permanentlyDeletePassword(id);
            if (type === 'notes') permanentlyDeleteNote(id);
            if (type === 'inventory') permanentlyDeleteItem(id);
            toast.success('Elemento eliminado definitivamente');
        }
    };

    const EmptyState = () => (
        <div className="text-center py-12">
            <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Papelera vacía</h3>
            <p className="text-gray-500 dark:text-gray-400">No hay elementos eliminados en esta categoría.</p>
        </div>
    );

    const ItemList = ({ items, type, Icon }) => (
        <div className="space-y-3">
            {items.map(item => (
                <div key={item.id} data-testid={`trash-item-${type}-${item.id}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <Icon className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{item.title || item.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="text-red-500 text-xs bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full">
                                    Expira en: {getDaysRemaining(item.deletedAt)}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            data-testid={`trash-restore-${type}-${item.id}`}
                            onClick={() => handleRestore(item.id, type)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Restaurar"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            data-testid={`trash-delete-${type}-${item.id}`}
                            onClick={() => handleDelete(item.id, type)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar definitivamente"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trash2 className="w-8 h-8 text-red-500" />
                        Papelera de Reciclaje
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Los elementos se eliminarán automáticamente después de 2 años.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                    data-testid="trash-tab-passwords"
                    onClick={() => setActiveTab('passwords')}
                    className={`px-4 py-2 border-b-2 font-medium transition-colors ${activeTab === 'passwords'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Contraseñas ({deletedPasswords.length})
                </button>
                <button
                    data-testid="trash-tab-notes"
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2 border-b-2 font-medium transition-colors ${activeTab === 'notes'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Notas ({deletedNotes.length})
                </button>
                <button
                    data-testid="trash-tab-inventory"
                    onClick={() => setActiveTab('inventory')}
                    className={`px-4 py-2 border-b-2 font-medium transition-colors ${activeTab === 'inventory'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Inventario ({deletedInventory.length})
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'passwords' && (
                    deletedPasswords.length > 0
                        ? <ItemList items={deletedPasswords} type="passwords" Icon={Key} />
                        : <EmptyState />
                )}
                {activeTab === 'notes' && (
                    deletedNotes.length > 0
                        ? <ItemList items={deletedNotes} type="notes" Icon={StickyNote} />
                        : <EmptyState />
                )}
                {activeTab === 'inventory' && (
                    deletedInventory.length > 0
                        ? <ItemList items={deletedInventory} type="inventory" Icon={Package} />
                        : <EmptyState />
                )}
            </div>
        </div>
    );
};

export default TrashPage;
