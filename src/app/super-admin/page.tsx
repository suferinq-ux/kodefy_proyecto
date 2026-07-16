'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  Users,
  Zap,
  TrendingUp,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Activity,
  ExternalLink,
  ShieldCheck,
  Power,
  PowerOff,
  Database,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatRelativeTime, ANIMATIONS, CHART_COLORS } from '@/lib/admin-constants';
import { cn } from '@/lib/cn';
import Link from 'next/link';

interface DashboardStats {
  totalNegocios: number;
  negociosActivos: number;
  negociosSuspendidos: number;
  totalUsuarios: number;
}

interface RecentActivity {
  id: string;
  type: 'negocio_created' | 'user_created';
  negocio_nombre?: string;
  user_nombre?: string;
  created_at: string;
}

interface BusinessGrowth {
  month: string;
  creados: number;
  activos: number;
}

interface NegocioListItem {
  id: string;
  nombre: string;
  slug: string;
  estado: 'activo' | 'suspendido';
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalNegocios: 0,
    negociosActivos: 0,
    negociosSuspendidos: 0,
    totalUsuarios: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessGrowth, setBusinessGrowth] = useState<BusinessGrowth[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [negociosList, setNegociosList] = useState<NegocioListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [latency, setLatency] = useState(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const startTime = performance.now();

    try {
      // Parallel fetches from database (Excluding sales entirely!)
      const [
        negociosResult,
        usuariosResult,
      ] = await Promise.all([
        supabase.from('negocios').select('id,nombre,slug,estado,created_at').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id,created_at,nombre,negocio_id').order('created_at', { ascending: false }),
      ]);

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setDbStatus('online');

      if (negociosResult.error) throw negociosResult.error;
      if (usuariosResult.error) throw usuariosResult.error;

      const negocios = negociosResult.data || [];
      const usuarios = usuariosResult.data || [];

      // Update negocios list state
      setNegociosList(negocios);

      // Calculations
      const activos = negocios.filter((n) => n.estado === 'activo').length;
      const suspendidos = negocios.filter((n) => n.estado === 'suspendido').length;

      setStats({
        totalNegocios: negocios.length,
        negociosActivos: activos,
        negociosSuspendidos: suspendidos,
        totalUsuarios: usuarios.length,
      });

      // Business growth (last 6 months)
      const growth: Record<string, { creados: number; activos: number }> = {};
      const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      });

      const monthNames: Record<string, string> = {};
      last6.forEach((ym) => {
        const [y, m] = ym.split('-');
        const d = new Date(Number(y), Number(m) - 1, 1);
        monthNames[ym] = d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
        growth[ym] = { creados: 0, activos: 0 };
      });

      negocios.forEach((n) => {
        if (n.created_at) {
          const d = new Date(n.created_at);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (growth[ym] !== undefined) {
            growth[ym].creados += 1;
            if (n.estado === 'activo') growth[ym].activos += 1;
          }
        }
      });

      setBusinessGrowth(
        last6.map((ym) => ({
          month: monthNames[ym],
          creados: growth[ym].creados,
          activos: growth[ym].activos,
        }))
      );

      // Business name mapper for activities
      const negocioNames: Record<string, string> = {};
      negocios.forEach((n) => {
        negocioNames[n.id] = n.nombre;
      });

      // Map recent activity (Only registrations!)
      const activity: RecentActivity[] = [];

      // Add business creations
      negocios.slice(0, 5).forEach((n) => {
        activity.push({
          id: `n-${n.id}`,
          type: 'negocio_created',
          negocio_nombre: n.nombre,
          created_at: n.created_at || new Date().toISOString(),
        });
      });

      // Add user signups
      usuarios.slice(0, 5).forEach((u) => {
        activity.push({
          id: `u-${u.id}`,
          type: 'user_created',
          user_nombre: u.nombre || 'Colaborador',
          negocio_nombre: negocioNames[u.negocio_id] || 'Plataforma',
          created_at: u.created_at || new Date().toISOString(),
        });
      });

      // Sort and slice
      const sortedActivity = activity
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);

      setRecentActivity(sortedActivity);
      
      if (isRefresh) {
        toast.success('Métricas actualizadas desde la base de datos');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setDbStatus('offline');
      toast.error('Error de conexión con la base de datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle business quick status toggle
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'activo' ? 'suspendido' : 'activo';
    try {
      const { error } = await supabase
        .from('negocios')
        .update({ estado: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Negocio ${newStatus === 'activo' ? 'activado' : 'suspendido'}`);
      setNegociosList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, estado: newStatus } : n))
      );
      
      // Refresh statistics counters
      fetchData(false);
    } catch (error: any) {
      toast.error('Error al cambiar estado: ' + error.message);
    }
  };

  // Filter businesses
  const filteredNegocios = useMemo(() => {
    if (!searchQuery.trim()) return negociosList;
    const query = searchQuery.toLowerCase();
    return negociosList.filter(
      (n) =>
        n.nombre.toLowerCase().includes(query) ||
        n.slug.toLowerCase().includes(query)
    );
  }, [negociosList, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <ChartSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Negocios Totales',
      value: formatNumber(stats.totalNegocios),
      sub: 'Registrados en total',
      icon: Building2,
      trendText: 'Locales',
      color: CHART_COLORS.primary,
    },
    {
      title: 'Locales Activos',
      value: formatNumber(stats.negociosActivos),
      sub: 'Operando normalmente',
      icon: Building2,
      trendText: 'Activos',
      color: CHART_COLORS.success,
    },
    {
      title: 'Locales Suspendidos',
      value: formatNumber(stats.negociosSuspendidos),
      sub: 'Accesos restringidos',
      icon: Building2,
      trendText: 'Suspendidos',
      color: CHART_COLORS.danger,
    },
    {
      title: 'Usuarios Totales',
      value: formatNumber(stats.totalUsuarios),
      sub: 'Colaboradores registrados',
      icon: Users,
      trendText: 'Personal',
      color: CHART_COLORS.warning,
    },
  ];

  return (
    <div className="space-y-8 max-w-[1440px]">
      {/* Header */}
      <motion.div {...ANIMATIONS.fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Panel de Control Global
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Administración centralizada de locales, accesos y rendimiento de KODEFY
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
            {refreshing ? 'Actualizando...' : 'Actualizar Datos'}
          </button>
          <Link
            href="/super-admin/negocios"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/25"
          >
            <Plus size={14} />
            Nuevo Local
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            {...ANIMATIONS.stagger(i)}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              <Badge variant="neutral" size="sm" className="font-bold text-[10px] opacity-75">
                {card.trendText}
              </Badge>
            </div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              {card.title}
            </h3>
            <p className="text-2xl font-black text-slate-900 dark:text-white mb-0.5 tracking-tight">
              {card.value}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {card.sub}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Grid: Left Management & Right Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Tenant Management Panel */}
        <motion.div
          {...ANIMATIONS.stagger(4)}
          className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Locales Registrados (Tenants)
              </h3>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                Control directo de accesos y estado operativo
              </p>
            </div>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar local o slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full sm:w-60 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle px-6">
              <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-xl">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Nombre / Slug
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Creado
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {filteredNegocios.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center">
                          <EmptyState
                            title="No se encontraron locales"
                            description="Prueba con otra búsqueda o registra un nuevo local."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredNegocios.map((negocio) => (
                        <tr key={negocio.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {negocio.nombre}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                /{negocio.slug}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Badge variant={negocio.estado === 'activo' ? 'success' : 'danger'} size="sm" className="font-bold">
                              {negocio.estado === 'activo' ? 'Activo' : 'Suspendido'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {new Date(negocio.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-semibold space-x-1">
                            <button
                              onClick={() => handleToggleStatus(negocio.id, negocio.estado)}
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all shadow-sm',
                                negocio.estado === 'activo'
                                  ? 'border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:bg-red-500/5 dark:hover:bg-red-500/10'
                                  : 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10'
                              )}
                              title={negocio.estado === 'activo' ? 'Suspender local' : 'Activar local'}
                            >
                              {negocio.estado === 'activo' ? (
                                <>
                                  <PowerOff size={11} />
                                  Suspender
                                </>
                              ) : (
                                <>
                                  <Power size={11} />
                                  Activar
                                </>
                              )}
                            </button>
                            <a
                              href={`/${negocio.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold transition-all shadow-sm"
                            >
                              <ExternalLink size={11} />
                              Visitar
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Platform Growth Chart */}
        <motion.div
          {...ANIMATIONS.stagger(5)}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Crecimiento del SaaS
                </h3>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  Nuevos locales registrados por mes (últimos 6 meses)
                </p>
              </div>
              <Badge variant="info" size="sm">Histórico</Badge>
            </div>
            
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={businessGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Bar
                    dataKey="creados"
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                    name="Registrados"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-500" />
              Métricas de escala SaaS
            </span>
            <span className="font-bold">
              {businessGrowth.length} meses analizados
            </span>
          </div>
        </motion.div>
      </div>

      {/* Grid: Diagnostics and Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left/Middle: Recent Activity Feed */}
        <motion.div
          {...ANIMATIONS.stagger(6)}
          className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={16} className="text-blue-500 animate-pulse" />
              Actividad Reciente en la Plataforma
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Monitoreo en tiempo real de nuevos registros y operaciones críticas
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Clock size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                  Sin actividad registrada en la plataforma
                </p>
              </div>
            ) : (
              recentActivity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        item.type === 'negocio_created'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                      )}
                    >
                      {item.type === 'negocio_created' ? (
                        <Building2 size={14} />
                      ) : (
                        <Users size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {item.type === 'negocio_created' && (
                          <>Se registró un nuevo negocio: <span className="text-blue-600 dark:text-blue-400">{item.negocio_nombre}</span></>
                        )}
                        {item.type === 'user_created' && (
                          <>Colaborador registrado: <span className="text-purple-600 dark:text-purple-400">{item.user_nombre}</span> en <span className="font-semibold">{item.negocio_nombre}</span></>
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right Column: Platform Diagnostics & Health */}
        <motion.div
          {...ANIMATIONS.stagger(7)}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500" />
                Diagnóstico del Sistema
              </h3>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                Estado y salud técnica de la base de datos
              </p>
            </div>

            <div className="space-y-4">
              {/* Database Status */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Database size={16} className={cn(dbStatus === 'online' ? 'text-emerald-500' : 'text-red-500')} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Base de Datos
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Servidor de Supabase Postgres
                    </p>
                  </div>
                </div>
                <Badge variant={dbStatus === 'online' ? 'success' : 'danger'} size="sm" className="font-bold">
                  {dbStatus === 'online' ? 'Online' : 'Offline'}
                </Badge>
              </div>

              {/* Latency / Performance */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-amber-500 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Latencia de Consulta
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Tiempo de respuesta de queries
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                  {latency} ms
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider">
            KODEFY ADMIN v1.0.0
          </div>
        </motion.div>
      </div>
    </div>
  );
}
