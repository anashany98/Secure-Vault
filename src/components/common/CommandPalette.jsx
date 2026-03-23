import { ArrowRight, Copy, FileText, Package, Search, Share2, Star, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';

import { useInventory } from '../../context/InventoryContext';
import { useNotes } from '../../context/NotesContext';
import { usePasswords } from '../../context/PasswordContext';
import { useView } from '../../context/ViewContext';

function buildSearchEntries(passwords, notes, inventory, setCurrentView) {
    const entries = [];

    passwords
        .filter((password) => !password.isDeleted)
        .forEach((password) => {
            entries.push({
                id: `password-${password.id}`,
                kind: 'credencial',
                keywords: Array.isArray(password.tags) ? password.tags.map((tag) => tag.name || tag) : [],
                subtitle: password.username || password.url || 'Sin usuario',
                targetView: 'all',
                title: password.title,
                type: 'password',
                value: password,
            });
        });

    notes
        .filter((note) => !note.isDeleted)
        .forEach((note) => {
            entries.push({
                id: `note-${note.id}`,
                kind: 'nota',
                keywords: [note.content],
                subtitle: 'Abrir en notas seguras',
                targetView: 'notes',
                title: note.title,
                type: 'note',
                value: note,
            });
        });

    inventory.forEach((device) => {
        entries.push({
            id: `device-${device.id}`,
            kind: 'activo',
            keywords: [device.brand, device.model, device.serial, device.assignedTo],
            subtitle: `${device.brand} ${device.model}`,
            targetView: 'inventory',
            title: device.serial || device.model,
            type: 'device',
            value: device,
        });
    });

    return entries.map((entry) => ({
        ...entry,
        action: () => setCurrentView(entry.targetView),
    }));
}

export default function CommandPalette({ isOpen, onClose }) {
    const { passwords } = usePasswords();
    const { notes } = useNotes();
    const { items } = useInventory();
    const { setCurrentView } = useView();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const searchEntries = useMemo(
        () => buildSearchEntries(passwords, notes, items, setCurrentView),
        [items, notes, passwords, setCurrentView]
    );

    const fuse = useMemo(
        () =>
            new Fuse(searchEntries, {
                includeScore: true,
                keys: ['title', 'subtitle', 'kind', 'keywords'],
                threshold: 0.35,
            }),
        [searchEntries]
    );

    const searchResults = useMemo(() => {
        if (!query) {
            return searchEntries.slice(0, 8);
        }

        return fuse.search(query).slice(0, 8).map((result) => result.item);
    }, [fuse, query, searchEntries]);

    const actions = useMemo(
        () => [
            { id: 'view-inbox', icon: Search, label: 'Abrir Pendientes', action: () => setCurrentView('inbox') },
            { id: 'view-all', icon: Copy, label: 'Ver Todas las Contrasenas', action: () => setCurrentView('all') },
            { id: 'view-favorites', icon: Star, label: 'Ver Favoritos', action: () => setCurrentView('favorites') },
            { id: 'view-shared', icon: Share2, label: 'Ver Compartidas Conmigo', action: () => setCurrentView('shared') },
            { id: 'view-trash', icon: Trash2, label: 'Ver Papelera', action: () => setCurrentView('trash') },
            { id: 'view-notes', icon: FileText, label: 'Abrir Notas Seguras', action: () => setCurrentView('notes') },
            { id: 'view-inventory', icon: Package, label: 'Abrir Inventario', action: () => setCurrentView('inventory') },
        ],
        [setCurrentView]
    );

    const handleSelect = useCallback((index) => {
        if (index < searchResults.length) {
            const entry = searchResults[index];
            if (entry.type === 'password') {
                navigator.clipboard.writeText(entry.value.password);
                toast.success(`Contrasena de ${entry.title} copiada`);
            } else {
                entry.action();
                toast.success(`Abriendo ${entry.kind}`);
            }
            onClose();
            return;
        }

        const action = actions[index - searchResults.length];
        if (action) {
            action.action();
            onClose();
        }
    }, [actions, onClose, searchResults]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setQuery('');
        setSelectedIndex(0);
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (!isOpen) {
                return;
            }

            const totalItems = searchResults.length + (query ? 0 : actions.length);
            if (totalItems === 0) {
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex((previous) => (previous + 1) % totalItems);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex((previous) => (previous - 1 + totalItems) % totalItems);
                    break;
                case 'Enter':
                    event.preventDefault();
                    handleSelect(selectedIndex);
                    break;
                case 'Escape':
                    event.preventDefault();
                    onClose();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [actions, handleSelect, isOpen, onClose, query, searchResults, selectedIndex]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-3 border-b border-slate-700 p-4">
                    <Search className="h-5 w-5 text-slate-500" />
                    <input
                        autoFocus
                        className="flex-1 border-none bg-transparent text-lg text-white outline-none placeholder-slate-500"
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Buscar contraseñas, notas e inventario..."
                        type="text"
                        value={query}
                    />
                    <kbd className="hidden items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-500 sm:inline-flex">
                        ESC
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {searchResults.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                                {query ? 'Resultados' : 'Acceso Rapido'}
                            </div>
                            {searchResults.map((entry, index) => (
                                <button
                                    key={entry.id}
                                    className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                                        selectedIndex === index
                                            ? 'bg-primary/20 text-white'
                                            : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                    onClick={() => handleSelect(index)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
                                            {entry.title.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="truncate font-medium">{entry.title}</div>
                                                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-500">
                                                    {entry.kind}
                                                </span>
                                            </div>
                                            <div className="truncate text-sm text-slate-500">{entry.subtitle}</div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {entry.type === 'password' ? (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Copiar</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRight className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Abrir</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!query && actions.length > 0 && (
                        <div className="border-t border-slate-700 p-2">
                            <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                                Acciones Rapidas
                            </div>
                            {actions.map((action, index) => {
                                const ActionIcon = action.icon;
                                const actionIndex = searchResults.length + index;

                                return (
                                    <button
                                        key={action.id}
                                        className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                                            selectedIndex === actionIndex
                                                ? 'bg-primary/20 text-white'
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                        onClick={() => handleSelect(actionIndex)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                                                <ActionIcon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 font-medium">{action.label}</div>
                                            <ArrowRight className="h-4 w-4 text-slate-500" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {query && searchResults.length === 0 && (
                        <div className="p-12 text-center">
                            <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                            <p className="text-slate-400">
                                No se encontraron resultados para "<strong>{query}</strong>"
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <kbd className="rounded border border-slate-700 bg-slate-800 px-2 py-1">↑↓</kbd>
                            <span>Navegar</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="rounded border border-slate-700 bg-slate-800 px-2 py-1">↵</kbd>
                            <span>Seleccionar</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                        <Zap className="h-3 w-3" />
                        <span>Command Palette</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
