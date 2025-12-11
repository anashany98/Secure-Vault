import { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { Plus, Search, ShieldCheck, AlertTriangle, Settings, Trash2, Upload, Filter, X, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePasswords } from '../context/PasswordContext';
import { useView } from '../context/ViewContext';
import PasswordCard from '../components/passwords/PasswordCard';
import PasswordTable from '../components/passwords/PasswordTable';
import AddPasswordModal from '../components/passwords/AddPasswordModal';
import ImportPasswordsModal from '../components/passwords/ImportPasswordsModal';
import BreachCheckModal from '../components/passwords/BreachCheckModal';

export default function Dashboard() {
    const { user } = useAuth();
    const { passwords, checkAllPasswordsForBreaches } = usePasswords();
    const { currentView } = useView();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBreachCheckOpen, setIsBreachCheckOpen] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

    // Search & Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        service: '',
        user: '',
        person: '',
        password: '' // Keep password as text search for flexibility
    });

    const activeFiltersCount = Object.values(filters).filter(Boolean).length;

    const clearFilters = () => {
        setFilters({ service: '', user: '', person: '', password: '' });
        setSearchQuery('');
    };

    // Calculate unique options for dropdowns
    const { uniqueServices, uniqueUsers, uniquePeople } = useMemo(() => {
        const services = new Set();
        const users = new Set();
        const people = new Set();

        passwords.forEach(p => {
            if (!p.isDeleted) {
                if (p.title) services.add(p.title);
                if (p.username) users.add(p.username);
                if (p.meta_person) people.add(p.meta_person);
            }
        });

        return {
            uniqueServices: Array.from(services).sort(),
            uniqueUsers: Array.from(users).sort(),
            uniquePeople: Array.from(people).sort()
        };
    }, [passwords]);


    // 1. Filter by view (Deleted vs Active)
    let viewPasswords = passwords;
    if (currentView === 'trash') {
        viewPasswords = passwords.filter(p => p.isDeleted);
    } else {
        viewPasswords = passwords.filter(p => !p.isDeleted);
        // 2. Filter by favorites if needed
        if (currentView === 'favorites') {
            viewPasswords = viewPasswords.filter(p => p.isFavorite);
        }
    }

    // 3. Advanced Filtering
    const filteredPasswords = viewPasswords.filter(p => {
        // Global Search
        const matchesGlobal =
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.meta_person && p.meta_person.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesGlobal) return false;

        // Specific Filters (AND logic)
        // Note: Dropdown values are exact matches usually, but we'll stick to includes for flexibility or switch to exact
        if (filters.service && p.title !== filters.service) return false;
        if (filters.user && p.username !== filters.user) return false;
        if (filters.person && p.meta_person !== filters.person) return false;
        if (filters.password && !p.password.toLowerCase().includes(filters.password.toLowerCase())) return false;

        return true;
    });

    // 4. Group by Service (Title)
    const groupedPasswords = filteredPasswords.reduce((acc, item) => {
        const group = item.title || 'Otros';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});

    const sortedGroups = Object.keys(groupedPasswords).sort();

    const getPageTitle = () => {
        if (currentView === 'favorites') return 'Favoritos';
        if (currentView === 'trash') return 'Papelera';
        if (currentView === 'settings') return 'Ajustes';
        return 'Mi Bóveda';
    };

    // Calculate stats dynamically
    const totalPasswords = passwords.filter(p => !p.isDeleted).length;
    const weakPasswords = passwords.filter(p => !p.isDeleted && p.password.length < 8).length;
    const securityStatus = weakPasswords === 0 ? "Excelente" : weakPasswords < 3 ? "Buena" : "Débil";
    const securityColor = weakPasswords === 0 ? "text-primary" : weakPasswords < 3 ? "text-warning" : "text-danger";

    if (currentView === 'settings') {
        // ... (Settings View Code Remains Same, ommitted for brevity in replace but must match logic. 
        // Wait, I am replacing the whole file content basically to insert imports and functions. 
        // Actually, let me just return the full component logic correctly for the file.)
        return (
            <Layout>
                <h1 className="text-3xl font-bold text-white mb-6">Ajustes</h1>
                <div className="bg-surface border border-slate-700 rounded-2xl p-6 max-w-2xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                            <Settings className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">Preferencias de la aplicación</h3>
                            <p className="text-slate-400">Personaliza tu experiencia en SecureVault</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <div>
                                <p className="text-white font-medium">Idioma</p>
                                <p className="text-sm text-slate-500">Español (España)</p>
                            </div>
                            <button className="text-primary text-sm font-medium hover:text-emerald-400">Cambiar</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <div>
                                <p className="text-white font-medium">Tema</p>
                                <p className="text-sm text-slate-500">Oscuro (Por defecto)</p>
                            </div>
                            <button className="text-primary text-sm font-medium hover:text-emerald-400">Cambiar</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <div>
                                <p className="text-white font-medium">Importar Datos</p>
                                <p className="text-sm text-slate-500">Añade contraseñas masivamente desde CSV/Excel</p>
                            </div>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                Importar
                            </button>
                        </div>
                    </div>
                </div>
                <ImportPasswordsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{getPageTitle()}</h1>
                    <p className="text-slate-400">Bienvenido de nuevo, {user?.name}</p>
                </div>

                <div className="flex items-center gap-4">

                    {/* View Toggle */}
                    <div className="flex bg-surface border border-slate-700 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                            title="Vista Cuadrícula"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                            title="Vista Lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Búsqueda rápida..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-surface border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white w-40 md:w-56 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 rounded-xl border transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-slate-700 text-slate-400 hover:text-white'}`}
                            title="Filtros Avanzados"
                        >
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl transition-all"
                        title="Importar Contraseñas"
                    >
                        <Upload className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsBreachCheckOpen(true)}
                        className="flex items-center justify-center bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 p-2.5 rounded-xl transition-all border border-red-900/50"
                        title="Verificar Filtraciones"
                    >
                        <ShieldCheck className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                            <Filter className="w-4 h-4 text-primary" />
                            Filtros Avanzados
                            {activeFiltersCount > 0 && <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>}
                        </h3>
                        <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                            <X className="w-3 h-3" /> Limpiar todo
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Servicio</label>
                            <select
                                value={filters.service}
                                onChange={e => setFilters({ ...filters, service: e.target.value })}
                                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                            >
                                <option value="">Todos</option>
                                {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Usuario</label>
                            <select
                                value={filters.user}
                                onChange={e => setFilters({ ...filters, user: e.target.value })}
                                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                            >
                                <option value="">Todos</option>
                                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Persona</label>
                            <select
                                value={filters.person}
                                onChange={e => setFilters({ ...filters, person: e.target.value })}
                                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                            >
                                <option value="">Todas</option>
                                {uniquePeople.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Contraseña</label>
                            <input
                                type="text"
                                placeholder="Contiene..."
                                value={filters.password}
                                onChange={e => setFilters({ ...filters, password: e.target.value })}
                                className="w-full bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Overview - Only on 'All' view */}
            {currentView === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-surface to-slate-900 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ShieldCheck className="w-24 h-24 text-primary" />
                        </div>
                        <h3 className="text-slate-400 font-medium mb-1">Total Contraseñas</h3>
                        <p className="text-4xl font-bold text-white">{totalPasswords}</p>
                    </div>
                    <div className="bg-gradient-to-br from-surface to-slate-900 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle className="w-24 h-24 text-warning" />
                        </div>
                        <h3 className="text-slate-400 font-medium mb-1">Estado de Seguridad</h3>
                        <p className={`text-4xl font-bold ${securityColor}`}>{securityStatus}</p>
                    </div>
                </div>
            )}

            {filteredPasswords.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        {currentView === 'trash' ? <Trash2 className="w-8 h-8 text-slate-600" /> : <ShieldCheck className="w-8 h-8 text-slate-600" />}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {currentView === 'trash' ? 'La papelera está vacía' :
                            currentView === 'favorites' ? 'No tienes favoritos aún' :
                                'Tu bóveda está vacía'}
                    </h3>
                    <p className="text-slate-400 max-w-sm mx-auto mb-6">
                        {currentView === 'trash' ? 'Los elementos eliminados aparecerán aquí.' :
                            currentView === 'favorites' ? 'Marca tus contraseñas más usadas con una estrella.' :
                                'Empieza a asegurar tu vida digital añadiendo tu primera contraseña.'}
                    </p>
                    {currentView === 'all' && (
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Importar CSV/Excel
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-primary hover:text-emerald-400 font-medium px-4 py-2"
                            >
                                Añadir manualmente
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-10">

                    {/* Render based on View Mode */}
                    {viewMode === 'table' ? (
                        <PasswordTable items={filteredPasswords} onEdit={(item) => { /* Handle Edit - for now just console log or reuse modal logic later */ console.log("Edit", item); }} />
                    ) : (
                        sortedGroups.map(group => (
                            <div key={group}>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                                    {group}
                                    <span className="text-sm font-normal text-slate-500 ml-2">({groupedPasswords[group].length})</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedPasswords[group].map(item => (
                                        <PasswordCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <AddPasswordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <ImportPasswordsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            <BreachCheckModal
                isOpen={isBreachCheckOpen}
                onClose={() => setIsBreachCheckOpen(false)}
                onStartCheck={async (onProgress) => {
                    await checkAllPasswordsForBreaches(onProgress);
                }}
            />
        </Layout>
    );
}
