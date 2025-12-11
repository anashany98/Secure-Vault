import { useState } from 'react';
import { Copy, Eye, EyeOff, Trash2, ExternalLink, Shield } from 'lucide-react';
import { usePasswords } from '../../context/PasswordContext';
import { calculateCrackTime, getSecurityEmoji } from '../../lib/passwordSecurity';
import { cn } from '../../lib/utils';

export default function PasswordTable({ items }) {
    const { deletePassword } = usePasswords();
    const [visiblePasswords, setVisiblePasswords] = useState({});

    const togglePassword = (id) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta contraseña?')) {
            deletePassword(id);
        }
    };

    return (
        <div className="overflow-x-auto bg-surface border border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Servicio</th>
                        <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuario</th>
                        <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contraseña</th>
                        <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Seguridad</th>
                        <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Propietario</th>
                        <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-white font-bold border border-white/10">
                                        {item.title.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">{item.title}</div>
                                        {item.url && (
                                            <a
                                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:text-emerald-400 flex items-center gap-1 mt-0.5"
                                            >
                                                Visitar <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-300 font-mono text-sm">{item.username}</span>
                                    <button
                                        onClick={() => copyToClipboard(item.username)}
                                        className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Copiar usuario"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-300 font-mono text-sm min-w-[8ch]">
                                        {visiblePasswords[item.id] ? item.password : '••••••••'}
                                    </span>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => togglePassword(item.id)}
                                            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-700"
                                            title={visiblePasswords[item.id] ? "Ocultar" : "Mostrar"}
                                        >
                                            {visiblePasswords[item.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(item.password)}
                                            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-700 ml-1"
                                            title="Copiar contraseña"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                {(() => {
                                    const security = calculateCrackTime(item.password);
                                    return (
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                            security.bgColor,
                                            security.borderColor
                                        )}>
                                            <Shield className={cn("w-3 h-3", security.color)} />
                                            <span className={security.color}>{security.time}</span>
                                        </div>
                                    );
                                })()}
                            </td>
                            <td className="p-4">
                                {item.meta_person ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                        {item.meta_person}
                                    </span>
                                ) : (
                                    <span className="text-slate-600 text-xs italic">N/A</span>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
