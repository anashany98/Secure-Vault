import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, UserCheck, ArrowRight } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { cn } from '../../lib/utils';

export default function ImportPasswordsModal({ isOpen, onClose }) {
    const { bulkAddPasswords } = usePasswords();
    const [dragActive, setDragActive] = useState(false);
    // const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, processing, resolving, success, error
    const [stats, setStats] = useState({ total: 0 });
    const [errorMsg, setErrorMsg] = useState('');
    const [pendingData, setPendingData] = useState([]);
    const [conflicts, setConflicts] = useState({}); // { 'Juan': { examples: ['juan@gmail.com'], corrected: 'Juan' } }
    const inputRef = useRef(null);

    if (!isOpen) return null;

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const cleanName = (name) => {
        if (!name) return '';
        // Trim, remove double spaces, Title Case
        return name.trim()
            .replace(/\s+/g, ' ')
            .toLowerCase()
            .replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
    };

    const processData = (data) => {
        const newPasswords = [];
        const incompleteNames = {};

        // Column Aliases
        const aliases = {
            username: ['usuario', 'user', 'username', 'login', 'id', 'correo', 'email', 'identificador', 'acceso', 'nombre de usuario'],
            password: ['password', 'pass', 'contraseña', 'clave', 'pin', 'code', 'código', 'clave de acceso'],
            service: ['service', 'servicio', 'app', 'aplicación', 'web', 'sitio', 'plataforma', 'sistema', 'programa'],
            url: ['url', 'link', 'enlace', 'web', 'address', 'dirección']
        };

        const findValue = (row, potentialKeys) => {
            // Find the first key in row that matches any of the potentialKeys (partial match allowed)
            const rowKeys = Object.keys(row);
            for (const pKey of potentialKeys) {
                // Exact match first
                if (row[pKey]) return row[pKey];

                // Then partial match
                const foundKey = rowKeys.find(k => k.includes(pKey));
                if (foundKey && row[foundKey]) return row[foundKey];
            }
            return '';
        };

        data.forEach(row => {
            // Create a map where keys are lowercased and stripped of special chars
            const lowerRow = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.toLowerCase().trim().replace(/[\s._-]/g, '');
                lowerRow[cleanKey] = row[key];
            });

            // Strategy 0: Exact Custom User File Matches

            // A) Main Password File ("datos.csv")
            const customOwner = row['USUARIO DEPARTAMENTO terminal server'];
            const customFactusol = row['USUARIO FACTUSOL/CONTASOL'];

            // B) Phone File ("telefonos.csv")
            const phoneName = row['Nombre'];
            const phoneNumFile = row['Teléfono']; // From separate file
            const phoneCode = row['Código'];      // PIN?
            const phoneShortFile = row['Nombre corto'];


            const itemsToAdd = [];
            let personName = '';

            // Common Logic
            if (customOwner || customFactusol || (phoneName && phoneNumFile)) {

                // Determine Owner
                // Prioritize Factusol Name (Real Name) over Terminal Name (Username) to match Telefonos file
                let ownerRaw = (customFactusol && customFactusol !== 'SUPERVISOR') ? customFactusol : (customOwner || phoneName || 'Usuario');

                // Special case: If Phone file has "Nombre corto" and it looks like a full name, maybe use it? 
                // But for now, just clean the raw name.
                personName = cleanName(ownerRaw);

                // --- Logic for Main Password File ---
                if (customOwner || customFactusol) {
                    const rowKeys = Object.keys(row);
                    // Fuzzy match keys to handle encoding issues ('Ñ' vs '')
                    const keyFactusolPass = rowKeys.find(k => k.trim().startsWith('CONTRASE') && !k.toLowerCase().includes('terminal') && k.trim().length < 15) || 'CONTRASEÑA';
                    const keyEmailPass = rowKeys.find(k => k.startsWith('CONTRASE') && k.endsWith(' ')) || 'CONTRASEÑA '; // Relies on trailing space
                    const keyTerminalPass = rowKeys.find(k => k.includes('TERMINAL SERVER') && k.includes('CONTRASE')) || 'CONTRASEÑA             TERMINAL SERVER';
                    const keyPhoneLegacy = rowKeys.find(k => k.startsWith('TELEFONO')) || 'TELEFONO';

                    const passFactusol = row[keyFactusolPass];
                    const passEmail = row[keyEmailPass];
                    const passTerminal = row[keyTerminalPass];
                    const phoneNumLegacy = row[keyPhoneLegacy];

                    // 1. Terminal Server
                    if (customOwner) {
                        itemsToAdd.push({
                            title: 'Terminal Server',
                            username: customOwner,
                            password: passTerminal || '',
                            url: '',
                            meta_person: personName
                        });
                    }
                    // 2. Factusol
                    if (customFactusol && customFactusol !== 'SUPERVISOR') {
                        itemsToAdd.push({
                            title: 'Factusol',
                            username: customFactusol,
                            password: passFactusol || '',
                            url: '',
                            meta_person: personName
                        });
                    }
                    // 3. Email
                    const emailUser = row['EMAIL'];
                    if (emailUser) {
                        itemsToAdd.push({
                            title: 'Email',
                            username: emailUser,
                            password: passEmail || '',
                            url: `https://${(String(emailUser).split('@')[1]) || 'mail.google.com'}`,
                            meta_person: personName
                        });
                    }
                    // 4. Legacy Phone Column (if in main file)
                    if (phoneNumLegacy) {
                        itemsToAdd.push({
                            title: 'Móvil Corporativo',
                            username: phoneNumLegacy,
                            password: row['PIN'] || '',
                            url: '',
                            meta_person: personName
                        });
                    }
                    // 5. PC User 
                    const pcVal = row['USUARIO PC'];
                    if (pcVal) {
                        itemsToAdd.push({
                            title: 'PC Local',
                            username: pcVal,
                            password: '',
                            url: '',
                            meta_person: personName
                        });
                    }
                }

                // --- Logic for Phone File ---
                if (phoneName && phoneNumFile) {
                    itemsToAdd.push({
                        title: 'Móvil Corporativo',
                        username: phoneNumFile,
                        password: phoneCode || '', // Assuming Código is PIN
                        url: '',
                        meta_person: personName,
                        notes: phoneShortFile ? `Alias: ${phoneShortFile}` : ''
                    });
                }
            }
            else {
                // ... Fallback to normal strategies if custom checks failed ...

                // Strategy 1: "Wide" Format Detection (Contextual)
                const hasTerminal = lowerRow['usuariopc'] || lowerRow['terminalserver'];
                const hasFactusol = lowerRow['usuariofactusolcontasol'] || lowerRow['factusol'] || lowerRow['contasol'];
                const hasEmail = lowerRow['email'];

                // Person Name Detection
                let rawPersonName = lowerRow['propietario'] || lowerRow['usuariodepartamentoterminalserver'] || lowerRow['usuario'] || lowerRow['nombre'] || 'Usuario';
                personName = cleanName(String(rawPersonName));

                // Identification context (for resolution UI)
                const context = lowerRow['email'] || lowerRow['usuariopc'] || row[Object.keys(row)[0]];

                if (hasTerminal || hasFactusol || hasEmail) {
                    // ... Existing Logic for Wide Format ...
                    // 1. Terminal Server
                    const termUser = lowerRow['usuariopc'] || lowerRow['terminaluser'];
                    const termPass = lowerRow['contraseña'] || lowerRow['terminalpass'];
                    if (termUser || termPass) {
                        itemsToAdd.push({
                            title: 'Terminal Server',
                            username: termUser || personName,
                            password: termPass || '',
                            url: '',
                            meta_person: personName
                        });
                    }

                    // 2. Factusol
                    const factUser = lowerRow['usuariofactusolcontasol'] || lowerRow['factusoluser'];
                    const factPass = lowerRow['contraseña_1'] || lowerRow['contraseña'] || lowerRow['factusolpass'];

                    if (factUser && factUser !== 'SUPERVISOR') {
                        itemsToAdd.push({
                            title: 'Factusol',
                            username: factUser,
                            password: factPass || '',
                            url: '',
                            meta_person: personName
                        });
                    }

                    // 3. Email
                    const emailUser = lowerRow['email'];
                    const emailPass = lowerRow['contraseña_2'] || lowerRow['contraseña_1'] || lowerRow['contraseña'] || lowerRow['emailpass'];

                    if (emailUser) {
                        itemsToAdd.push({
                            title: 'Email',
                            username: emailUser,
                            password: emailPass || '',
                            url: `https://${(emailUser.toString().split('@')[1]) || 'mail.google.com'}`,
                            meta_person: personName
                        });
                    }
                }

                // Strategy 2: Robust Standard/Single Format (Fallback)
                // If we didn't add anything via Wide Format, OR if it clearly looks like a standard list
                if (itemsToAdd.length === 0) {
                    const password = findValue(lowerRow, aliases.password);
                    const username = findValue(lowerRow, aliases.username);

                    // Only add if we found at least a password or a username
                    if (password || username) {
                        itemsToAdd.push({
                            title: findValue(lowerRow, aliases.service) || 'Sin Título',
                            username: username || '',
                            password: password || '',
                            url: findValue(lowerRow, aliases.url) || '',
                            meta_person: personName
                        });
                    }
                }

            }

            // Add items and check for incomplete names
            itemsToAdd.forEach(item => {
                newPasswords.push(item);

                // Detection logic: Single word names (no spaces)
                if (personName && !personName.includes(' ') && personName.length > 0 && personName !== 'Usuario') {
                    if (!incompleteNames[personName]) {
                        incompleteNames[personName] = {
                            original: personName,
                            examples: new Set(),
                            corrected: personName
                        };
                    }
                    if (incompleteNames[personName].examples.size < 3) {
                        // Add context: "username (Service)"
                        const contextInfo = `${item.username}${item.title ? ` (${item.title})` : ''}`;
                        incompleteNames[personName].examples.add(contextInfo);
                    }
                }
            });
        });

        // Convert Set to Array for state
        Object.keys(incompleteNames).forEach(k => {
            incompleteNames[k].examples = Array.from(incompleteNames[k].examples);
        });

        const validPasswords = newPasswords.filter(p => p.password || p.username);

        if (validPasswords.length === 0) {
            setStatus('error');
            setErrorMsg('No se encontraron contraseñas válidas. Revisa el formato del archivo.');
            return;
        }

        if (Object.keys(incompleteNames).length > 0) {
            setPendingData(validPasswords);
            setConflicts(incompleteNames);
            setStatus('resolving');
        } else {
            finalizeImport(validPasswords);
        }
    };

    const finalizeImport = (passwords) => {
        bulkAddPasswords(passwords);
        setStats({ total: passwords.length });
        setStatus('success');
    };

    const handleResolve = () => {
        // Apply corrections
        const finalData = pendingData.map(item => {
            if (conflicts[item.meta_person]) {
                const corrected = conflicts[item.meta_person].corrected;
                return { ...item, meta_person: corrected, title: item.title === 'Terminal Server' && item.username === item.meta_person ? corrected : item.title };
            }
            return item;
        });
        finalizeImport(finalData);
    };

    const updateConflict = (original, newValue) => {
        setConflicts(prev => ({
            ...prev,
            [original]: { ...prev[original], corrected: newValue }
        }));
    };

    const handleFile = async (file) => {
        // setFile(file);
        setStatus('processing');
        setErrorMsg('');

        try {
            if (file.name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length) {
                            console.error("CSV Errors", results.errors);
                        }
                        processData(results.data);
                    }
                });
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                processData(jsonData);
            } else {
                setStatus('error');
                setErrorMsg('Formato no soportado. Usa CSV o Excel (.xlsx).');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
            setErrorMsg('Error al procesar el archivo.');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const reset = () => {
        // setFile(null);
        setStatus('idle');
        setStats({ total: 0 });
        setErrorMsg('');
        setPendingData([]);
        setConflicts({});
    };

    const closeAndReset = () => {
        reset();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`bg-surface border border-slate-700 w-full ${status === 'resolving' ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-all`}>
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {status === 'resolving' ? (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <UserCheck className="w-4 h-4 text-amber-500" />
                                </div>
                                Verificar Nombres
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                                    <FileSpreadsheet className="w-4 h-4 text-secondary" />
                                </div>
                                Importar Contraseñas
                            </>
                        )}
                    </h2>
                    <button onClick={closeAndReset} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {status === 'idle' || status === 'error' ? (
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                                dragActive ? "border-primary bg-primary/5" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50",
                                status === 'error' && "border-danger/50 bg-danger/5"
                            )}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                className="hidden"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={handleChange}
                            />

                            {status === 'error' ? (
                                <div className="flex flex-col items-center gap-2 text-danger">
                                    <AlertCircle className="w-10 h-10 mb-2" />
                                    <p className="font-medium">{errorMsg}</p>
                                    <span className="text-sm underline">Intentar de nuevo</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <Upload className="w-10 h-10 mb-2 text-slate-500" />
                                    <p className="font-medium text-white">Arrastra tu archivo aquí</p>
                                    <p className="text-sm">o haz clic para seleccionar</p>
                                    <p className="text-xs mt-4 text-slate-500">Soporta CSV y Excel (.xlsx)</p>
                                </div>
                            )}
                        </div>
                    ) : status === 'processing' ? (
                        <div className="py-12 text-center">
                            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                            <p className="text-white font-medium">Procesando archivo...</p>
                        </div>
                    ) : status === 'resolving' ? (
                        <div className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                                <p className="text-amber-200 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    He detectado nombres que parecen incompletos (solo una palabra).
                                    Por favor, añade los apellidos para mantener la base de datos organizada.
                                </p>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {Object.values(conflicts).map((conflict, idx) => (
                                    <div key={idx} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-400 text-sm font-medium">Original:</span>
                                                    <span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded text-sm">{conflict.original}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 space-y-1">
                                                    <p className="font-medium text-slate-400">Cuentas asociadas:</p>
                                                    <ul className="list-disc list-inside pl-1">
                                                        {conflict.examples.map((ex, i) => (
                                                            <li key={i} className="truncate">{ex}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="hidden md:block">
                                                <ArrowRight className="w-5 h-5 text-slate-600" />
                                            </div>

                                            <div className="flex-1 w-full md:w-auto">
                                                <label className="block text-xs text-slate-400 mb-1">Nombre Completo (Corregido)</label>
                                                <input
                                                    type="text"
                                                    value={conflict.corrected}
                                                    onChange={(e) => updateConflict(conflict.original, e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                                <button
                                    onClick={closeAndReset}
                                    className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleResolve}
                                    className="bg-primary hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Aplicar Correcciones e Importar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">¡Importación Exitosa!</h3>
                            <p className="text-slate-400 mb-6">Se han añadido <strong className="text-white">{stats.total}</strong> contraseñas a tu bóveda.</p>

                            <button
                                onClick={closeAndReset}
                                className="bg-primary hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                            >
                                Hecho
                            </button>
                        </div>
                    )}

                    {status === 'idle' && (
                        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400">
                            <p className="font-bold text-slate-300 mb-1">Formato Recomendado:</p>
                            <p>Columnas: <code className="text-secondary bg-slate-900 px-1 py-0.5 rounded">Service</code>, <code className="text-secondary bg-slate-900 px-1 py-0.5 rounded">Username</code>, <code className="text-secondary bg-slate-900 px-1 py-0.5 rounded">Password</code>, <code className="text-secondary bg-slate-900 px-1 py-0.5 rounded">URL</code></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
