import { useMemo } from 'react';
import { Shield, Key, Star, Trash2, Settings, LogOut, Package, Share2, StickyNote, Users, Tag, Activity, AlertTriangle, LockKeyhole } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertsContext';
import { usePasswords } from '../../context/PasswordContext';
import { useVaultSecurity } from '../../context/VaultSecurityContext';
import { useView } from '../../context/ViewContext';
import { cn } from '../../lib/utils';

const NavItem = ({ icon, label, active, onClick, badge, className, testId }) => {
    const Icon = icon;

    return (
        <button
            data-testid={testId}
            onClick={onClick}
            className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl transition-all group',
                'hover:bg-slate-800 text-slate-400 hover:text-white',
                active && 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary',
                className
            )}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium text-sm truncate">{label}</span>
            </div>
            {badge > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge}
                </span>
            )}
        </button>
    );
};

export default function Sidebar() {
    const { alerts } = useAlerts();
    const { passwords, filterTag, setFilterTag } = usePasswords();
    const { logout, user } = useAuth();
    const { lockVault } = useVaultSecurity();
    const { currentView, setCurrentView } = useView();

    const availableTags = useMemo(() => {
        const tagsSet = new Set();
        passwords.forEach((password) => {
            if (!Array.isArray(password.tags)) {
                return;
            }

            password.tags.forEach((tag) => {
                const value = typeof tag === 'string' ? tag : tag?.name;
                if (value) {
                    tagsSet.add(value);
                }
            });
        });

        return Array.from(tagsSet).sort();
    }, [passwords]);

    const selectView = (view) => {
        setCurrentView(view);
        setFilterTag(null);
    };

    const handleTagSelect = (tagName) => {
        setFilterTag(tagName);
        setCurrentView('all');
    };

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 overflow-hidden">
            <div className="p-6 pb-2 shrink-0">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">SecureVault</h1>
                </div>

                <nav className="space-y-1">
                    <NavItem
                        icon={AlertTriangle}
                        label="Pendientes"
                        testId="nav-inbox"
                        active={currentView === 'inbox'}
                        badge={alerts.length}
                        onClick={() => selectView('inbox')}
                    />
                    <NavItem
                        icon={Key}
                        label="Todas las contrasenas"
                        testId="nav-all-passwords"
                        active={currentView === 'all' && !filterTag}
                        onClick={() => selectView('all')}
                    />
                    <NavItem
                        icon={Star}
                        label="Favoritos"
                        testId="nav-favorites"
                        active={currentView === 'favorites'}
                        onClick={() => selectView('favorites')}
                    />
                    <NavItem
                        icon={Share2}
                        label="Compartidas"
                        testId="nav-shared"
                        active={currentView === 'shared'}
                        onClick={() => selectView('shared')}
                    />
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
                <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <span>Etiquetas</span>
                </div>
                <div className="space-y-0.5 max-h-40 overflow-y-auto px-2 mb-6">
                    {availableTags.map((tagName) => (
                        <button
                            key={tagName}
                            onClick={() => handleTagSelect(tagName)}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                                filterTag === tagName ? 'bg-primary/10 text-primary font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            )}
                        >
                            <Tag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{tagName}</span>
                        </button>
                    ))}
                    {availableTags.length === 0 && (
                        <p className="px-3 text-[10px] text-slate-600 italic">Sin etiquetas</p>
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    <span>Organizacion</span>
                </div>
                <nav className="space-y-1">
                    <NavItem
                        icon={StickyNote}
                        label="Notas Seguras"
                        testId="nav-notes"
                        active={currentView === 'notes'}
                        onClick={() => selectView('notes')}
                    />
                    {user?.role === 'admin' && (
                        <NavItem
                            icon={Users}
                            label="Grupos"
                            testId="nav-groups"
                            active={currentView === 'groups'}
                            onClick={() => selectView('groups')}
                        />
                    )}
                    {user?.role === 'admin' && (
                        <NavItem
                            icon={Package}
                            label="Inventario"
                            testId="nav-inventory"
                            active={currentView === 'inventory'}
                            onClick={() => selectView('inventory')}
                        />
                    )}
                </nav>
            </div>

            <div className="p-4 border-t border-slate-800 space-y-1 bg-slate-900 z-10">
                <NavItem
                    icon={Trash2}
                    label="Papelera"
                    testId="nav-trash"
                    active={currentView === 'trash'}
                    onClick={() => selectView('trash')}
                />
                <NavItem
                    icon={Settings}
                    label="Ajustes"
                    testId="nav-settings"
                    active={currentView === 'settings'}
                    onClick={() => selectView('settings')}
                />
                <NavItem
                    icon={Activity}
                    label="Sesiones"
                    testId="nav-sessions"
                    active={currentView === 'sessions'}
                    onClick={() => selectView('sessions')}
                />
                <NavItem
                    icon={LockKeyhole}
                    label="Bloquear Boveda"
                    testId="nav-lock-vault"
                    onClick={lockVault}
                />
                <NavItem
                    icon={LogOut}
                    label="Cerrar Sesion"
                    testId="nav-logout"
                    onClick={logout}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                />
            </div>
        </aside>
    );
}
