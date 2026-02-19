import { useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { usePasswords } from '../context/PasswordContext';
import { calculateCrackTime } from '../lib/passwordSecurity';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

export default function SecurityDashboard() {
    const { passwords, auditLogs } = usePasswords();

    // Security Analysis
    const analysis = useMemo(() => {
        const active = passwords.filter(p => !p.isDeleted);

        // Strength distribution
        const weak = active.filter(p => {
            const time = calculateCrackTime(p.password);
            return time.seconds < 3600; // < 1 hour
        });
        const medium = active.filter(p => {
            const time = calculateCrackTime(p.password);
            return time.seconds >= 3600 && time.seconds < 86400 * 365; // 1h - 1y
        });
        const strong = active.filter(p => {
            const time = calculateCrackTime(p.password);
            return time.seconds >= 86400 * 365; // > 1 year
        });

        // Reused passwords
        const passwordMap = {};
        active.forEach(p => {
            if (!passwordMap[p.password]) passwordMap[p.password] = [];
            passwordMap[p.password].push(p);
        });
        const reused = Object.values(passwordMap).filter(group => group.length > 1);

        // Old passwords (>90 days)
        const now = Date.now();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        const old = active.filter(p => {
            const updated = p.updatedAt || p.createdAt;
            return now - updated > ninetyDays;
        });

        // Breached
        const breached = active.filter(p => p.breachCount > 0);

        // Security Score (0-100)
        const totalIssues = weak.length + reused.length + old.length + breached.length;
        const maxPossibleIssues = active.length * 3; // max 3 issues per password
        const score = Math.max(0, Math.round(100 - (totalIssues / maxPossibleIssues) * 100));

        return {
            total: active.length,
            weak: weak.length,
            medium: medium.length,
            strong: strong.length,
            reused: reused.length,
            old: old.length,
            breached: breached.length,
            score,
            reusedGroups: reused,
            oldPasswords: old,
            weakPasswords: weak
        };
    }, [passwords]);

    // Chart data
    const strengthData = [
        { name: 'Débiles', value: analysis.weak, color: '#ef4444' },
        { name: 'Aceptables', value: analysis.medium, color: '#f59e0b' },
        { name: 'Fuertes', value: analysis.strong, color: '#10b981' },
    ].filter(item => item.value > 0);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-500/20 border-green-500/50';
        if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
        return 'bg-red-500/20 border-red-500/50';
    };

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard de Seguridad</h1>
                        <p className="text-slate-400">Análisis completo de la salud de tus contraseñas</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        const loadingToast = toast.loading('Analizando filtraciones... puede tardar unos segundos');
                        checkAllPasswordsForBreaches((progress) => {
                            // Optional: Could update toast with progress
                        }).then(() => toast.dismiss(loadingToast));
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-medium shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <AlertTriangle className="w-5 h-5" />
                    Escanear Filtraciones
                </button>
            </div>

            {/* Security Score */}
            <div className={`mb-8 p-8 rounded-2xl border-2 ${getScoreBgColor(analysis.score)}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-400 mb-2">Puntuación de Seguridad</p>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                                {analysis.score}
                            </span>
                            <span className="text-2xl text-slate-500">/100</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            {analysis.score >= 80 && '🎉 ¡Excelente! Tu seguridad es muy buena'}
                            {analysis.score >= 60 && analysis.score < 80 && '👍 Buena seguridad, pero hay margen de mejora'}
                            {analysis.score < 60 && '⚠️ Necesitas mejorar urgentemente tu seguridad'}
                        </p>
                    </div>
                    <div className="w-32 h-32 bg-slate-900/50 rounded-full flex items-center justify-center">
                        <Shield className={`w-16 h-16 ${getScoreColor(analysis.score)}`} />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Contraseñas Débiles</p>
                            <p className="text-3xl font-bold text-red-500">{analysis.weak}</p>
                        </div>
                        <AlertTriangle className="w-10 h-10 text-red-500/30" />
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Contraseñas Reutilizadas</p>
                            <p className="text-3xl font-bold text-orange-500">{analysis.reused}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-orange-500/30" />
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Antiguas (&gt;90 días)</p>
                            <p className="text-3xl font-bold text-yellow-500">{analysis.old}</p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-500/30" />
                    </div>
                </div>

                <div className="bg-surface border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm mb-1">Filtradas</p>
                            <p className="text-3xl font-bold text-purple-500">{analysis.breached}</p>
                        </div>
                        <AlertTriangle className="w-10 h-10 text-purple-500/30" />
                    </div>
                </div>
            </div>

            {/* Critical Alerts - Breached Passwords */}
            {analysis.breached > 0 && (
                <div className="mb-8 bg-red-500/10 border border-red-500/50 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-2">
                                ¡Acción Requerida! Hemos encontrado {analysis.breached} contraseñas filtradas
                            </h2>
                            <p className="text-red-200 mb-4">
                                Estas contraseñas han aparecido en filtraciones de datos públicas. Los hackers las conocen. Debes cambiarlas inmediatamente.
                            </p>

                            <div className="bg-surface border border-red-500/30 rounded-xl overflow-hidden">
                                {analysis.breached > 0 ? (
                                    <table className="w-full text-left">
                                        <thead className="bg-red-500/20 text-red-200 text-xs uppercase">
                                            <tr>
                                                <th className="p-3">Servicio</th>
                                                <th className="p-3">Usuario</th>
                                                <th className="p-3">Filtraciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-500/20">
                                            {passwords.filter(p => p.breachCount > 0).map(p => (
                                                <tr key={p.id} className="hover:bg-red-500/10">
                                                    <td className="p-3 font-medium text-white">{p.title}</td>
                                                    <td className="p-3 text-red-200">{p.username}</td>
                                                    <td className="p-3 font-bold text-red-400">{p.breachCount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts and Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strength Distribution */}
                <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Distribución de Fuerza
                    </h2>
                    {strengthData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={strengthData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {strengthData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-slate-500 py-12">No hay datos disponibles</p>
                    )}
                </div>

                {/* Weak Passwords List */}
                <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Contraseñas Débiles
                    </h2>
                    {analysis.weakPasswords.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {analysis.weakPasswords.slice(0, 10).map(pwd => (
                                <div key={pwd.id} className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-white">{pwd.title}</p>
                                        <p className="text-xs text-slate-400">{pwd.username}</p>
                                    </div>
                                    <span className="text-xs text-orange-400 font-mono">
                                        {calculateCrackTime(pwd.password).time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <CheckCircle className="w-12 h-12 mb-2 text-green-500" />
                            <p>¡No hay contraseñas débiles!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6 bg-surface border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Actividad Reciente
                </h2>
                <div className="space-y-4">
                    {auditLogs.slice(0, 5).map((log, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${log.action.includes('CREATE') ? 'bg-green-500' :
                                    log.action.includes('DELETE') ? 'bg-red-500' : 'bg-blue-500'
                                    }`} />
                                <div>
                                    <p className="text-sm text-white font-medium">{log.details || log.action}</p>
                                    <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{log.entity_type}</span>
                        </div>
                    ))}
                    {auditLogs.length === 0 && <p className="text-center text-slate-500 py-4">No hay actividad reciente</p>}
                </div>
            </div>
        </Layout>
    );
}
