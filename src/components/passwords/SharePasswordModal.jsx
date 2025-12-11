import { X, Share2, Clock, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { usePasswords } from '../../context/PasswordContext';
import { useAuth } from '../../context/AuthContext';

export default function SharePasswordModal({ isOpen, onClose, passwordItem }) {
    const { sharePassword, getPasswordShares, revokeShare } = usePasswords();
    const { usersList } = useAuth();
    const [selectedUser, setSelectedUser] = useState('');
    const [permission, setPermission] = useState('read');
    const [expiration, setExpiration] = useState('7d');

    if (!isOpen || !passwordItem) return null;

    const currentShares = getPasswordShares(passwordItem.id);
    const availableUsers = usersList.filter(u => u.email !== 'admin@company.com');

    const handleShare = () => {
        if (!selectedUser) {
            alert('Selecciona un usuario');
            return;
        }

        // Check if already shared with this user
        const existingShare = currentShares.find(s => s.sharedWith === selectedUser);
        if (existingShare) {
            alert('Ya has compartido esta contraseña con este usuario');
            return;
        }

        // Calculate expiration in milliseconds
        const expirationMap = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            'never': null
        };

        const expiresIn = expirationMap[expiration];

        const result = sharePassword(passwordItem.id, selectedUser, permission, expiresIn);

        if (result.success) {
            setSelectedUser('');
            setPermission('read');
            setExpiration('7d');
        }
    };

    const handleRevoke = (shareId) => {
        if (window.confirm('¿Revocar acceso a esta contraseña?')) {
            revokeShare(shareId);
        }
    };

    const getUserName = (userId) => {
        const user = usersList.find(u => u.id === userId);
        return user ? user.name : 'Usuario desconocido';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Share2 className="w-4 h-4 text-primary" />
                            </div>
                            Compartir Contraseña
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {passwordItem.title}
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
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Share Form */}
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 mb-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Nuevo Acceso Compartido
                        </h3>

                        <div className="space-y-4">
                            {/* User Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Usuario
                                </label>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Seleccionar usuario...</option>
                                    {availableUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Permission */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Permiso
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPermission('read')}
                                        className={`p-3 rounded-lg border transition-colors ${permission === 'read'
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        <Shield className="w-4 h-4 mx-auto mb-1" />
                                        <div className="text-sm font-medium">Solo Lectura</div>
                                    </button>
                                    <button
                                        onClick={() => setPermission('write')}
                                        className={`p-3 rounded-lg border transition-colors ${permission === 'write'
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        <Share2 className="w-4 h-4 mx-auto mb-1" />
                                        <div className="text-sm font-medium">Puede Editar</div>
                                    </button>
                                </div>
                            </div>

                            {/* Expiration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Expiración
                                </label>
                                <select
                                    value={expiration}
                                    onChange={(e) => setExpiration(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="24h">24 horas</option>
                                    <option value="7d">7 días</option>
                                    <option value="30d">30 días</option>
                                    <option value="never">Sin expiración</option>
                                </select>
                            </div>

                            <button
                                onClick={handleShare}
                                className="w-full bg-primary hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                Compartir Acceso
                            </button>
                        </div>
                    </div>

                    {/* Current Shares */}
                    <div>
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Accesos Activos ({currentShares.length})
                        </h3>

                        {currentShares.length === 0 ? (
                            <div className="text-center py-8 bg-slate-900/30 border border-slate-700 rounded-xl">
                                <Share2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">
                                    No has compartido esta contraseña aún
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentShares.map(share => (
                                    <div
                                        key={share.id}
                                        className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="text-white font-medium">
                                                {getUserName(share.sharedWith)}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${share.permission === 'write'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    <Shield className="w-3 h-3" />
                                                    {share.permission === 'write' ? 'Puede editar' : 'Solo lectura'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {share.expiresAt
                                                        ? `Expira ${new Date(share.expiresAt).toLocaleDateString()}`
                                                        : 'Sin expiración'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevoke(share.id)}
                                            className="text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors"
                                        >
                                            Revocar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-900/50">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <p>
                            💡 Los accesos expiran automáticamente
                        </p>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
