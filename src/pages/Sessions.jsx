import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Shield, Clock, Globe, Laptop, Smartphone, Monitor, X, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function Sessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const data = await api.get('/auth/sessions');
            setSessions(data);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar sesiones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const revokeSession = async (id) => {
        if (!window.confirm('¿Cerrar esta sesión?')) return;
        try {
            await api.delete(`/auth/sessions/${id}`);
            toast.success('Sesión cerrada');
            fetchSessions();
        } catch (err) {
            toast.error('Error al cerrar sesión');
        }
    };

    const getDeviceIcon = (ua) => {
        const lowerUA = ua?.toLowerCase() || '';
        if (lowerUA.includes('mobi')) return Smartphone;
        if (lowerUA.includes('tablet')) return Smartphone;
        if (lowerUA.includes('windows')) return Monitor;
        if (lowerUA.includes('macintosh')) return Laptop;
        return Globe;
    };

    const parseUA = (ua) => {
        if (!ua) return 'Dispositivo desconocido';
        if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
        if (ua.includes('Macintosh')) return 'macOS';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone')) return 'iPhone';
        return ua.split(')')[0].split('(')[1] || 'Dispositivo desconocido';
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Gestión de Sesiones</h1>
                            <p className="text-slate-400">Controla los dispositivos que tienen acceso a tu cuenta</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchSessions}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                        title="Actualizar"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Sesiones Activas
                    </h3>
                </div>

                <div className="divide-y divide-slate-700">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Cargando sesiones...</div>
                    ) : sessions.length > 0 ? (
                        sessions.map(session => {
                            const Icon = getDeviceIcon(session.user_agent);
                            return (
                                <div key={session.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center text-slate-400">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white font-bold">{parseUA(session.user_agent)}</h4>
                                                {session.is_current && (
                                                    <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/30">
                                                        Sesión Actual
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-500 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Globe className="w-3 h-3" />
                                                    {session.ip_address}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Visto el: {new Date(session.last_active).toLocaleString('es-ES')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!session.is_current && (
                                        <button
                                            onClick={() => revokeSession(session.id)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-red-900/20 rounded-xl transition-all font-medium"
                                        >
                                            <X className="w-4 h-4" />
                                            Cerrar Sesión
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-12 text-center text-slate-500">No se encontraron sesiones activas.</div>
                    )}
                </div>
            </div>

            <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-4">
                <AlertCircle className="w-6 h-6 text-blue-400 shrink-0" />
                <div>
                    <h4 className="text-blue-400 font-bold mb-1">Consejo de Seguridad</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Si ves un dispositivo o ubicación que no reconoces, te recomendamos que cierres la sesión inmediatamente y cambies tu contraseña maestra.
                    </p>
                </div>
            </div>
        </div>
    );
}
