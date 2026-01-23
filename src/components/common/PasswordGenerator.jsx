import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PasswordGenerator({ onGenerate }) {
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [showOptions, setShowOptions] = useState(false);

    const generate = () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let chars = '';
        if (includeUppercase) chars += uppercase;
        if (includeLowercase) chars += lowercase;
        if (includeNumbers) chars += numbers;
        if (includeSymbols) chars += symbols;

        if (chars === '') {
            toast.error('Selecciona al menos un tipo de caracter');
            return;
        }

        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setGeneratedPassword(password);
        if (onGenerate) onGenerate(password);
    };

    // Auto generate on first open if empty? No, optional.

    return (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Generador</span>
                <button
                    type="button"
                    onClick={() => setShowOptions(!showOptions)}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            <div className="flex gap-2 mb-2">
                <input
                    type="text"
                    readOnly
                    value={generatedPassword}
                    placeholder="Generar contraseña..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-primary font-mono"
                />
                <button
                    type="button"
                    onClick={generate}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
                    title="Generar nueva"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                {generatedPassword && (
                    <button
                        type="button"
                        onClick={() => {
                            onGenerate(generatedPassword); // Parent callback handles "using" it
                            toast.success('Contraseña copiada');
                        }}
                        className="p-1.5 bg-primary hover:bg-primary/90 rounded text-white transition-colors"
                        title="Usar contraseña"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showOptions && (
                <div className="space-y-3 pt-2 border-t border-slate-700 animate-in slide-in-from-top-2">
                    <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Longitud: {length}</span>
                        </div>
                        <input
                            type="range"
                            min="8"
                            max="64"
                            value={length}
                            onChange={(e) => setLength(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeUppercase}
                                onChange={e => setIncludeUppercase(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary/50"
                            />
                            A-Z
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeLowercase}
                                onChange={e => setIncludeLowercase(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary/50"
                            />
                            a-z
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeNumbers}
                                onChange={e => setIncludeNumbers(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary/50"
                            />
                            0-9
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeSymbols}
                                onChange={e => setIncludeSymbols(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary/50"
                            />
                            !@#
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
