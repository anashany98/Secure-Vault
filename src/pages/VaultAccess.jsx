import { useState } from 'react';
import { Clock3, KeyRound, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useVaultSecurity } from '../context/VaultSecurityContext';

export default function VaultAccess() {
    const { user } = useAuth();
    const {
        acceptTeamVaultInvitation,
        awaitingTeamVaultAccess,
        isVaultLocked,
        logout,
        requiresTeamVaultInvitation,
        requiresVaultMigration,
        requiresVaultSetup,
        setupMasterPassword,
        unlockVault,
        vaultAccess,
    } = useVaultSecurity();
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [invitationSecret, setInvitationSecret] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isSetupMode = requiresVaultSetup && !isVaultLocked;
    const isInvitationMode = requiresTeamVaultInvitation && !isVaultLocked;
    const isUnlockMode = isVaultLocked;
    const isWaitingMode = awaitingTeamVaultAccess && !isVaultLocked;

    const title = isSetupMode
        ? 'Inicializa la Boveda del Equipo'
        : isInvitationMode
            ? 'Acepta la Invitacion de la Boveda'
            : isWaitingMode
                ? 'Esperando Acceso a la Boveda'
                : 'Desbloquea la Boveda';

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (isSetupMode) {
                if (masterPassword !== confirmPassword) {
                    setError('Las master passwords no coinciden');
                    return;
                }

                const result = await setupMasterPassword(masterPassword);
                if (!result.success) {
                    setError(result.error);
                }
                return;
            }

            if (isInvitationMode) {
                if (masterPassword !== confirmPassword) {
                    setError('Las master passwords no coinciden');
                    return;
                }

                const result = await acceptTeamVaultInvitation({
                    invitationSecret,
                    masterPassword,
                });
                if (!result.success) {
                    setError(result.error);
                }
                return;
            }

            const result = await unlockVault(masterPassword);
            if (!result.success) {
                setError(result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
            <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[100px]" />

            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-surface/50 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/20">
                        {isSetupMode ? (
                            <Users className="h-10 w-10 text-white" />
                        ) : isInvitationMode ? (
                            <KeyRound className="h-10 w-10 text-white" />
                        ) : isWaitingMode ? (
                            <Clock3 className="h-10 w-10 text-white" />
                        ) : (
                            <LockKeyhole className="h-10 w-10 text-white" />
                        )}
                    </div>
                    <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold text-transparent">
                        {title}
                    </h1>
                    <p className="mt-3 text-slate-400">
                        Sesion iniciada como <strong>{user?.email}</strong>.
                        {isSetupMode
                            ? ' Vas a crear la clave compartida de la boveda del equipo y envolverla con tu master password.'
                            : isInvitationMode
                                ? ' Tu codigo de invitacion descifra la clave del equipo y tu master password la envuelve para este navegador y esta cuenta.'
                                : isWaitingMode
                                    ? ' Esta cuenta aun no tiene una copia envuelta de la team vault. Un administrador debe provisionarla.'
                                    : ' La sesion web sigue activa, pero las claves locales estan bloqueadas.'}
                    </p>
                </div>

                <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-slate-200">
                    <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {isSetupMode
                            ? 'Clave compartida del equipo'
                            : isInvitationMode
                                ? 'Provision de acceso por usuario'
                                : isWaitingMode
                                    ? 'Acceso pendiente'
                                    : (vaultAccess?.needsTeamBootstrap
                                        ? 'Bootstrap de team vault'
                                        : 'Desbloqueo local')}
                    </div>
                    <p>
                        {isSetupMode
                            ? 'La primera configuracion inicializa una sola boveda compartida para el equipo. Cada usuario la desbloqueara con su propia master password.'
                            : isInvitationMode
                                ? 'El servidor no ve la clave compartida en claro. Solo almacena una invitacion cifrada y tu copia envuelta.'
                                : isWaitingMode
                                    ? 'Pide a un administrador que genere una invitacion desde Usuarios. Cuando exista, esta pantalla cambiara a modo aceptacion.'
                                    : (vaultAccess?.needsTeamBootstrap
                                        ? 'Esta cuenta ya tenia claves envueltas del esquema anterior. Al desbloquear, se promoveran como clave compartida del equipo.'
                                        : 'El backend ya no te entrega claves en claro. El desbloqueo ocurre en este navegador con tu master password.')}
                    </p>
                    {requiresVaultMigration && (
                        <p className="mt-3 text-amber-300">
                            Esta cuenta tiene datos legados que se migraran al esquema compartido al completar el proceso.
                        </p>
                    )}
                    {isInvitationMode && vaultAccess?.pendingInvitation?.createdBy?.name && (
                        <p className="mt-3 text-slate-300">
                            Invitacion creada por <strong>{vaultAccess.pendingInvitation.createdBy.name}</strong>
                            {vaultAccess.pendingInvitation.expiresAt && (
                                <> hasta <strong>{new Date(vaultAccess.pendingInvitation.expiresAt).toLocaleString()}</strong></>
                            )}
                            .
                        </p>
                    )}
                </div>

                {isWaitingMode ? (
                    <>
                        {vaultAccess?.legacyPersonalVault && (
                            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
                                Esta cuenta conserva material criptografico personal del esquema anterior. Provisiona el acceso del equipo solo cuando ya no dependa de esa vault personal.
                            </div>
                        )}

                        <button
                            data-testid="vault-access-logout"
                            type="button"
                            onClick={logout}
                            className="w-full rounded-xl border border-slate-700 py-3 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                        >
                            Cerrar sesion
                        </button>
                    </>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isInvitationMode && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Codigo de invitacion
                                </label>
                                <input
                                    data-testid="vault-invitation-secret"
                                    type="password"
                                    autoFocus
                                    value={invitationSecret}
                                    onChange={(event) => setInvitationSecret(event.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Pega el codigo entregado por el administrador"
                                />
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                {isUnlockMode ? 'Master password' : 'Nueva master password'}
                            </label>
                            <input
                                data-testid={isUnlockMode ? 'vault-unlock-password' : 'vault-master-password'}
                                type="password"
                                autoFocus={!isInvitationMode}
                                value={masterPassword}
                                onChange={(event) => setMasterPassword(event.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Introduce una master password robusta"
                            />
                        </div>

                        {!isUnlockMode && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Confirmar master password
                                </label>
                                <input
                                    data-testid="vault-master-password-confirm"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Repite la master password"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-sm text-danger">
                                {error}
                            </div>
                        )}

                        <button
                            data-testid={isUnlockMode ? 'vault-unlock-submit' : 'vault-master-submit'}
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting
                                ? (isUnlockMode ? 'Desbloqueando...' : 'Procesando...')
                                : (isSetupMode
                                    ? (requiresVaultMigration ? 'Inicializar y migrar' : 'Inicializar boveda de equipo')
                                    : isInvitationMode
                                        ? 'Aceptar invitacion y configurar acceso'
                                        : 'Desbloquear boveda')}
                        </button>
                    </form>
                )}

                <button
                    data-testid="vault-access-logout"
                    type="button"
                    onClick={logout}
                    className="mt-4 w-full text-sm text-slate-400 transition-colors hover:text-white"
                >
                    Cerrar sesion
                </button>
            </div>
        </div>
    );
}
