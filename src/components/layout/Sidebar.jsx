import { Shield, Key, Star, Trash2, Settings, LogOut, Package, Share2, FileText, StickyNote, Users, Folder, ChevronRight, ChevronDown, Plus, Edit, Tag, Activity } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import { useFolders } from '../../context/FolderContext';
import { usePasswords } from '../../context/PasswordContext';
import { cn } from '../../lib/utils';
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal';
import AddFolderModal from '../folders/AddFolderModal';
import RenameFolderModal from '../folders/RenameFolderModal';

const NavItem = ({ icon: Icon, label, active, onClick, className, actions }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl transition-all group",
            "hover:bg-slate-800 text-slate-400 hover:text-white",
            active && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
            className
        )}
    >
        <div className="flex items-center gap-3 overflow-hidden">
            <Icon className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm truncate">{label}</span>
        </div>
        {actions && <div className="flex items-center">{actions}</div>}
    </button>
);

const FolderItem = ({ folder, level = 0, isActive, onSelect, onAddSubfolder, onRename }) => {
    const { getSubfolders, deleteFolder } = useFolders();
    const [isExpanded, setIsExpanded] = useState(false);
    const subfolders = getSubfolders(folder.id);
    const hasChildren = subfolders.length > 0;

    const handleExpandInfo = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm(`¿Estás seguro de que quieres eliminar la carpeta "${folder.name}"?`)) {
            deleteFolder(folder.id);
        }
    };

    return (
        <div>
            <button
                onClick={() => onSelect(folder.id)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors group text-sm",
                    isActive ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
                style={{ paddingLeft: `${(level * 12) + 16}px` }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {hasChildren ? (
                        <div
                            onClick={handleExpandInfo}
                            className="p-0.5 hover:bg-slate-700 rounded cursor-pointer"
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                    ) : (
                        <div className="w-4" />
                    )}
                    <Folder className={cn("w-4 h-4 shrink-0", isActive ? "fill-blue-400/20" : "")} />
                    <span className="truncate">{folder.name}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddSubfolder(folder.id);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-all"
                        title="Crear subcarpeta"
                    >
                        <Plus className="w-3 h-3" />
                    </div>
                    {folder.id !== 'root' && (
                        <>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRename(folder);
                                }}
                                className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-all"
                                title="Renombrar carpeta"
                            >
                                <Edit className="w-3 h-3" />
                            </div>
                            <div
                                onClick={handleDelete}
                                className="p-1 hover:bg-red-900/30 rounded text-slate-500 hover:text-red-400 transition-all"
                                title="Eliminar carpeta"
                            >
                                <Trash2 className="w-3 h-3" />
                            </div>
                        </>
                    )}
                </div>
            </button>

            {isExpanded && subfolders.map(sub => (
                <FolderItem
                    key={sub.id}
                    folder={sub}
                    level={level + 1}
                    isActive={isActive && isActive === sub.id}
                    onSelect={onSelect}
                    onAddSubfolder={onAddSubfolder}
                    onRename={onRename}
                />
            ))}
        </div>
    );
};

export default function Sidebar() {
    const { passwords, filterTag, setFilterTag } = usePasswords();
    const { logout } = useAuth();
    const { currentView, setCurrentView, activeFolderId, setActiveFolderId } = useView();
    const { getSubfolders } = useFolders();
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Add Folder Modal State
    const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
    const [targetParentId, setTargetParentId] = useState('root');

    // Rename Folder Modal State
    const [renameModal, setRenameModal] = useState({ isOpen: false, folderId: null, currentName: '' });

    const rootFolders = getSubfolders('root');

    // Calculate unique tags
    const availableTags = useMemo(() => {
        const tagsSet = new Set();
        passwords.forEach(p => {
            if (p.tags && Array.isArray(p.tags)) {
                p.tags.forEach(t => tagsSet.add(t.name));
            }
        });
        return Array.from(tagsSet).sort();
    }, [passwords]);

    const handleTagSelect = (tagName) => {
        setFilterTag(tagName);
        setCurrentView('all'); // Go to main vault to see tagged items
    };

    const handleFolderSelect = (folderId) => {
        setCurrentView('folder');
        setActiveFolderId(folderId);
        setFilterTag(null); // Clear tag filter when entering folder
    };

    const openAddFolder = (parentId = 'root') => {
        setTargetParentId(parentId);
        setIsAddFolderOpen(true);
    };

    return (
        <>
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
                            icon={Key}
                            label="Todas las contraseñas"
                            active={currentView === 'all' && !filterTag}
                            onClick={() => {
                                setCurrentView('all');
                                setFilterTag(null);
                            }}
                        />
                        <NavItem
                            icon={Star}
                            label="Favoritos"
                            active={currentView === 'favorites'}
                            onClick={() => {
                                setCurrentView('favorites');
                                setFilterTag(null);
                            }}
                        />
                        <NavItem
                            icon={Share2}
                            label="Compartidas"
                            active={currentView === 'shared'}
                            onClick={() => {
                                setCurrentView('shared');
                                setFilterTag(null);
                            }}
                        />
                    </nav>
                </div>

                {/* Main scrollable section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
                    {/* Folders Section */}
                    <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 group">
                        <span>Carpetas</span>
                        <button
                            onClick={() => openAddFolder('root')}
                            className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
                            title="Nueva carpeta raíz"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-0.5 mb-6">
                        {rootFolders.map(folder => (
                            <FolderItem
                                key={folder.id}
                                folder={folder}
                                isActive={currentView === 'folder' && activeFolderId === folder.id}
                                onSelect={handleFolderSelect}
                                onAddSubfolder={openAddFolder}
                                onRename={(folder) => setRenameModal({ isOpen: true, folderId: folder.id, currentName: folder.name })}
                            />
                        ))}
                        {rootFolders.length === 0 && (
                            <div className="px-4 py-4 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg mx-2">
                                Sin carpetas
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Etiquetas</span>
                    </div>
                    <div className="space-y-0.5 max-h-40 overflow-y-auto px-2 mb-6">
                        {availableTags.map(tagName => (
                            <button
                                key={tagName}
                                onClick={() => handleTagSelect(tagName)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                                    filterTag === tagName ? "bg-primary/10 text-primary font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
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

                    {/* Organization Section */}
                    <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Organización</span>
                    </div>
                    <nav className="space-y-1">
                        <NavItem
                            icon={StickyNote}
                            label="Notas Seguras"
                            active={currentView === 'notes'}
                            onClick={() => {
                                setCurrentView('notes');
                                setFilterTag(null);
                            }}
                        />
                        <NavItem
                            icon={Users}
                            label="Grupos"
                            active={currentView === 'groups'}
                            onClick={() => {
                                setCurrentView('groups');
                                setFilterTag(null);
                            }}
                        />
                        <NavItem
                            icon={Package}
                            label="Inventario"
                            active={currentView === 'inventory'}
                            onClick={() => {
                                setCurrentView('inventory');
                                setFilterTag(null);
                            }}
                        />
                    </nav>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800 space-y-1 bg-slate-900 z-10">
                    <NavItem
                        icon={Trash2}
                        label="Papelera"
                        active={currentView === 'trash'}
                        onClick={() => {
                            setCurrentView('trash');
                            setFilterTag(null);
                        }}
                    />
                    <NavItem
                        icon={Settings}
                        label="Ajustes"
                        active={currentView === 'settings'}
                        onClick={() => {
                            setCurrentView('settings');
                            setFilterTag(null);
                        }}
                    />
                    <NavItem
                        icon={Activity}
                        label="Sesiones"
                        active={currentView === 'sessions'}
                        onClick={() => {
                            setCurrentView('sessions');
                            setFilterTag(null);
                        }}
                    />
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

            <AddFolderModal
                isOpen={isAddFolderOpen}
                onClose={() => setIsAddFolderOpen(false)}
                parentId={targetParentId}
            />
            <RenameFolderModal
                isOpen={renameModal.isOpen}
                onClose={() => setRenameModal({ ...renameModal, isOpen: false })}
                folderId={renameModal.folderId}
                currentName={renameModal.currentName}
            />
        </>
    );
}
