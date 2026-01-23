import { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { FileText, Download, Filter, Calendar, User, Activity } from 'lucide-react';
import { usePasswords } from '../context/PasswordContext';

export default function AuditLog() {
    const { auditLogs } = usePasswords();
    const [filter, setFilter] = useState({
        action: 'all',
        dateFrom: '',
        dateTo: '',
        search: ''
    });

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            if (filter.action !== 'all' && log.action !== filter.action) return false;
            if (filter.search && !JSON.stringify(log).toLowerCase().includes(filter.search.toLowerCase())) return false;
            const logTime = new Date(log.created_at).getTime();
            if (filter.dateFrom && logTime < new Date(filter.dateFrom).getTime()) return false;
            if (filter.dateTo && logTime > new Date(filter.dateTo).getTime()) return false;
            return true;
        }); // Backend already sorts DESC
    }, [auditLogs, filter]);

    const exportToCSV = () => {
        const headers = ['Fecha', 'Acción', 'Usuario', 'Detalles'];
        const rows = filteredLogs.map(log => [
            new Date(log.created_at).toLocaleString('es-ES'),
            log.action,
            log.user_id || 'Sistema',
            log.details || ''
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const actionColors = {
        create: 'bg-green-500/20 text-green-400 border-green-500/50',
        update: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        delete: 'bg-red-500/20 text-red-400 border-red-500/50',
        restore: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
        share: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    };

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Registro de Auditoría</h1>
                            <p className="text-slate-400">Historial completo de acciones ({filteredLogs.length} eventos)</p>
                        </div>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-emerald-600 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-surface border border-slate-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            <Filter className="w-4 h-4 inline mr-1" />
                            Acción
                        </label>
                        <select
                            value={filter.action}
                            onChange={e => setFilter({ ...filter, action: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        >
                            <option value="all">Todas</option>
                            <option value="create">Crear</option>
                            <option value="update">Actualizar</option>
                            <option value="delete">Eliminar</option>
                            <option value="restore">Restaurar</option>
                            <option value="share">Compartir</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Desde
                        </label>
                        <input
                            type="date"
                            value={filter.dateFrom}
                            onChange={e => setFilter({ ...filter, dateFrom: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={filter.dateTo}
                            onChange={e => setFilter({ ...filter, dateTo: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            <Activity className="w-4 h-4 inline mr-1" />
                            Buscar
                        </label>
                        <input
                            type="text"
                            value={filter.search}
                            onChange={e => setFilter({ ...filter, search: e.target.value })}
                            placeholder="Buscar..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Log Table */}
            <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-700">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Fecha y Hora</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Acción</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Usuario</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log, index) => (
                                    <tr key={index} className="hover:bg-slate-800/30">
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {new Date(log.created_at).toLocaleString('es-ES')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${actionColors[log.action] || 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-500" />
                                            {log.user_id ? 'Usuario' : 'Sistema'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {log.details || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-4 py-12 text-center text-slate-500">
                                        No hay eventos que coincidan con los filtros
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
