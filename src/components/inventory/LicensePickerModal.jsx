import { useState, useEffect } from 'react';
import { Search, X, Key, Globe, LayoutGrid, Check } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';

export default function LicensePickerModal({ isOpen, onClose, onSelect }) {
    const { passwords } = usePasswords(); // We reuse the passwords context to get vault items
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);

    if (!isOpen) return null;

    // Filter logic
    const filteredItems = passwords.filter(item =>
        !item.is_deleted &&
        (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelect = () => {
        if (selectedId) {
            onSelect(selectedId);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        Vincular Licencia / Software
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar software en la bóveda..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            No se encontraron resultados.
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedId(item.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${selectedId === item.id
                                        ? 'bg-primary/20 border-primary'
                                        : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800'
                                    }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedId === item.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {item.url ? <Globe className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-medium truncate ${selectedId === item.id ? 'text-white' : 'text-slate-200'}`}>{item.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{item.username || 'Sin usuario'}</p>
                                    </div>
                                </div>
                                {selectedId === item.id && (
                                    <div className="bg-primary rounded-full p-1">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSelect}
                        disabled={!selectedId}
                        className="bg-primary hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold transition-all"
                    >
                        Vincular Seleccionada
                    </button>
                </div>
            </div>
        </div>
    );
}
