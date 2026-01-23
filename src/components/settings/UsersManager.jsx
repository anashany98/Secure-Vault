import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Trash2, Key, User, Shield, RefreshCw, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resetModes, setResetModes] = useState({}); // { userId: boolean }
    const [newPasswords, setNewPasswords] = useState({}); // { userId: string }

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/auth/users');
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`¿Estás seguro de eliminar al usuario ${name}? Esta acción es irreversible.`)) return;

        try {
            await api.delete(`/auth/users/${id}`);
            toast.success('Usuario eliminado');
            fetchUsers();
        } catch (error) {
            toast.error('Error al eliminar usuario');
        }
    };

    const toggleResetMode = (id) => {
        setResetModes(prev => ({ ...prev, [id]: !prev[id] }));
        setNewPasswords(prev => ({ ...prev, [id]: '' }));
    };

    const handleResetPassword = async (id) => {
        const pwd = newPasswords[id];
        if (!pwd || pwd.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            await api.put(`/auth/users/${id}/reset-password`, { newPassword: pwd });
            toast.success('Contraseña restablecida');
            toggleResetMode(id);
        } catch (error) {
            toast.error('Error al restablecer contraseña');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando usuarios...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Usuarios del Sistema ({users.length})
                    </h3>
                    <button onClick={fetchUsers} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="divide-y divide-slate-700">
                    {users.map(user => (
                        <div key={user.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                        {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{user.name}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {resetModes[user.id] ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Nueva contraseña"
                                                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white w-32 focus:outline-none focus:border-primary"
                                                value={newPasswords[user.id] || ''}
                                                onChange={e => setNewPasswords(prev => ({ ...prev, [user.id]: e.target.value }))}
                                            />
                                            <button onClick={() => handleResetPassword(user.id)} className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => toggleResetMode(user.id)} className="p-1.5 bg-slate-700 text-slate-400 rounded hover:bg-slate-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleResetMode(user.id)}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Cambiar Contraseña"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                    )}

                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Eliminar Usuario"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
