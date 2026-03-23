import { useEffect, useMemo, useState } from 'react';
import { Check, Key, RefreshCw, Shield, Trash2, User, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../../lib/api';
import { getNotesKey, getVaultKey } from '../../lib/env';
import { encryptStringWithKey } from '../../lib/secretCrypto';

const TEAM_INVITATION_CHECK = 'securevault:team-vault-invitation:v1';

const EMPTY_USER_FORM = {
    email: '',
    name: '',
    password: '',
    role: 'user',
};

const EMPTY_TRANSFER_FORM = {
    fromUserId: '',
    toUserId: '',
    transferDeviceAssignments: false,
};

function SummaryCard({ label, value }) {
    return (
        <div className="rounded-lg bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
            {label}: <strong>{value}</strong>
        </div>
    );
}

export default function UsersManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUser, setNewUser] = useState(EMPTY_USER_FORM);
    const [resetModes, setResetModes] = useState({});
    const [newPasswords, setNewPasswords] = useState({});
    const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER_FORM);
    const [ownershipSummary, setOwnershipSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [lastTransferResult, setLastTransferResult] = useState(null);
    const [isProvisioningVault, setIsProvisioningVault] = useState(false);
    const [lastVaultInvitation, setLastVaultInvitation] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const sourceUser = useMemo(
        () => users.find((user) => user.id === transferForm.fromUserId) || null,
        [transferForm.fromUserId, users]
    );
    const targetUser = useMemo(
        () => users.find((user) => user.id === transferForm.toUserId) || null,
        [transferForm.toUserId, users]
    );

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/auth/users');
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (event) => {
        event.preventDefault();

        if (!newUser.name || !newUser.email || !newUser.password) {
            toast.error('Nombre, email y contrasena son obligatorios');
            return;
        }

        if (newUser.password.length < 8) {
            toast.error('La contrasena debe tener al menos 8 caracteres');
            return;
        }

        try {
            await api.post('/auth/register', newUser);
            toast.success('Usuario creado');
            setNewUser(EMPTY_USER_FORM);
            await fetchUsers();
        } catch (error) {
            toast.error(error.message || 'Error al crear usuario');
        }
    };

    const handleDelete = async (id, name) => {
        const confirmed = window.confirm(
            `Seguro que quieres eliminar al usuario ${name}? Esta accion es irreversible.`
        );
        if (!confirmed) {
            return;
        }

        try {
            await api.delete(`/auth/users/${id}`);
            toast.success('Usuario eliminado');
            await fetchUsers();
        } catch (error) {
            toast.error(error.message || 'Error al eliminar usuario');
        }
    };

    const toggleResetMode = (id) => {
        setResetModes((previous) => ({ ...previous, [id]: !previous[id] }));
        setNewPasswords((previous) => ({ ...previous, [id]: '' }));
    };

    const handleResetPassword = async (id) => {
        const password = newPasswords[id];
        if (!password || password.length < 8) {
            toast.error('La contrasena debe tener al menos 8 caracteres');
            return;
        }

        try {
            await api.put(`/auth/users/${id}/reset-password`, { newPassword: password });
            toast.success('Contrasena restablecida');
            toggleResetMode(id);
        } catch (error) {
            toast.error(error.message || 'Error al restablecer contrasena');
        }
    };

    const fetchOwnershipSummary = async (userId) => {
        if (!userId) {
            setOwnershipSummary(null);
            return;
        }

        try {
            setLoadingSummary(true);
            const data = await api.get(`/auth/users/${userId}/ownership-summary`);
            setOwnershipSummary(data);
        } catch (error) {
            setOwnershipSummary(null);
            toast.error(error.message || 'No se pudo cargar el resumen de ownership');
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleTransferOwnership = async () => {
        if (!transferForm.fromUserId || !transferForm.toUserId) {
            toast.error('Selecciona usuario origen y destino');
            return;
        }

        if (transferForm.fromUserId === transferForm.toUserId) {
            toast.error('El usuario origen y destino deben ser distintos');
            return;
        }

        const confirmed = window.confirm(
            'Se transferiran credenciales, notas, plantillas, shares y grupos creados. Continuar?'
        );
        if (!confirmed) {
            return;
        }

        try {
            setIsTransferring(true);
            const result = await api.post('/auth/users/transfer-ownership', transferForm);
            setLastTransferResult(result);
            toast.success(`Ownership transferido a ${result.toUser.name}`);
            setTransferForm(EMPTY_TRANSFER_FORM);
            setOwnershipSummary(null);
            await fetchUsers();
        } catch (error) {
            toast.error(error.message || 'No se pudo transferir el ownership');
        } finally {
            setIsTransferring(false);
        }
    };

    const buildInvitationSecret = () => {
        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
            const bytes = new Uint8Array(24);
            window.crypto.getRandomValues(bytes);
            return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Codigo copiado');
        } catch {
            toast.error('No se pudo copiar automaticamente');
        }
    };

    const handleProvisionVaultAccess = async (targetUser) => {
        try {
            setIsProvisioningVault(true);
            const invitationSecret = buildInvitationSecret();
            const response = await api.post('/auth/team-vault/invitations', {
                encryptedNotesKey: encryptStringWithKey(getNotesKey(), invitationSecret),
                encryptedVerifier: encryptStringWithKey(TEAM_INVITATION_CHECK, invitationSecret),
                encryptedVaultKey: encryptStringWithKey(getVaultKey(), invitationSecret),
                expiresAt: new Date(Date.now() + (72 * 60 * 60 * 1000)).toISOString(),
                targetUserId: targetUser.id,
            });

            setLastVaultInvitation({
                code: invitationSecret,
                expiresAt: response.expiresAt,
                targetUser,
            });
            await fetchUsers();
            toast.success(`Acceso a boveda provisionado para ${targetUser.name}`);
        } catch (error) {
            toast.error(error.message || 'No se pudo provisionar el acceso a la boveda');
        } finally {
            setIsProvisioningVault(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando usuarios...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-surface">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Alta de usuarios
                    </h3>
                    <button
                        onClick={() => setIsCreatingUser((previous) => !previous)}
                        className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700"
                    >
                        {isCreatingUser ? 'Ocultar' : 'Nuevo usuario'}
                    </button>
                </div>

                {isCreatingUser && (
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                        <input
                            type="text"
                            placeholder="Nombre completo"
                            value={newUser.name}
                            onChange={(event) => setNewUser((previous) => ({ ...previous, name: event.target.value }))}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={(event) => setNewUser((previous) => ({ ...previous, email: event.target.value }))}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                        />
                        <input
                            type="password"
                            placeholder="Contrasena temporal"
                            value={newUser.password}
                            onChange={(event) => setNewUser((previous) => ({ ...previous, password: event.target.value }))}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                        />
                        <select
                            value={newUser.role}
                            onChange={(event) => setNewUser((previous) => ({ ...previous, role: event.target.value }))}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                        >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                        </select>
                        <div className="flex justify-end md:col-span-2">
                            <button
                                type="submit"
                                className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary/90"
                            >
                                Crear usuario
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700 bg-surface">
                <div className="border-b border-slate-700 bg-slate-900/50 p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        Transferencia de ownership
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                        Reasigna en bloque credenciales, notas, plantillas, shares creados y grupos.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-400">Usuario origen</label>
                        <select
                            value={transferForm.fromUserId}
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setTransferForm((previous) => ({
                                    ...previous,
                                    fromUserId: nextValue,
                                    toUserId: previous.toUserId === nextValue ? '' : previous.toUserId,
                                }));
                                setLastTransferResult(null);
                                fetchOwnershipSummary(nextValue);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                        >
                            <option value="">Seleccionar origen...</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} · {user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm text-slate-400">Usuario destino</label>
                        <select
                            value={transferForm.toUserId}
                            onChange={(event) => {
                                setTransferForm((previous) => ({
                                    ...previous,
                                    toUserId: event.target.value,
                                }));
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                        >
                            <option value="">Seleccionar destino...</option>
                            {users
                                .filter((user) => user.id !== transferForm.fromUserId)
                                .map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} · {user.email}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
                        <input
                            type="checkbox"
                            checked={transferForm.transferDeviceAssignments}
                            onChange={(event) =>
                                setTransferForm((previous) => ({
                                    ...previous,
                                    transferDeviceAssignments: event.target.checked,
                                }))
                            }
                        />
                        Transferir tambien asignaciones de inventario que coincidan por nombre o email
                    </label>
                </div>

                {(loadingSummary || ownershipSummary) && (
                    <div className="px-4 pb-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {sourceUser
                                            ? `Resumen de ${sourceUser.name}`
                                            : 'Resumen a transferir'}
                                    </p>
                                    {targetUser && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Destino: {targetUser.name} · {targetUser.email}
                                        </p>
                                    )}
                                </div>
                                {loadingSummary && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
                            </div>

                            {ownershipSummary && (
                                <>
                                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                                        <SummaryCard label="Credenciales" value={ownershipSummary.vaultItems} />
                                        <SummaryCard label="Notas" value={ownershipSummary.notes} />
                                        <SummaryCard label="Plantillas" value={ownershipSummary.templates} />
                                        <SummaryCard label="Shares" value={ownershipSummary.outgoingShares} />
                                        <SummaryCard label="Grupos" value={ownershipSummary.groupsCreated} />
                                        <SummaryCard label="Activos" value={ownershipSummary.deviceAssignments} />
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={isTransferring || !targetUser}
                                            onClick={handleTransferOwnership}
                                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isTransferring && <RefreshCw className="h-4 w-4 animate-spin" />}
                                            Transferir ownership
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {lastTransferResult && (
                    <div className="border-t border-slate-700 bg-emerald-500/5 px-4 py-4">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                            <p className="text-sm font-semibold text-emerald-300">
                                Transferencia completada
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                                {lastTransferResult.fromUser.name} ahora pertenece a {lastTransferResult.toUser.name}.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                                <SummaryCard label="Credenciales" value={lastTransferResult.transferred.vaultItems} />
                                <SummaryCard label="Notas" value={lastTransferResult.transferred.notes} />
                                <SummaryCard label="Plantillas" value={lastTransferResult.transferred.templates} />
                                <SummaryCard label="Shares" value={lastTransferResult.transferred.outgoingShares} />
                                <SummaryCard label="Grupos" value={lastTransferResult.transferred.groupsCreated} />
                                <SummaryCard label="Activos" value={lastTransferResult.transferred.deviceAssignments} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700 bg-surface">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                        <User className="h-5 w-5 text-primary" />
                        Usuarios del sistema ({users.length})
                    </h3>
                    <button
                        onClick={fetchUsers}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>

                <div className="divide-y divide-slate-700">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            data-testid={`users-row-${user.id}`}
                            className="p-4 transition-colors hover:bg-slate-800/30"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                            user.role === 'admin'
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : 'bg-slate-700 text-slate-400'
                                        }`}
                                    >
                                        {user.role === 'admin'
                                            ? <Shield className="h-5 w-5" />
                                            : <User className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{user.name}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs ${
                                                user.role === 'admin'
                                                    ? 'bg-purple-500/10 text-purple-400'
                                                    : 'bg-slate-700 text-slate-400'
                                            }`}
                                        >
                                            {user.role}
                                        </span>
                                        <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                                            <span
                                                className={`rounded-full px-2 py-0.5 ${
                                                    user.two_factor_enabled
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-amber-500/10 text-amber-400'
                                                }`}
                                            >
                                                {user.two_factor_enabled ? '2FA activo' : '2FA inactivo'}
                                            </span>
                                            {user.two_factor_required && !user.two_factor_enabled && (
                                                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-400">
                                                    Obligatorio pendiente
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full px-2 py-0.5 ${
                                                    user.vaultAccess?.isConfigured
                                                        ? 'bg-blue-500/10 text-blue-300'
                                                        : user.vaultAccess?.invitationPending
                                                            ? 'bg-amber-500/10 text-amber-300'
                                                            : 'bg-slate-700 text-slate-400'
                                                }`}
                                            >
                                                {user.vaultAccess?.isConfigured
                                                    ? 'Team vault activo'
                                                    : user.vaultAccess?.invitationPending
                                                        ? 'Invitacion pendiente'
                                                        : 'Sin acceso a boveda'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!user.vaultAccess?.isConfigured && (
                                        <button
                                            data-testid={`users-provision-vault-${user.id}`}
                                            onClick={() => handleProvisionVaultAccess(user)}
                                            disabled={isProvisioningVault}
                                            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            title="Provisionar acceso a la boveda del equipo"
                                        >
                                            {user.vaultAccess?.invitationPending ? 'Regenerar acceso' : 'Dar acceso'}
                                        </button>
                                    )}
                                    {resetModes[user.id] ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nueva contrasena"
                                                className="w-40 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white focus:border-primary focus:outline-none"
                                                value={newPasswords[user.id] || ''}
                                                onChange={(event) =>
                                                    setNewPasswords((previous) => ({
                                                        ...previous,
                                                        [user.id]: event.target.value,
                                                    }))
                                                }
                                            />
                                            <button
                                                onClick={() => handleResetPassword(user.id)}
                                                className="rounded bg-green-500/20 p-1.5 text-green-500 hover:bg-green-500/30"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleResetMode(user.id)}
                                                className="rounded bg-slate-700 p-1.5 text-slate-400 hover:bg-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleResetMode(user.id)}
                                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                                            title="Cambiar contrasena"
                                        >
                                            <Key className="h-4 w-4" />
                                        </button>
                                    )}

                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                            title="Eliminar usuario"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {lastVaultInvitation && (
                    <div className="border-t border-slate-700 bg-blue-500/5 px-4 py-4">
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                            <p className="text-sm font-semibold text-blue-200">
                                Invitacion generada para {lastVaultInvitation.targetUser.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                                Entrega este codigo fuera de banda. Caduca el{' '}
                                <strong>
                                    {lastVaultInvitation.expiresAt
                                        ? new Date(lastVaultInvitation.expiresAt).toLocaleString()
                                        : 'sin fecha'}
                                </strong>
                                .
                            </p>
                            <div
                                data-testid="users-vault-invitation-code"
                                className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-xs text-slate-200 break-all"
                            >
                                {lastVaultInvitation.code}
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => copyText(lastVaultInvitation.code)}
                                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700"
                                >
                                    Copiar codigo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
