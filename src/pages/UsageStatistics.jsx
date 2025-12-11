import Layout from '../components/layout/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Copy, Plus, Trash2, Search, TrendingUp } from 'lucide-react';
import { useUsage } from '../context/UsageContext';
import { useMemo } from 'react';

export default function UsageStatistics() {
    const { stats } = useUsage();

    // Prepare chart data from daily activity
    const chartData = useMemo(() => {
        const days = Object.keys(stats.dailyActivity).sort().slice(-7); // Last 7 days
        return days.map(day => ({
            date: new Date(day).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            logins: stats.dailyActivity[day]?.logins || 0,
            copies: stats.dailyActivity[day]?.copies || 0,
            creates: stats.dailyActivity[day]?.creates || 0,
        }));
    }, [stats.dailyActivity]);

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Estadísticas de Uso</h1>
                        <p className="text-slate-400">Análisis de tu actividad en SecureVault</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Total Logins</p>
                            <p className="text-3xl font-bold text-blue-500">{stats.totalLogins}</p>
                        </div>
                        <Activity className="w-10 h-10 text-blue-500/30" />
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Contraseñas Copiadas</p>
                            <p className="text-3xl font-bold text-green-500">{stats.passwordsCopied}</p>
                        </div>
                        <Copy className="w-10 h-10 text-green-500/30" />
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Contraseñas Creadas</p>
                            <p className="text-3xl font-bold text-purple-500">{stats.passwordsCreated}</p>
                        </div>
                        <Plus className="w-10 h-10 text-purple-500/30" />
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Búsquedas Realizadas</p>
                            <p className="text-3xl font-bold text-orange-500">{stats.searchesMade}</p>
                        </div>
                        <Search className="w-10 h-10 text-orange-500/30" />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Bar Chart */}
                <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Actividad Últimos 7 Días
                    </h2>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                                    labelStyle={{ color: '#e2e8f0' }}
                                />
                                <Bar dataKey="logins" fill="#3b82f6" name="Logins" />
                                <Bar dataKey="copies" fill="#10b981" name="Copias" />
                                <Bar dataKey="creates" fill="#a855f7" name="Creadas" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-slate-500 py-12">Aún no hay datos de actividad</p>
                    )}
                </div>

                {/* Trend Line Chart */}
                <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Tendencia de Copias
                    </h2>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                                    labelStyle={{ color: '#e2e8f0' }}
                                />
                                <Line type="monotone" dataKey="copies" stroke="#10b981" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-slate-500 py-12">Aún no hay datos de tendencia</p>
                    )}
                </div>
            </div>

            {/* Last Login */}
            {stats.lastLogin && (
                <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-sm text-blue-400">
                        <strong>Último login:</strong> {new Date(stats.lastLogin).toLocaleString('es-ES')}
                    </p>
                </div>
            )}
        </Layout>
    );
}
