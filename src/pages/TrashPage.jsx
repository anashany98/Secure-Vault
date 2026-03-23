import { useMemo, useState } from 'react';
import { AlertTriangle, Key, RefreshCw, StickyNote, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useNotes } from '../context/NotesContext';
import { usePasswords } from '../context/PasswordContext';

function getDaysRemaining(deletedAt, now) {
    if (!deletedAt) {
        return '730 dias';
    }

    const retentionPeriod = 2 * 365 * 24 * 60 * 60 * 1000;
    const elapsed = now - new Date(deletedAt).getTime();
    const remaining = retentionPeriod - elapsed;
    const days = Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
    return `${days} dias`;
}

function EmptyState() {
    return (
        <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Trash2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Papelera vacia</h3>
            <p className="text-gray-500 dark:text-gray-400">No hay elementos eliminados en esta categoria.</p>
        </div>
    );
}

function ItemList({ items, now, onDelete, onRestore, type, icon }) {
    const IconComponent = icon;

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    data-testid={`trash-item-${type}-${item.id}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                            <IconComponent className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{item.title || item.name}</h4>
                            <p className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500 dark:bg-red-900/10">
                                    Expira en: {getDaysRemaining(item.deletedAt, now)}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            data-testid={`trash-restore-${type}-${item.id}`}
                            onClick={() => onRestore(item.id)}
                            title="Restaurar"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                        <button
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                            data-testid={`trash-delete-${type}-${item.id}`}
                            onClick={() => onDelete(item.id)}
                            title="Eliminar definitivamente"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TrashPage() {
    const [activeTab, setActiveTab] = useState('passwords');
    const { passwords, permanentlyDeletePassword, restorePassword } = usePasswords();
    const { notes, permanentlyDeleteNote, restoreNote } = useNotes();
    const now = useMemo(() => Date.now(), []);

    const deletedPasswords = passwords.filter((password) => password.isDeleted);
    const deletedNotes = notes.filter((note) => note.isDeleted);

    const handleDeletePassword = (id) => {
        if (window.confirm('Esta accion es irreversible. Continuar?')) {
            permanentlyDeletePassword(id);
            toast.success('Elemento eliminado definitivamente');
        }
    };

    const handleDeleteNote = (id) => {
        if (window.confirm('Esta accion es irreversible. Continuar?')) {
            permanentlyDeleteNote(id);
            toast.success('Elemento eliminado definitivamente');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                        <Trash2 className="h-8 w-8 text-red-500" />
                        Papelera de Reciclaje
                    </h1>
                    <p className="mt-1 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Los elementos se eliminaran automaticamente despues de 2 anos.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                    className={`border-b-2 px-4 py-2 font-medium transition-colors ${activeTab === 'passwords'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    data-testid="trash-tab-passwords"
                    onClick={() => setActiveTab('passwords')}
                >
                    Contrasenas ({deletedPasswords.length})
                </button>
                <button
                    className={`border-b-2 px-4 py-2 font-medium transition-colors ${activeTab === 'notes'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    data-testid="trash-tab-notes"
                    onClick={() => setActiveTab('notes')}
                >
                    Notas ({deletedNotes.length})
                </button>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'passwords' && (
                    deletedPasswords.length > 0 ? (
                        <ItemList
                            icon={Key}
                            items={deletedPasswords}
                            now={now}
                            onDelete={handleDeletePassword}
                            onRestore={restorePassword}
                            type="passwords"
                        />
                    ) : (
                        <EmptyState />
                    )
                )}
                {activeTab === 'notes' && (
                    deletedNotes.length > 0 ? (
                        <ItemList
                            icon={StickyNote}
                            items={deletedNotes}
                            now={now}
                            onDelete={handleDeleteNote}
                            onRestore={restoreNote}
                            type="notes"
                        />
                    ) : (
                        <EmptyState />
                    )
                )}
            </div>
        </div>
    );
}
