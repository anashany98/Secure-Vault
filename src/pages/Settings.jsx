import { useEffect, useState } from 'react';
import { User, Shield, Activity, Clock, Sun, Moon, Upload, RefreshCw, Database, Files, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { usePasswords } from '../context/PasswordContext';
import { useTheme } from '../context/ThemeContext';
import ThemeCustomizer from '../components/settings/ThemeCustomizer';
import ExportVaultModal from '../components/settings/ExportVaultModal';
import ImportVaultModal from '../components/settings/ImportVaultModal';
import UsersManager from '../components/settings/UsersManager';
import TwoFactorSettings from '../components/settings/TwoFactorSettings';

export default function Settings() {
    const { user: currentUser } = useAuth();
    const { auditLogs, deleteTemplate, templates } = usePasswords();
    const { toggleTheme, isDark } = useTheme();
    const { config, updateConfig } = useConfig();
    const [companyNameLocal, setCompanyNameLocal] = useState('');
    const [activeTab, setActiveTab] = useState('preferences');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        if (config?.company_name) {
            setCompanyNameLocal(config.company_name);
        }
    }, [config?.company_name]);

    const handleUpdateConfig = async () => {
        const success = await updateConfig({ company_name: companyNameLocal });
        if (success) {
            toast.success('Configuracion guardada');
            return;
        }

        toast.error('No se pudo guardar la configuracion');
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE':
                return 'text-emerald-400 bg-emerald-500/10';
            case 'DELETE':
                return 'text-red-400 bg-red-500/10';
            case 'UPDATE':
                return 'text-amber-400 bg-amber-500/10';
            default:
                return 'text-blue-400 bg-blue-500/10';
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Ajustes del Sistema</h1>
                    <p className="text-slate-400">Panel de control de administracion</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-700 mb-8 overflow-x-auto">
                {isAdmin && (
                    <button
                        data-testid="settings-tab-users"
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Usuarios
                        </div>
                    </button>
                )}
                <button
                    data-testid="settings-tab-activity"
                    onClick={() => setActiveTab('activity')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Actividad
                    </div>
                </button>
                <button
                    data-testid="settings-tab-security"
                    onClick={() => setActiveTab('seguridad')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'seguridad' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Seguridad
                    </div>
                </button>
                <button
                    data-testid="settings-tab-preferences"
                    onClick={() => setActiveTab('preferences')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'preferences' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Apariencia
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Files className="w-4 h-4" />
                        Plantillas
                    </div>
                </button>
                {isAdmin && (
                    <button
                        data-testid="settings-tab-company"
                        onClick={() => setActiveTab('config')}
                        className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Empresa
                        </div>
                    </button>
                )}
            </div>

            {activeTab === 'config' && isAdmin ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Datos de la Organizacion
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre de la Empresa</label>
                                <p className="text-xs text-slate-500 mb-2">Este nombre aparecera en las etiquetas de inventario y reportes.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={companyNameLocal}
                                        onChange={(e) => setCompanyNameLocal(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej. Industrias Stark"
                                    />
                                    <button
                                        onClick={handleUpdateConfig}
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'users' && isAdmin ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <UsersManager />
                </div>
            ) : activeTab === 'seguridad' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <TwoFactorSettings user={currentUser} />

                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Auto-logout por Inactividad
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Cierra sesion automaticamente despues de un periodo de inactividad
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-white">Tiempo de espera:</span>
                                <span className="text-primary font-semibold">
                                    {localStorage.getItem('auto_logout_minutes') || 5} minutos
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="60"
                                value={localStorage.getItem('auto_logout_minutes') || 5}
                                onChange={(e) => {
                                    localStorage.setItem('auto_logout_minutes', e.target.value);
                                    window.dispatchEvent(new Event('auto-logout-change'));
                                    window.dispatchEvent(new Event('storage'));
                                }}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>
                </div>
            ) : activeTab === 'preferences' ? (
                <div className="space-y-6">
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                            Modo de Tema
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">Tema {isDark ? 'Oscuro' : 'Claro'}</p>
                                <p className="text-sm text-slate-400">Cambia entre modo claro y oscuro</p>
                            </div>
                            <button
                                onClick={() => {
                                    toggleTheme();
                                    toast.success(`Tema ${isDark ? 'claro' : 'oscuro'} activado`);
                                }}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-slate-700'}`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-7' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <ThemeCustomizer />
                    </div>

                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            Gestion de Datos
                        </h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Exporta tu informacion para tener una copia de seguridad segura o restaura una copia previa.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                <div>
                                    <p className="text-white font-medium">Exportar Copia de Seguridad</p>
                                    <p className="text-sm text-slate-500">Descarga un archivo encriptado .json</p>
                                </div>
                                <button
                                    data-testid="settings-open-export"
                                    onClick={() => setIsExportModalOpen(true)}
                                    className="flex items-center gap-2 text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-slate-600"
                                >
                                    <Upload className="w-4 h-4 rotate-180" />
                                    Exportar
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-red-900/10 rounded-xl border border-red-900/20">
                                <div>
                                    <p className="text-white font-medium">Restaurar Copia de Seguridad</p>
                                    <p className="text-sm text-slate-500">IMPORTANTE: Sobrescribe todos los datos actuales</p>
                                </div>
                                <button
                                    data-testid="settings-open-restore"
                                    onClick={() => setIsRestoreModalOpen(true)}
                                    className="flex items-center gap-2 text-red-100 bg-red-900/50 hover:bg-red-900/80 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/30"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Restaurar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'templates' ? (
                <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Files className="w-5 h-5 text-primary" />
                            Plantillas de credenciales
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Reutiliza estructuras de alta frecuentes para SaaS, VPN, tenants o equipos.
                        </p>
                    </div>

                    {templates.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center text-slate-500">
                            Todavia no hay plantillas guardadas.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">{template.name}</p>
                                        <p className="truncate text-sm text-slate-400">
                                            {template.title} · {template.username || 'Sin usuario'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => deleteTemplate(template.id)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-400" />
                            Historial de Cambios
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Registro de auditoria de todas las acciones sobre las contrasenas.
                        </p>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto">
                        {auditLogs.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Usuario</th>
                                        <th className="p-4">Accion</th>
                                        <th className="p-4">Elemento</th>
                                        <th className="p-4">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 text-slate-400 text-sm font-mono whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-white font-medium text-sm">
                                                {log.user}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-white text-sm">
                                                {log.target}
                                            </td>
                                            <td className="p-4 text-slate-500 text-sm italic">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No hay actividad registrada aun.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <ExportVaultModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
            <ImportVaultModal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} />
        </div>
    );
}
