import { X, Search, Copy, Eye, Trash2, Star, ArrowRight, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { usePasswords } from '../../context/PasswordContext';
import { useView } from '../../context/ViewContext';
import { useAuth } from '../../context/AuthContext';
import Fuse from 'fuse.js';
import toast from 'react-hot-toast';

export default function CommandPalette({ isOpen, onClose }) {
    const { passwords, toggleFavorite, deletePassword } = usePasswords();
    const { setCurrentView } = useView();
    const { logout } = useAuth();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Fuzzy search setup
    const fuse = useMemo(() => {
        const activePasswords = passwords.filter(p => !p.isDeleted);
        return new Fuse(activePasswords, {
            keys: ['title', 'username', 'url', 'person'],
            threshold: 0.4,
            includeScore: true
        });
    }, [passwords]);

    // Search results
    const searchResults = useMemo(() => {
        if (!query) {
            // Show recent/favorite passwords when no query
            return passwords
                .filter(p => !p.isDeleted)
                .sort((a, b) => {
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    return 0;
                })
                .slice(0, 8);
        }

        return fuse.search(query).slice(0, 8).map(result => result.item);
    }, [query, fuse, passwords]);

    // Actions
    const actions = [
        { id: 'view-all', icon: Search, label: 'Ver Todas las Contraseñas', action: () => setCurrentView('all') },
        { id: 'view-favorites', icon: Star, label: 'Ver Favoritos', action: () => setCurrentView('favorites') },
        { id: 'view-shared', icon: Copy, label: 'Ver Compartidas Conmigo', action: () => setCurrentView('shared') },
        { id: 'view-trash', icon: Trash2, label: 'Ver Papelera', action: () => setCurrentView('trash') },
    ];

    // Reset on open/close
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            const totalItems = searchResults.length + (query ? 0 : actions.length);

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % totalItems);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
                    break;
                case 'Enter':
                    e.preventDefault();
                    handleSelect(selectedIndex);
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, searchResults, query]);

    const handleSelect = (index) => {
        if (query) {
            // Password selected
            if (searchResults[index]) {
                const password = searchResults[index];
                navigator.clipboard.writeText(password.password);
                toast.success(`✅ Contraseña de ${password.title} copiada`);
                onClose();
            }
        } else {
            // Action or password selected
            if (index < searchResults.length) {
                const password = searchResults[index];
                navigator.clipboard.writeText(password.password);
                toast.success(`✅ Contraseña de ${password.title} copiada`);
                onClose();
            } else {
                const actionIndex = index - searchResults.length;
                if (actions[actionIndex]) {
                    actions[actionIndex].action();
                    onClose();
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-150">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-700">
                    <Search className="w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar contraseñas o acciones (Ej: Google, Facebook...)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        autoFocus
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-lg"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-slate-500 bg-slate-800 border border-slate-700 rounded">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {/* Password Results */}
                    {searchResults.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                                {query ? 'Resultados' : 'Recientes y Favoritos'}
                            </div>
                            {searchResults.map((password, index) => (
                                <button
                                    key={password.id}
                                    onClick={() => handleSelect(index)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${selectedIndex === index
                                            ? 'bg-primary/20 text-white'
                                            : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg font-bold text-white">
                                        {password.title.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium truncate">{password.title}</div>
                                            {password.isFavorite && (
                                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500 truncate">{password.username}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Copy className="w-4 h-4" />
                                        <span className="hidden sm:inline">Copiar</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Actions (only show when no query) */}
                    {!query && actions.length > 0 && (
                        <div className="p-2 border-t border-slate-700">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                                Acciones Rápidas
                            </div>
                            {actions.map((action, index) => {
                                const actualIndex = searchResults.length + index;
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.id}
                                        onClick={() => handleSelect(actualIndex)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${selectedIndex === actualIndex
                                                ? 'bg-primary/20 text-white'
                                                : 'text-slate-300 hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">{action.label}</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* No results */}
                    {query && searchResults.length === 0 && (
                        <div className="p-12 text-center">
                            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">
                                No se encontraron resultados para "<strong>{query}</strong>"
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-700 bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded">↑↓</kbd>
                            <span>Navegar</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded">↵</kbd>
                            <span>Seleccionar</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                        <Zap className="w-3 h-3" />
                        <span>Command Palette</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
