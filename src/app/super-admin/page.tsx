'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  Wallet,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  Zap,
  ShoppingCart,
  Fingerprint,
  Shield,
  KeyRound,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Dialog } from '@/components/ui/dialog';
import { PatternLock } from '@/components/ui/PatternLock';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatRelativeTime, ANIMATIONS, CHART_COLORS } from '@/lib/admin-constants';
import { cn } from '@/lib/cn';

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

interface BusinessGrowth {
  month: string;
  creados: number;
  activos: number;
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
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [businessGrowth, setBusinessGrowth] = useState<BusinessGrowth[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [latency, setLatency] = useState(0);

  // Security configuration states
  const [userEmail, setUserEmail] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isPatternEnabled, setIsPatternEnabled] = useState(false);
  const [showPatternDialog, setShowPatternDialog] = useState(false);
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [patternStep, setPatternStep] = useState<1 | 2>(1);
  const [tempPattern, setTempPattern] = useState<number[]>([]);
  const [patternError, setPatternError] = useState(false);

  // Mobile 2FA session approval states
  const [pendingSession, setPendingSession] = useState<any>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkPendingSessions = async () => {
      if (!userEmail) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('login_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          if (!pendingSession || pendingSession.id !== data[0].id) {
            setPendingSession(data[0]);
          }
        } else {
          setPendingSession(null);
        }
      } catch (err) {
        console.error('Error checking pending sessions:', err);
      }
    };

    if (userEmail) {
      checkPendingSessions();
      interval = setInterval(checkPendingSessions, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userEmail, pendingSession]);

  const handleSessionAction = async (status: 'approved' | 'rejected') => {
    if (!pendingSession) return;
    setSessionActionLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error('Sesión no encontrada. Vuelve a iniciar sesión.');
        return;
      }

      const res = await fetch('/api/auth/session/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: pendingSession.id,
          status
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al procesar la solicitud.');
      }

      toast.success(status === 'approved' ? 'Inicio de sesión autorizado.' : 'Inicio de sesión rechazado.');
      setPendingSession(null);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSessionActionLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsBiometricSupported('credentials' in navigator && 'PasswordCredential' in window);
      setIsBiometricEnabled(localStorage.getItem('kodefy-admin-biometric-registered') === 'true');
      setIsPatternEnabled(localStorage.getItem('kodefy-admin-pattern') !== null);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleRegisterBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      toast.error('La contraseña es requerida.');
      return;
    }

    try {
      // Verify password
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: adminPassword,
      });

      if (error) {
        toast.error('Contraseña incorrecta.');
        return;
      }

      if (typeof window !== 'undefined' && 'PasswordCredential' in window) {
        const cred = new (window as any).PasswordCredential({
          id: userEmail,
          password: adminPassword,
          name: "Kodefy Admin",
        });
        await navigator.credentials.store(cred);
        localStorage.setItem('kodefy-admin-biometric-registered', 'true');
        setIsBiometricEnabled(true);
        setShowBiometricDialog(false);
        setAdminPassword('');
        toast.success('Acceso biométrico configurado exitosamente.');
      }
    } catch (err: any) {
      toast.error('Error al configurar biometría: ' + err.message);
    }
  };

  const handleRemoveBiometrics = () => {
    localStorage.removeItem('kodefy-admin-biometric-registered');
    setIsBiometricEnabled(false);
    toast.success('Acceso biométrico desactivado.');
  };

  const handlePatternComplete = (pattern: number[]) => {
    if (patternStep === 1) {
      setTempPattern(pattern);
      setPatternStep(2);
      toast.success('Dibuja el patrón nuevamente para confirmar.');
    } else {
      const isMatch = tempPattern.every((val, index) => val === pattern[index]) && tempPattern.length === pattern.length;
      if (isMatch) {
        localStorage.setItem('kodefy-admin-pattern', JSON.stringify(pattern));
        setIsPatternEnabled(true);
        setShowPatternDialog(false);
        setTempPattern([]);
        setPatternStep(1);
        toast.success('Patrón de seguridad guardado.');
      } else {
        setPatternError(true);
        toast.error('Los patrones no coinciden. Intenta nuevamente.');
        setTimeout(() => {
          setPatternError(false);
          setPatternStep(1);
          setTempPattern([]);
        }, 1000);
      }
    }
  };

  const handleRemovePattern = () => {
    localStorage.removeItem('kodefy-admin-pattern');
    setIsPatternEnabled(false);
    toast.success('Patrón de seguridad desactivado.');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startTime = performance.now();

    try {
      // Parallel fetches
      const [
        negociosResult,
        usuariosResult,
        ventasResult,
        negociosRecientesResult,
        ventasRecientesResult,
      ] = await Promise.all([
        supabase.from('negocios').select('id,estado,created_at').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('id,created_at').order('created_at', { ascending: false }),
        supabase.from('ventas').select('total,fecha,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('negocios').select('id,nombre,created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('ventas').select('id,total,created_at,negocio_id').order('created_at', { ascending: false }).limit(10),
      ]);

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      // Stats calculations
      const negocios = negociosResult.data || [];
      const usuarios = usuariosResult.data || [];
      const ventas = ventasResult.data || [];

      const activos = negocios.filter((n) => n.estado === 'activo').length;
      const suspendidos = negocios.filter((n) => n.estado === 'suspendido').length;
      const sumVentas = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const ventasHoy = ventas
        .filter((v) => v.fecha === today)
        .reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      const ventasSemana = ventas
        .filter((v) => v.fecha >= weekAgo)
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
        return d.toISOString().split('T')[0];
      });

      last14.forEach((d) => (trend[d] = { ventas: 0, count: 0 }));
      ventas.forEach((v) => {
        if (trend[v.fecha]) {
          trend[v.fecha].ventas += Number(v.total) || 0;
          trend[v.fecha].count += 1;
        }
      });

      setSalesTrend(
        last14.map((d) => ({
          date: new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }),
          ventas: trend[d].ventas,
          count: trend[d].count,
        }))
      );

      // Business growth (last 6 months)
      const growth: Record<string, { creados: number; activos: number }> = {};
      const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const key = d.toLocaleDateString('es-PE', { month: 'short' });
        return key;
      });

      last6.forEach((m) => (growth[m] = { creados: 0, activos: 0 }));
      negocios.forEach((n) => {
        const month = new Date(n.created_at).toLocaleDateString('es-PE', { month: 'short' });
        if (growth[month] !== undefined) {
          growth[month].creados += 1;
          if (n.estado === 'activo') growth[month].activos += 1;
        }
      });

      setBusinessGrowth(
        last6.map((m) => ({
          month: m,
          creados: growth[m].creados,
          activos: growth[m].activos,
        }))
      );

      // Recent activity
      const activity: RecentActivity[] = [
        ...(negociosRecientesResult.data || []).map((n) => ({
          id: `n-${n.id}`,
          type: 'negocio_created' as const,
          negocio_nombre: n.nombre,
          created_at: n.created_at,
        })),
        ...(ventasRecientesResult.data || []).slice(0, 8).map((v) => ({
          id: `v-${v.id}`,
          type: 'venta' as const,
          monto: Number(v.total) || 0,
          created_at: v.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      trend: stats.negociosActivos > 0 ? 'up' : 'neutral' as const,
      color: CHART_COLORS.primary,
    },
    {
      title: 'Volumen Total',
      value: formatCurrency(stats.totalVentas),
      sub: `${formatCurrency(stats.ventasEstaSemana)} esta semana`,
      icon: Wallet,
      trend: 'up' as const,
      color: CHART_COLORS.success,
    },
    {
      title: 'Usuarios',
      value: formatNumber(stats.totalUsuarios),
      sub: 'Perfiles registrados',
      icon: Users,
      trend: 'neutral' as const,
      color: '#8b5cf6',
    },
    {
      title: 'Salud del Sistema',
      value: `${latency}ms`,
      sub: `Latencia de respuesta`,
      icon: Zap,
      trend: latency < 300 ? 'up' : 'neutral' as const,
      color: CHART_COLORS.warning,
    },
  ];

  return (
    <div className="space-y-8 max-w-[1440px]">
      {/* Header */}
      <motion.div {...ANIMATIONS.fadeUp}>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Global Dashboard
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
          Métricas y actividad de la plataforma KODEFY
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            {...ANIMATIONS.stagger(i)}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              {card.trend === 'up' && (
                <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <TrendingUp size={12} />
                </div>
              )}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales Trend Chart */}
        <motion.div
          {...ANIMATIONS.stagger(4)}
          className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Volumen de Ventas
              </h3>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                Últimos 14 días
              </p>
            </div>
            <Badge variant="info" size="sm">Soles (PEN)</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => `S/ ${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                  formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: CHART_COLORS.primary }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Business Growth Chart */}
        <motion.div
          {...ANIMATIONS.stagger(5)}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Crecimiento
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Negocios por mes
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={businessGrowth} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-20" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="creados" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name="Creados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Grid for Activity and Security */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activity Feed */}
        <motion.div
          {...ANIMATIONS.stagger(6)}
          className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Actividad Reciente
                </h3>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  Últimos eventos en la plataforma
                </p>
              </div>
              <button
                onClick={fetchData}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Refrescar
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Clock size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                  Sin actividad reciente
                </p>
              </div>
            ) : (
              recentActivity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {item.type === 'negocio_created'
                        ? `Nuevo negocio: ${item.negocio_nombre}`
                        : item.type === 'venta'
                        ? `Venta registrada: ${formatCurrency(item.monto || 0)}`
                        : `Nuevo usuario: ${item.user_nombre}`}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatRelativeTime(item.created_at)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Device Security Configuration */}
        <motion.div
          {...ANIMATIONS.stagger(7)}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Shield size={16} className="text-blue-500" />
              Seguridad del Dispositivo
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Protege el Acceso Administrativo en este equipo
            </p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Biometrics */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Fingerprint size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Huella / Rostro (Biometría)
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                      {isBiometricSupported
                        ? 'Usa Windows Hello, TouchID o FaceID de tu equipo.'
                        : 'No soportado por tu navegador o equipo.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                {isBiometricEnabled ? (
                  <button
                    onClick={handleRemoveBiometrics}
                    className="w-full py-2 px-3 rounded-lg border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 text-[11px] font-bold transition-all"
                  >
                    Desactivar Biometría
                  </button>
                ) : (
                  <button
                    disabled={!isBiometricSupported}
                    onClick={() => setShowBiometricDialog(true)}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Vincular Huella/Rostro
                  </button>
                )}
              </div>
            </div>

            {/* Pattern Lock */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 flex-shrink-0">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Patrón de Seguridad
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                      Dibuja un patrón táctil o de mouse para ingresar.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                {isPatternEnabled ? (
                  <button
                    onClick={handleRemovePattern}
                    className="w-full py-2 px-3 rounded-lg border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 text-[11px] font-bold transition-all"
                  >
                    Desactivar Patrón
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPatternStep(1);
                      setTempPattern([]);
                      setShowPatternDialog(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-sm"
                  >
                    Configurar Patrón
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Biometric Link Dialog */}
      <Dialog
        open={showBiometricDialog}
        onClose={() => {
          setShowBiometricDialog(false);
          setAdminPassword('');
        }}
        title="Vincular Biometría"
        description="Por seguridad, escribe tu contraseña de administrador para registrar tu huella/rostro en este dispositivo."
      >
        <form onSubmit={handleRegisterBiometrics} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowBiometricDialog(false);
                setAdminPassword('');
              }}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
            >
              Confirmar y Registrar
            </button>
          </div>
        </form>
      </Dialog>

      {/* Pattern Link Dialog */}
      <Dialog
        open={showPatternDialog}
        onClose={() => setShowPatternDialog(false)}
        title={patternStep === 1 ? 'Configurar Patrón' : 'Confirmar Patrón'}
        description={
          patternStep === 1
            ? 'Dibuja un patrón conectando al menos 3 puntos.'
            : 'Vuelve a dibujar el patrón para confirmarlo.'
        }
      >
        <div className="py-4">
          <PatternLock onComplete={handlePatternComplete} error={patternError} />
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowPatternDialog(false)}
            className="px-5 py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
          >
            Cancelar
          </button>
        </div>
      </Dialog>

      {/* Floating Pending Session Notification Banner */}
      <AnimatePresence>
        {pendingSession && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
          >
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-700 flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
                    Verificación de Seguridad
                  </h4>
                  <p className="text-sm font-bold mt-1">
                    ¿Estás intentando iniciar sesión en otro equipo?
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
                    Dispositivo: {pendingSession.user_agent || 'Desconocido'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  disabled={sessionActionLoading}
                  onClick={() => handleSessionAction('rejected')}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 transition-all disabled:opacity-50"
                >
                  No, bloquear
                </button>
                <button
                  disabled={sessionActionLoading}
                  onClick={() => handleSessionAction('approved')}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sessionActionLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sí, aprobar
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
