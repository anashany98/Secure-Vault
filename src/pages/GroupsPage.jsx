import { useState } from 'react';
import { Users, Plus, UserPlus, Trash2, Settings, Shield } from 'lucide-react';
import { useGroups } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const GroupsPage = () => {
    const { groups, createGroup, deleteGroup, addMember, removeMember, getGroupMembers } = useGroups();
    const { usersList, user: currentUser } = useAuth();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');

    const handleCreateGroup = (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        const newGroup = createGroup(newGroupName, newGroupDesc);
        setNewGroupName('');
        setNewGroupDesc('');
        setIsCreateModalOpen(false);
        setSelectedGroup(newGroup);
        toast.success('Grupo creado correctamente');
    };

    const handleDeleteGroup = (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este grupo?')) {
            deleteGroup(id);
            if (selectedGroup?.id === id) setSelectedGroup(null);
            toast.success('Grupo eliminado');
        }
    };

    const handleAddMember = (userId) => {
        if (!selectedGroup) return;
        addMember(selectedGroup.id, userId);
        toast.success('Miembro añadido');
    };

    const handleRemoveMember = (userId) => {
        if (!selectedGroup) return;
        removeMember(selectedGroup.id, userId);
        toast.success('Miembro eliminado');
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex gap-6">
            {/* Left Sidebar: Groups List */}
            <div className="w-1/3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Grupos
                    </h2>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Crear Grupo"
                    >
                        <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {groups.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <p className="text-sm text-gray-500">No hay grupos creados.</p>
                        </div>
                    ) : (
                        groups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => setSelectedGroup(group)}
                                className={`w-full text-left p-3 rounded-xl transition-all ${selectedGroup?.id === group.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                <div className="font-medium text-gray-900 dark:text-gray-100">{group.name}</div>
                                <div className="text-xs text-gray-500 truncate">{group.description || 'Sin descripción'}</div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Content: Group Details */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                {selectedGroup ? (
                    <>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup.name}</h2>
                                <p className="text-gray-500 dark:text-gray-400">{selectedGroup.description}</p>
                            </div>
                            <button
                                onClick={() => handleDeleteGroup(selectedGroup.id)}
                                className="px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                            >
                                Eliminar Grupo
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-gray-400" />
                                Miembros del Grupo
                            </h3>

                            <div className="space-y-2 mb-8">
                                {getGroupMembers(selectedGroup.id).map(member => {
                                    const memberUser = usersList.find(u => u.id === member.userId);
                                    if (!memberUser) return null;
                                    return (
                                        <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                                    {memberUser.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{memberUser.name}</div>
                                                    <div className="text-xs text-gray-500">{memberUser.email} • {member.role}</div>
                                                </div>
                                            </div>
                                            {member.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.userId)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Eliminar miembro"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-gray-400" />
                                Añadir Miembros
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {usersList
                                    .filter(u => !getGroupMembers(selectedGroup.id).some(m => m.userId === u.id))
                                    .map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleAddMember(user.id)}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                            <Plus className="w-4 h-4 text-gray-400 ml-auto" />
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <p>Selecciona un grupo para ver detalles</p>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200 p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Nuevo Grupo</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Crear Grupo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupsPage;
