import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { User, Plus, Trash2, Shield, Mail, Lock, Activity, Clock, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePasswords } from '../context/PasswordContext';
import { useTheme } from '../context/ThemeContext';
import ThemeCustomizer from '../components/settings/ThemeCustomizer';
import toast from 'react-hot-toast';

export default function Settings() {
    const { usersList, register, deleteUser, user: currentUser } = useAuth();
    const { auditLog } = usePasswords();
    const { theme, toggleTheme, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'activity', 'preferences'
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name || !formData.email || !formData.password) {
            setError('Todos los campos son obligatorios');
            return;
        }

        const res = register(formData);
        if (res.success) {
            setSuccess('Usuario creado correctamente');
            setFormData({ name: '', email: '', password: '' });
            setTimeout(() => setSuccess(''), 3000);
        } else {
            setError(res.error);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            const res = deleteUser(id);
            if (!res.success) {
                alert(res.error);
            }
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'text-emerald-400 bg-emerald-500/10';
            case 'DELETE': return 'text-red-400 bg-red-500/10';
            case 'UPDATE': return 'text-amber-400 bg-amber-500/10';
            default: return 'text-blue-400 bg-blue-500/10';
        }
    };

    return (
        <Layout>
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Ajustes del Sistema</h1>
                    <p className="text-slate-400">Panel de control de administración</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-700 mb-8">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb - 3 px - 4 text - sm font - bold transition - colors border - b - 2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'} `}
                >
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Usuarios
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`pb - 3 px - 4 text - sm font - bold transition - colors border - b - 2 ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'} `}
                >
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Actividad
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('preferences')}
                    className={`pb - 3 px - 4 text - sm font - bold transition - colors border - b - 2 ${activeTab === 'preferences' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'} `}
                >
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Preferencias
                    </div>
                </button>
            </div>

            {activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Create User Form */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Crear Nuevo Acceso
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                                        placeholder="Ej. Ana García"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                                        placeholder="ana@empresa.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Contraseña Temporal</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary/50"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-danger text-sm">{error}</p>}
                            {success && <p className="text-primary text-sm">{success}</p>}

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Crear Usuario
                            </button>
                        </form>
                    </div>

                    {/* User List */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-secondary" />
                            Usuarios Activos
                        </h2>

                        <div className="space-y-4">
                            {usersList.map(user => (
                                <div key={user.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w - 10 h - 10 rounded - full flex items - center justify - center font - bold text - lg ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'} `}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium flex items-center gap-2">
                                                {user.name}
                                                {user.id === currentUser?.id && <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">TÚ</span>}
                                            </p>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                        </div>
                                    </div>

                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 text-slate-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar usuario"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'preferences' ? (
                <div className="space-y-6">
                    {/* Dark Mode Toggle */}
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
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-slate-700'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Theme Customizer */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <ThemeCustomizer />
                    </div>

                    {/* Auto-logout */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Auto-logout por Inactividad
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Cierra sesión automáticamente después de un período de inactividad
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
                                    // Force re-render to update the display value
                                    window.dispatchEvent(new Event('storage'));
                                }}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-sm text-blue-400">
                                    💡 El auto-logout está activado. Cualquier acción (mover el mouse, hacer click, etc.) reinicia el contador.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-400" />
                            Historial de Cambios
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Registro de auditoría de todas las acciones sobre las contraseñas.
                        </p>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto">
                        {auditLog && auditLog.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Usuario</th>
                                        <th className="p-4">Acción</th>
                                        <th className="p-4">Elemento</th>
                                        <th className="p-4">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {auditLog.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 text-slate-400 text-sm font-mono whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-white font-medium text-sm">
                                                {log.user}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px - 2 py - 1 rounded text - [10px] font - bold uppercase ${getActionColor(log.action)} `}>
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
                                <p>No hay actividad registrada aún.</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </Layout >
    );
}
