'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, AlertCircle, Package, BarChart3, Clock, Wallet, ArrowRight, Zap, Receipt, ChefHat, ClipboardList, Loader2, Navigation, Users, Flame, TrendingUp, Trash2 } from 'lucide-react';
import { useInventario } from '@/hooks/useInventario';
import { useVentas } from '@/hooks/useVentas';
import { useMetricas } from '@/hooks/useMetricas';
import GastosModal from '@/components/GastosModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { formatearFraccionPollo } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import toast from 'react-hot-toast';
import AdminAjusteModal from '@/components/AdminAjusteModal';
import { useAuth } from '@/contexts/AuthContext';
import { useBebidasConfig } from '@/hooks/useBebidasConfig';
import { useParams } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';

function DashboardContent() {
  const params = useParams();
  const { business } = useBusiness();
  const { stock, loading, refetch } = useInventario();
  const { ventas, refetch: refetchVentas } = useVentas();
  const metricasReales = useMetricas(ventas);
  const { user } = useAuth();
  const { allBrands } = useBebidasConfig();

  const metricas = stock ? metricasReales : {
    totalIngresos: 0, cantidadPedidos: 0, promedioPorPedido: 0,
    pollosVendidos: 0, gaseosasVendidas: 0, loading: false,
  };

  const [showGastosModal, setShowGastosModal] = useState(false);
  const [showAdminAjusteModal, setShowAdminAjusteModal] = useState(false);
  const [showBebidasDetalle, setShowBebidasDetalle] = useState(false);
  const [gastosDelDia, setGastosDelDia] = useState<{ id: string; descripcion: string; monto: number; metodo_pago?: string }[]>([]);

  const cargarGastos = async () => {
    const { data } = await supabase.from('gastos').select('id, descripcion, monto, metodo_pago')
      .eq('fecha', obtenerFechaHoy()).order('created_at', { ascending: false });
    setGastosDelDia(data || []);
  };

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Gasto eliminado correctamente');
      cargarGastos();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el gasto');
    }
  };

  useEffect(() => { cargarGastos(); }, []);

  const totalGastos = gastosDelDia.reduce((sum, g) => sum + g.monto, 0);
  const fechaHoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  const montosPorMetodo = ventas.reduce((acc, v) => {
    if (v.estado_pago !== 'pagado') return acc;
    if (v.pago_dividido && v.metodo_pago === 'mixto') {
      for (const [metodo, monto] of Object.entries(v.pago_dividido)) {
        if (monto && monto > 0) acc[metodo] = (acc[metodo] || 0) + monto;
      }
    } else {
      const metodo = v.metodo_pago || 'efectivo';
      acc[metodo] = (acc[metodo] || 0) + v.total;
    }
    return acc;
  }, {} as Record<string, number>);

  const getGM = (m: string) => gastosDelDia.filter(g => (!g.metodo_pago && m === 'efectivo') || g.metodo_pago === m).reduce((s, g) => s + g.monto, 0);

  // Top productos
  const productosMap = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
  ventas.forEach(v => {
    v.items.forEach(item => {
      const key = item.nombre;
      if (!productosMap.has(key)) productosMap.set(key, { nombre: key, cantidad: 0, ingresos: 0 });
      const p = productosMap.get(key)!;
      p.cantidad += item.cantidad;
      p.ingresos += item.cantidad * (item.precio || 0);
    });
  });
  const topProductos = Array.from(productosMap.values()).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

  return (
    <div className="space-y-8 pb-32">
      {/* HEADER PREMIUM (Inspirado en Referencia) */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="w-1.5 h-8 md:h-10 rounded-full shadow-sm" 
              style={{ backgroundColor: business?.color_primario || '#ef4444', boxShadow: `0 0 10px ${(business?.color_primario || '#ef4444')}44` }}
            />
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic">Panel de Control</h1>
          </motion.div>
          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4 md:ml-6 italic">
            Dashboard Operativo • {fechaHoy}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/${params.slug}/reportes`} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-100 text-slate-600 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200">
            <BarChart3 size={14} /> <span className="hidden sm:inline">Reporte</span>
          </Link>
          {(user?.rol === 'admin' || user?.rol === 'cajero') && (
            <button onClick={() => setShowAdminAjusteModal(true)} className="w-10 h-10 bg-slate-900 text-white rounded-none flex items-center justify-center hover:bg-black transition-all shadow-lg shadow-black/20 shrink-0">
              <TrendingUp size={18} />
            </button>
          )}
        </div>
      </header>

      {/* ALERTAS */}
      {(!stock && !loading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 md:p-6 bg-red-50 border border-red-100 rounded-none flex flex-col sm:flex-row items-center gap-4 md:gap-5 shadow-2xl shadow-red-500/5">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-red-500 text-white rounded-none flex items-center justify-center animate-pulse shadow-lg shadow-red-500/30">
            <AlertCircle size={28} className="md:w-8 md:h-8" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-red-900 font-black uppercase italic text-xs">Acción Requerida</h3>
            <p className="text-red-600/80 text-[10px] font-bold uppercase tracking-tight">Inventario del día no iniciado. Abre la jornada.</p>
          </div>
          <Link href={`/${params.slug}/apertura`} className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-white text-[10px] font-black rounded-none transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest italic"
            style={{ backgroundColor: business?.color_primario || '#ef4444', boxShadow: `0 10px 25px ${(business?.color_primario || '#ef4444')}44` }}
          >
            <span>Iniciar Jornada</span>
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      )}

      {/* MÉTRICAS (Adaptable Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {[
          { label: 'Ingresos Totales', value: `S/ ${metricas.totalIngresos.toFixed(2)}`, icon: Wallet, colorClass: 'metric-icon-income', trend: 'Hoy', adminOnly: true },
          { label: 'Pedidos Totales', value: String(metricas.cantidadPedidos), icon: ShoppingCart, colorClass: 'metric-icon-orders', trend: 'Procesados' },
          { label: 'Ticket Promedio', value: `S/ ${metricas.promedioPorPedido.toFixed(2)}`, icon: Receipt, colorClass: 'metric-icon-avg', trend: 'Pedido', adminOnly: true },
          { label: 'Pollos Vendidos', value: formatearFraccionPollo(metricas.pollosVendidos), icon: Package, colorClass: 'metric-icon-sold', trend: 'Consumo' },
        ].filter(m => !m.adminOnly || (user?.rol === 'admin' || user?.rol === 'cajero')).map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 sm:p-6 border shadow-sm hover:shadow-xl transition-all group overflow-hidden relative min-h-[140px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 opacity-[0.03] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <m.icon size={64} className="sm:w-24 sm:h-24" />
            </div>
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-none flex items-center justify-center ${m.colorClass} shadow-inner transition-transform group-hover:scale-105`}>
                <m.icon size={18} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
              </div>
              <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">{m.trend}</span>
            </div>
            <div className="mt-4">
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{m.label}</p>
              <p className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tighter italic leading-none">{m.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* DISTRIBUCIÓN POR MÉTODO DE PAGO (Dense Grid) */}
      {(user?.rol === 'admin' || user?.rol === 'cajero') && stock && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Efectivo', monto: (stock.dinero_inicial || 0) + (montosPorMetodo['efectivo'] || 0) - getGM('efectivo'), icon: '/images/cash-icon.png' },
            { label: 'Yape', monto: (montosPorMetodo['yape'] || 0) - getGM('yape'), icon: '/images/yape-logo.png' },
            { label: 'Plin', monto: (montosPorMetodo['plin'] || 0) - getGM('plin'), icon: '/images/plin-logo.png' },
            { label: 'Tarjeta', monto: (montosPorMetodo['tarjeta'] || 0), icon: '/images/card-icon.png' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 md:gap-4 p-3 md:p-5 bg-white border border-slate-100 rounded-none shadow-sm hover:shadow-md transition-all group">
              <div className="relative w-8 h-8 md:w-10 md:h-10 shrink-0 transform group-hover:scale-110 transition-transform">
                <Image src={b.icon} alt={b.label} fill className="object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5 md:mb-1">{b.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[8px] md:text-[10px] font-black text-slate-300">S/</span>
                  <p className="text-sm md:text-lg font-black text-slate-900 tracking-tight">{b.monto.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECCIÓN OPERATIVA (Inventario + Accesos) */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* IZQUIERDA: Inventario + Top */}
        <div className="lg:col-span-8 space-y-8">
          {/* Inventario Real-time */}
          <div className="glass-panel overflow-hidden border-slate-200">
            <div className="flex items-center justify-between px-8 py-6 bg-slate-50 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Gestión de Inventario</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estado actual del stock de cocina</p>
              </div>
              {stock && (
                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm animate-pulse-slow">
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest">En Línea</span>
                </div>
              )}
            </div>

            {!stock ? (
              <div className="py-20 text-center">
                <Package size={48} className="text-slate-100 mx-auto mb-4" />
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest px-4">Inicia la jornada para ver el stock</p>
              </div>
            ) : (
              <div className="p-4 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                  {/* Pollo */}
                  <div className="p-5 sm:p-6 bg-slate-50 border border-slate-100 rounded-none hover:border-rodrigo-terracotta/30 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pollos Brasa</span>
                      <Flame className="text-rodrigo-terracotta/40 group-hover:text-rodrigo-terracotta group-hover:scale-125 transition-all" size={20} />
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter mb-2 italic">{formatearFraccionPollo(stock.pollos_disponibles)}</p>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(stock.pollos_disponibles / (stock.pollos_iniciales || 1)) * 100}%` }} className="h-full bg-rodrigo-terracotta rounded-full" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">de {stock.pollos_iniciales}u iniciales</p>
                  </div>

                  {/* Chicha */}
                  <div className="p-5 sm:p-6 bg-slate-50 border border-slate-100 rounded-none hover:border-purple-200 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chicha Morada</span>
                      <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_10px_purple]" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter mb-2 italic">{(stock.chicha_disponible || 0).toFixed(1)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Litros disponibles</p>
                  </div>

                  {/* Gaseosas */}
                  <div className="p-5 sm:p-6 bg-slate-50 border border-slate-100 rounded-none hover:border-blue-200 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refrescos</span>
                      <div className="w-3.5 h-3.5 bg-blue-500 rounded-lg shadow-[0_0_10px_blue]" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter mb-2 italic">{stock.gaseosas_disponibles}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unidades en stock</p>
                  </div>
                </div>

                <button onClick={() => setShowBebidasDetalle(!showBebidasDetalle)} className="w-full h-14 rounded-none bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm">
                  {showBebidasDetalle ? 'Ocultar Detalle' : 'Inventario de Bebidas'}
                  <ArrowRight className={`transition-transform duration-300 ${showBebidasDetalle ? 'rotate-90' : ''}`} size={16} />
                </button>

                <AnimatePresence>
                  {showBebidasDetalle && stock.bebidas_detalle && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allBrands.map((marca) => {
                          const brandData = (stock.bebidas_detalle as any)?.[marca.key] as Record<string, number> | undefined;
                          if (!brandData) return null;
                          const totalUnidades = Object.values(brandData).reduce((s, v) => s + (v || 0), 0);
                          if (totalUnidades === 0) return null;

                          return (
                            <div key={marca.key} className="p-4 bg-white border border-slate-100 rounded-none shadow-sm">
                              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-50">
                                <div className={`w-2.5 h-2.5 rounded-full ${marca.dot}`} />
                                <span className="text-[10px] font-black uppercase text-slate-800 tracking-tight">{marca.name}</span>
                                <span className="ml-auto text-[9px] font-bold text-slate-400">{totalUnidades}u</span>
                              </div>
                              <div className="space-y-1.5">
                                {marca.sizes.map((size) => {
                                  const qty = brandData[size.key] || 0;
                                  if (qty === 0) return null;
                                  return (
                                    <div key={size.key} className="flex justify-between items-center text-[10px]">
                                      <span className="font-bold text-slate-500 uppercase tracking-tighter">{size.label}</span>
                                      <span className="font-black text-slate-900">{qty}u</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Top Productos (Inspirado en Referencia) */}
          <div className="p-8 bg-white border border-slate-100 rounded-none shadow-sm">
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-8">Productos Más Vendidos</h2>
            <div className="space-y-6">
              {topProductos.map((p, i) => {
                const maxQty = topProductos[0]?.cantidad || 1;
                const pct = Math.round((p.cantidad / maxQty) * 100);
                const colors = ['bg-rodrigo-terracotta', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-slate-900'];
                return (
                  <div key={p.nombre} className="flex items-center gap-6 group">
                    <span className="w-10 h-10 rounded-none bg-slate-50 flex items-center justify-center text-sm font-black text-slate-300 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-black text-slate-700 uppercase italic">{p.nombre}</span>
                        {(user?.rol === 'admin' || user?.rol === 'cajero') && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] font-black text-slate-300">S/</span>
                            <span className="text-sm font-black text-slate-900">{(p.ingresos).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full rounded-full ${colors[i % colors.length]}`} />
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <p className="text-xs font-black text-slate-400">{p.cantidad}x</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DERECHA: Accesos + Gastos */}
        <div className="lg:col-span-4 space-y-8">
          {/* Accesos Quick */}
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Caja POS', icon: ShoppingCart, href: `/${params.slug}/pos`, color: business?.color_primario || '#ef4444' },
              { label: 'Cocina', icon: ChefHat, href: `/${params.slug}/cocina`, color: '#0f172a' },
              { label: 'Deliverys', icon: Navigation, href: `/${params.slug}/delivery`, color: '#2563eb' }
            ].map((a, i) => (
              <Link key={a.href} href={a.href}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-none shadow-sm hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 text-white rounded-none flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform"
                    style={{ backgroundColor: a.color }}
                  >
                    <a.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{a.label}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acceso Rápido • {i + 1}</p>
                  </div>
                  <ArrowRight className="ml-auto text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" size={20} />
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Egresos/Gastos (Clean Card) */}
          <div className="bg-white border border-slate-100 rounded-none shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Egresos</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resumen de costos hoy</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-red-500 tracking-tighter">S/ {totalGastos.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-4">
              {gastosDelDia.length > 0 ? (
                gastosDelDia.map(g => (
                  <div key={g.id} className="p-4 bg-slate-50 rounded-none flex items-center justify-between border border-transparent hover:border-red-100 transition-all group/gasto">
                    <div className="flex items-center gap-4 flex-1 mr-3">
                      <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded-none flex items-center justify-center font-black text-[10px] uppercase">
                        {g.metodo_pago?.[0] || 'E'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 uppercase truncate italic">{g.descripcion}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{g.metodo_pago || 'efectivo'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-black text-red-500">-S/ {g.monto.toFixed(2)}</p>
                      <button 
                        onClick={() => eliminarGasto(g.id)}
                        className="opacity-0 group-hover/gasto:opacity-100 p-1.5 text-slate-300 hover:text-red-600 transition-all active:scale-90"
                        title="Eliminar gasto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center h-full">
                  <Receipt size={48} className="text-slate-100 mb-4" />
                  <p className="text-xs text-slate-300 font-black uppercase tracking-[0.2em]">Sin gastos hoy</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 sticky bottom-0">
              <button 
                onClick={() => {
                  if (!stock) {
                    toast.error('DEBES REALIZAR LA APERTURA DEL DÍA ANTES DE REGISTRAR GASTOS', {
                      icon: '🚫',
                      style: { borderRadius: '0', fontWeight: 'bold' }
                    });
                    return;
                  }
                  setShowGastosModal(true);
                }} 
                className="w-full py-5 bg-white border-2 border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-none hover:border-red-500 hover:text-red-500 hover:bg-white transition-all shadow-sm active:scale-95"
              >
                + Registrar Nuevo Gasto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALES */}
      <AnimatePresence>
        {showGastosModal && <GastosModal isOpen={showGastosModal} onClose={() => setShowGastosModal(false)} onGastoRegistrado={cargarGastos} />}
        {showAdminAjusteModal && <AdminAjusteModal isOpen={showAdminAjusteModal} onClose={() => setShowAdminAjusteModal(false)} onSuccess={() => { refetch(); refetchVentas(); }} />}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute requiredPermission="dashboard">
      <DashboardContent />
    </ProtectedRoute>
  );
}
