import { Shield, Key, Star, Trash2, Settings, LogOut, Package, Share2, Keyboard, FileText, Activity } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import { cn } from '../../lib/utils';
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal';

const NavItem = ({ icon: Icon, label, active, onClick, className }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            "hover:bg-slate-800 text-slate-400 hover:text-white",
            active && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
            className
        )}
    >
        <Icon className="w-5 h-5" />
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default function Sidebar() {
    const { logout } = useAuth();
    const { currentView, setCurrentView } = useView();
    const [showShortcuts, setShowShortcuts] = useState(false);

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white">SecureVault</h1>
                </div>

                <nav className="space-y-2">
                    <NavItem
                        icon={Key}
                        label="Contraseñas"
                        active={currentView === 'all'}
                        onClick={() => setCurrentView('all')}
                    />
                    <NavItem
                        icon={Package}
                        label="Inventario"
                        active={currentView === 'inventory'}
                        onClick={() => setCurrentView('inventory')}
                    />
                    <NavItem
                        icon={Shield}
                        label="Seguridad"
                        active={currentView === 'security'}
                        onClick={() => setCurrentView('security')}
                    />
                    <NavItem
                        icon={FileText}
                        label="Auditoría"
                        active={currentView === 'audit'}
                        onClick={() => setCurrentView('audit')}
                    />
                    <NavItem
                        icon={Activity}
                        label="Estadísticas"
                        active={currentView === 'usage'}
                        onClick={() => setCurrentView('usage')}
                    />
                    <NavItem
                        icon={Star}
                        label="Favoritos"
                        active={currentView === 'favorites'}
                        onClick={() => setCurrentView('favorites')}
                    />
                    <NavItem
                        icon={Share2}
                        label="Compartidas Conmigo"
                        active={currentView === 'shared'}
                        onClick={() => setCurrentView('shared')}
                    />
                    <NavItem
                        icon={Trash2}
                        label="Papelera"
                        active={currentView === 'trash'}
                        onClick={() => setCurrentView('trash')}
                    />
                </nav>
            </div>

            <div className="mt-auto p-6 space-y-2">
                <NavItem
                    icon={Keyboard}
                    label="Atajos de Teclado"
                    onClick={() => setShowShortcuts(true)}
                />
                <NavItem
                    icon={Settings}
                    label="Ajustes"
                    active={currentView === 'settings'}
                    onClick={() => setCurrentView('settings')}
                />
                <div className="h-px bg-slate-800 my-4" />
                <NavItem
                    icon={LogOut}
                    label="Cerrar Sesión"
                    onClick={logout}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                />
            </div>

            <KeyboardShortcutsModal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
            />
        </aside>
    );
}
