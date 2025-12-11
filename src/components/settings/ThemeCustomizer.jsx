import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Palette, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const THEME_PRESETS = [
    { name: 'Emerald (Default)', primary: '#10b981', secondary: '#3b82f6' },
    { name: 'Purple', primary: '#a855f7', secondary: '#ec4899' },
    { name: 'Blue', primary: '#3b82f6', secondary: '#06b6d4' },
    { name: 'Orange', primary: '#f97316', secondary: '#eab308' },
    { name: 'Red', primary: '#ef4444', secondary: '#f59e0b' },
    { name: 'Cyan', primary: '#06b6d4', secondary: '#10b981' },
];

export default function ThemeCustomizer() {
    const { theme } = useTheme();
    const [customColors, setCustomColors] = useState(() => {
        const saved = localStorage.getItem('custom_theme_colors');
        if (saved) {
            const colors = JSON.parse(saved);
            // Apply saved colors on load
            document.documentElement.style.setProperty('--color-primary', colors.primary);
            document.documentElement.style.setProperty('--color-secondary', colors.secondary);
            return colors;
        }
        return {
            primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary') || '#10b981',
            secondary: getComputedStyle(document.documentElement).getPropertyValue('--color-secondary') || '#3b82f6'
        };
    });

    const applyTheme = (primary, secondary) => {
        document.documentElement.style.setProperty('--color-primary', primary);
        document.documentElement.style.setProperty('--color-secondary', secondary);
        setCustomColors({ primary, secondary });
        // Persist to localStorage
        localStorage.setItem('custom_theme_colors', JSON.stringify({ primary, secondary }));
        toast.success('✅ Tema personalizado aplicado');
    };

    const applyPreset = (preset) => {
        applyTheme(preset.primary, preset.secondary);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Personalizar Tema
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                    Elige colores predefinidos o crea tu propia combinación
                </p>
            </div>

            {/* Presets */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                    Temas Predefinidos
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {THEME_PRESETS.map((preset, index) => (
                        <button
                            key={index}
                            onClick={() => applyPreset(preset)}
                            className="relative p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="w-6 h-6 rounded-full"
                                    style={{ backgroundColor: preset.primary }}
                                />
                                <div
                                    className="w-6 h-6 rounded-full"
                                    style={{ backgroundColor: preset.secondary }}
                                />
                            </div>
                            <p className="text-sm font-medium text-white">{preset.name}</p>
                            {customColors.primary === preset.primary && (
                                <Check className="absolute top-2 right-2 w-5 h-5 text-primary" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Color Primario
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={customColors.primary}
                            onChange={(e) => {
                                const newPrimary = e.target.value;
                                setCustomColors({ ...customColors, primary: newPrimary });
                                applyTheme(newPrimary, customColors.secondary);
                            }}
                            className="w-16 h-10 rounded-lg border border-slate-700 cursor-pointer"
                        />
                        <input
                            type="text"
                            value={customColors.primary}
                            onChange={(e) => {
                                const newPrimary = e.target.value;
                                if (/^#[0-9A-F]{6}$/i.test(newPrimary)) {
                                    setCustomColors({ ...customColors, primary: newPrimary });
                                    applyTheme(newPrimary, customColors.secondary);
                                }
                            }}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                            placeholder="#10b981"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Color Secundario
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={customColors.secondary}
                            onChange={(e) => {
                                const newSecondary = e.target.value;
                                setCustomColors({ ...customColors, secondary: newSecondary });
                                applyTheme(customColors.primary, newSecondary);
                            }}
                            className="w-16 h-10 rounded-lg border border-slate-700 cursor-pointer"
                        />
                        <input
                            type="text"
                            value={customColors.secondary}
                            onChange={(e) => {
                                const newSecondary = e.target.value;
                                if (/^#[0-9A-F]{6}$/i.test(newSecondary)) {
                                    setCustomColors({ ...customColors, secondary: newSecondary });
                                    applyTheme(customColors.primary, newSecondary);
                                }
                            }}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                            placeholder="#3b82f6"
                        />
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                <p className="text-sm text-slate-400 mb-3">Vista Previa:</p>
                <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 bg-primary text-white rounded-lg">
                        Botón Primario
                    </button>
                    <button className="px-4 py-2 bg-secondary text-white rounded-lg">
                        Botón Secundario
                    </button>
                    <div className="px-4 py-2 bg-primary/20 text-primary border border-primary/50 rounded-lg">
                        Badge Primario
                    </div>
                </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-400">
                    💡 <strong>Tip:</strong> Los colores personalizados se aplican inmediatamente y se guardan en tu navegador.
                </p>
            </div>
        </div>
    );
}
