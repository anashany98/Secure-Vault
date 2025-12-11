import { X, Keyboard, Command } from 'lucide-react';

const shortcuts = [
    {
        category: 'Navegación',
        items: [
            { keys: ['Ctrl', 'K'], description: 'Abrir Command Palette' },
            { keys: ['Esc'], description: 'Cerrar modales' },
        ]
    },
    {
        category: 'Acciones',
        items: [
            { keys: ['Ctrl', 'N'], description: 'Nueva contraseña (próximamente)' },
            { keys: ['Ctrl', 'F'], description: 'Buscar (próximamente)' },
        ]
    },
    {
        category: 'Command Palette',
        items: [
            { keys: ['↑', '↓'], description: 'Navegar resultados' },
            { keys: ['Enter'], description: 'Seleccionar / Copiar' },
            { keys: ['Esc'], description: 'Cerrar' },
        ]
    },
    {
        category: 'Formularios',
        items: [
            { keys: ['Enter'], description: 'Añadir tag (en TagInput)' },
            { keys: ['Backspace'], description: 'Eliminar último tag' },
        ]
    }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Keyboard className="w-6 h-6 text-primary" />
                            Atajos de Teclado
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Mejora tu productividad con estos atajos
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {shortcuts.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="text-sm font-semibold text-primary uppercase mb-3">
                                {section.category}
                            </h3>
                            <div className="space-y-2">
                                {section.items.map((item, itemIdx) => (
                                    <div key={itemIdx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors">
                                        <span className="text-slate-300 text-sm">{item.description}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((key, keyIdx) => (
                                                <span key={keyIdx} className="inline-flex items-center">
                                                    <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-slate-300 min-w-[32px] text-center">
                                                        {key}
                                                    </kbd>
                                                    {keyIdx < item.keys.length - 1 && (
                                                        <span className="mx-1 text-slate-600">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Tip */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-sm text-blue-400">
                            <strong className="flex items-center gap-1">
                                <Command className="w-4 h-4" />
                                Tip:
                            </strong>
                            En Mac, usa <kbd className="px-2 py-0.5 bg-blue-900/50 rounded text-xs">Cmd</kbd> en lugar de <kbd className="px-2 py-0.5 bg-blue-900/50 rounded text-xs">Ctrl</kbd>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
