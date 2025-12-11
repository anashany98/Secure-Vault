import { X, RefreshCw, Copy, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generatePassword, generatePassphrase, calculatePasswordStrength, getStrengthInfo } from '../../lib/passwordGenerator';
import toast from 'react-hot-toast';

export default function PasswordGeneratorModal({ isOpen, onClose, onUsePassword }) {
    const [generatorType, setGeneratorType] = useState('password'); // 'password' | 'passphrase'
    const [generated, setGenerated] = useState('');

    // Password options
    const [length, setLength] = useState(16);
    const [useLowercase, setUseLowercase] = useState(true);
    const [useUppercase, setUseUppercase] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);

    // Passphrase options
    const [wordCount, setWordCount] = useState(4);
    const [separator, setSeparator] = useState('-');
    const [capitalize, setCapitalize] = useState(true);
    const [includeNumber, setIncludeNumber] = useState(true);

    const strength = calculatePasswordStrength(generated);
    const strengthInfo = getStrengthInfo(strength);

    useEffect(() => {
        if (isOpen) {
            handleGenerate();
        }
    }, [isOpen, generatorType]);

    const handleGenerate = () => {
        try {
            let result;
            if (generatorType === 'password') {
                result = generatePassword({
                    length,
                    useLowercase,
                    useUppercase,
                    useNumbers,
                    useSymbols,
                    excludeAmbiguous
                });
            } else {
                result = generatePassphrase({
                    wordCount,
                    separator,
                    capitalize,
                    includeNumber
                });
            }
            setGenerated(result);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generated);
        toast.success('✅ Contraseña copiada al portapapeles');
    };

    const handleUse = () => {
        onUsePassword(generated);
        toast.success('✅ Contraseña aplicada');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Wand2 className="w-6 h-6 text-primary" />
                            Generador de Contraseñas
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Crea contraseñas seguras y memorables
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
                <div className="p-6 space-y-6">
                    {/* Type Selector */}
                    <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl">
                        <button
                            onClick={() => setGeneratorType('password')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${generatorType === 'password'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Contraseña
                        </button>
                        <button
                            onClick={() => setGeneratorType('passphrase')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${generatorType === 'passphrase'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Frase de Paso
                        </button>
                    </div>

                    {/* Generated Password */}
                    <div className="relative">
                        <div className="bg-slate-900/50 border-2 border-slate-700 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-400 text-sm font-medium">Generada:</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleGenerate}
                                        className="p-2 text-primary hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
                                        title="Regenerar"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                        title="Copiar"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="font-mono text-lg text-white break-all">
                                {generated || 'Generando...'}
                            </div>
                        </div>

                        {/* Strength Indicator */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Fuerza:</span>
                                <span className={`text-sm font-bold ${strengthInfo.color}`}>
                                    {strengthInfo.label}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full ${strengthInfo.bgColor} transition-all duration-300`}
                                    style={{ width: `${(strength / 4) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    {generatorType === 'password' ? (
                        <div className="space-y-4">
                            {/* Length Slider */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-300">Longitud</label>
                                    <span className="text-sm font-bold text-white">{length}</span>
                                </div>
                                <input
                                    type="range"
                                    min="8"
                                    max="64"
                                    value={length}
                                    onChange={(e) => setLength(Number(e.target.value))}
                                    onMouseUp={handleGenerate}
                                    onTouchEnd={handleGenerate}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Character Types */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={useLowercase}
                                        onChange={(e) => {
                                            setUseLowercase(e.target.checked);
                                            setTimeout(handleGenerate, 10);
                                        }}
                                        className="w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm text-slate-300">Minúsculas (a-z)</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={useUppercase}
                                        onChange={(e) => {
                                            setUseUppercase(e.target.checked);
                                            setTimeout(handleGenerate, 10);
                                        }}
                                        className="w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm text-slate-300">Mayúsculas (A-Z)</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={useNumbers}
                                        onChange={(e) => {
                                            setUseNumbers(e.target.checked);
                                            setTimeout(handleGenerate, 10);
                                        }}
                                        className="w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm text-slate-300">Números (0-9)</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={useSymbols}
                                        onChange={(e) => {
                                            setUseSymbols(e.target.checked);
                                            setTimeout(handleGenerate, 10);
                                        }}
                                        className="w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm text-sm text-slate-300">Símbolos (!@#$)</span>
                                </label>
                            </div>

                            {/* Advanced Options */}
                            <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={excludeAmbiguous}
                                    onChange={(e) => {
                                        setExcludeAmbiguous(e.target.checked);
                                        setTimeout(handleGenerate, 10);
                                    }}
                                    className="w-4 h-4 rounded accent-primary"
                                />
                                <span className="text-sm text-slate-300">Excluir ambiguos (i, l, 1, L, o, 0, O)</span>
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Word Count */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-300">Número de Palabras</label>
                                    <span className="text-sm font-bold text-white">{wordCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="3"
                                    max="8"
                                    value={wordCount}
                                    onChange={(e) => setWordCount(Number(e.target.value))}
                                    onMouseUp={handleGenerate}
                                    onTouchEnd={handleGenerate}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Separator */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Separador</label>
                                <div className="flex gap-2">
                                    {['-', '_', '.', ' '].map(sep => (
                                        <button
                                            key={sep}
                                            onClick={() => {
                                                setSeparator(sep);
                                                setTimeout(handleGenerate, 10);
                                            }}
                                            className={`flex-1 py-2 px-4 rounded-lg font-mono transition-all ${separator === sep
                                                    ? 'bg-primary text-white'
                                                    : 'bg-slate-900/50 text-slate-300 hover:bg-slate-900'
                                                }`}
                                        >
                                            {sep === ' ' ? '(espacio)' : sep}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={capitalize}
                                        onChange={(e) => {
                                            setCapitalize(e.target.checked);
                                            setTimeout(handleGenerate, 10);
                                        }}
                                        className="w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm text-slate-300">Capitalizar</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeNumber}
                                        onChange={(e) => {
                                            setIncludeNumber(e.target.checked);
                                            setTimeout(handleGenerate, 10);
                                        }}
                                        className="w-4 h-4 rounded accent-primary"
                                    />
                                    <span className="text-sm text-slate-300">Incluir Número</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        💡 Tip: Las frases de paso son más fáciles de recordar
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleUse}
                            className="px-5 py-2 bg-primary hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20"
                        >
                            Usar Contraseña
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
