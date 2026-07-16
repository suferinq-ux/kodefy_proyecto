'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  Wallet,
  Users,
  Zap,
  TrendingUp,
  Clock,
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  Activity,
  ArrowUpRight,
  Power,
  PowerOff,
  Database,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatRelativeTime, ANIMATIONS, CHART_COLORS } from '@/lib/admin-constants';
import { cn } from '@/lib/cn';
import Link from 'next/link';

interface DashboardStats {
  totalNegocios: number;
  negociosActivos: number;
  negociosSuspendidos: number;
  totalUsuarios: number;
  totalVentas: number;
  ventasHoy: number;
  ventasEstaSemana: number;
}

interface RecentActivity {
  id: string;
  type: 'negocio_created' | 'venta' | 'user_created';
  negocio_nombre?: string;
  monto?: number;
  user_nombre?: string;
  created_at: string;
}

interface SalesTrend {
  date: string;
  ventas: number;
  count: number;
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
    totalVentas: 0,
    ventasHoy: 0,
    ventasEstaSemana: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [negociosList, setNegociosList] = useState<NegocioListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [latency, setLatency] = useState(0);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');

  const getLocalDateString = (dateInput: string) => {
    if (!dateInput) return '';
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString('en-CA'); // returns YYYY-MM-DD
    } catch (e) {
      return dateInput.split('T')[0];
    }
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const startTime = performance.now();

    try {
      // Parallel fetches from database
      const [
        negociosResult,
        usuariosResult,
        ventasResult,
      ] = await Promise.all([
        supabase.from('negocios').select('id,nombre,slug,estado,created_at').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id,created_at,nombre,negocio_id').order('created_at', { ascending: false }),
        supabase.from('ventas').select('id,total,fecha,created_at,negocio_id').order('created_at', { ascending: false }).limit(1000),
      ]);

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setDbStatus('online');

      if (negociosResult.error) throw negociosResult.error;
      if (usuariosResult.error) throw usuariosResult.error;
      if (ventasResult.error) throw ventasResult.error;

      const negocios = negociosResult.data || [];
      const usuarios = usuariosResult.data || [];
      const ventas = ventasResult.data || [];

      // Update negocios list state
      setNegociosList(negocios);

      // Calculations
      const activos = negocios.filter((n) => n.estado === 'activo').length;
      const suspendidos = negocios.filter((n) => n.estado === 'suspendido').length;
      const sumVentas = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      // Localized timezone dates
      const today = new Date().toLocaleDateString('en-CA');
      const weekAgoDate = new Date();
      weekAgoDate.setDate(weekAgoDate.getDate() - 7);
      const weekAgo = weekAgoDate.toLocaleDateString('en-CA');

      const ventasHoy = ventas
        .filter((v) => getLocalDateString(v.fecha || v.created_at) === today)
        .reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      const ventasSemana = ventas
        .filter((v) => getLocalDateString(v.fecha || v.created_at) >= weekAgo)
        .reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      setStats({
        totalNegocios: negocios.length,
        negociosActivos: activos,
        negociosSuspendidos: suspendidos,
        totalUsuarios: usuarios.length,
        totalVentas: sumVentas,
        ventasHoy,
        ventasEstaSemana: ventasSemana,
      });

      // Sales trend (last 14 days)
      const trend: Record<string, { ventas: number; count: number }> = {};
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toLocaleDateString('en-CA');
      });

      last14.forEach((d) => (trend[d] = { ventas: 0, count: 0 }));
      
      ventas.forEach((v) => {
        const vDate = getLocalDateString(v.fecha || v.created_at);
        if (trend[vDate] !== undefined) {
          trend[vDate].ventas += Number(v.total) || 0;
          trend[vDate].count += 1;
        }
      });

      setSalesTrend(
        last14.map((d) => {
          const [year, month, day] = d.split('-');
          const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
          return {
            date: dateObj.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }),
            ventas: trend[d].ventas,
            count: trend[d].count,
          };
        })
      );

      // Business name mapper for activities
      const negocioNames: Record<string, string> = {};
      negocios.forEach((n) => {
        negocioNames[n.id] = n.nombre;
      });

      // Map recent activity
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

      // Add sales
      ventas.slice(0, 8).forEach((v) => {
        activity.push({
          id: `v-${v.id}`,
          type: 'venta',
          monto: Number(v.total) || 0,
          negocio_nombre: negocioNames[v.negocio_id] || 'Negocio',
          created_at: v.created_at || v.fecha || new Date().toISOString(),
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
      sub: `${stats.negociosActivos} activos · ${stats.negociosSuspendidos} suspendidos`,
      icon: Building2,
      trendText: 'SaaS Tenants',
      color: CHART_COLORS.primary,
    },
    {
      title: 'Volumen Facturado',
      value: formatCurrency(stats.totalVentas),
      sub: `${formatCurrency(stats.ventasEstaSemana)} esta semana`,
      icon: Wallet,
      trendText: 'Acumulado',
      color: CHART_COLORS.success,
    },
    {
      title: 'Ventas de Hoy',
      value: formatCurrency(stats.ventasHoy),
      sub: 'En todos los locales',
      icon: ShoppingCart,
      trendText: 'Tiempo Real',
      color: '#8b5cf6',
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
            Administración centralizada de locales, ventas y rendimiento de KODEFY
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

        {/* Right Column: Platform Sales Volume Chart */}
        <motion.div
          {...ANIMATIONS.stagger(5)}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Volumen Consolidado
                </h3>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  Ventas agregadas de todos los locales (últimos 14 días)
                </p>
              </div>
              <Badge variant="info" size="sm">Soles (PEN)</Badge>
            </div>
            
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `S/${v}`}
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
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Ventas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1.5, fill: '#fff', stroke: CHART_COLORS.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-500" />
              Actualización automatizada
            </span>
            <span className="font-bold">
              {salesTrend.length} días graficados
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
                          : item.type === 'venta'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                      )}
                    >
                      {item.type === 'negocio_created' ? (
                        <Building2 size={14} />
                      ) : item.type === 'venta' ? (
                        <ShoppingCart size={14} />
                      ) : (
                        <Users size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {item.type === 'negocio_created' && (
                          <>Se registró un nuevo negocio: <span className="text-blue-600 dark:text-blue-400">{item.negocio_nombre}</span></>
                        )}
                        {item.type === 'venta' && (
                          <>Venta concretada en <span className="font-black text-slate-800 dark:text-slate-200">{item.negocio_nombre}</span></>
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
                  {item.type === 'venta' && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                        +{formatCurrency(item.monto || 0)}
                      </span>
                    </div>
                  )}
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
