'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, TrendingDown, Calendar, FileSpreadsheet, Star, Clock, CreditCard, Home, Package, ChevronLeft, ChevronRight, X, Filter, BarChart3, Printer, FileText, ChevronDown, Download, Pencil, Trash2, Search, SlidersHorizontal, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import {
    obtenerVentasPorRango,
    obtenerVentasPorDia,
    calcularTopProductos,
    calcularDesgloseMetodoPago,
    calcularConsumoPollosPorDia,
    calcularDistribucionTipoVenta,
    obtenerComparativaSemanal,
    obtenerVentasPorHora,
    obtenerInventarioPorRango,
    obtenerGastosPorRango,
    calcularConsumoChicha,
    type EstadisticaProducto,
    type DesgloseMetodoPago,
    type ConsumoPollosDia,
    type DistribucionTipoVenta,
    type ComparativaSemanal
} from '@/lib/reportes';
import { useMetricas } from '@/hooks/useMetricas';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Venta, InventarioDiario, Gasto } from '@/lib/database.types';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatearFraccionPollo } from '@/lib/utils';
import { generarReporteExcelReportes } from '@/lib/excelReportes';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import ReceiptModal from '@/components/ReceiptModal';
import AdminReportModal from '@/components/AdminReportModal';
import EditPaymentModal from '@/components/EditPaymentModal';
import AnulacionModal from '@/components/AnulacionModal';
import { registrarAnulacion } from '@/lib/anulaciones';

type TipoRango = 'dia' | 'rango';

export default function ReportesPage() {
    const { user } = useAuth();
    const { business } = useBusiness();
    
    // Filtros de fecha
    const [tipoRango, setTipoRango] = useState<TipoRango>('dia');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [fechaInicio, setFechaInicio] = useState(new Date());
    const [fechaFin, setFechaFin] = useState(new Date());
    const [mesCalendario, setMesCalendario] = useState(new Date());
    const [mostrarCalendario, setMostrarCalendario] = useState(false);

    // Filtros avanzados
    const [filtroTipo, setFiltroTipo] = useState<string>('todos'); 
    const [filtroPago, setFiltroPago] = useState<string>('todos'); 
    const [searchTerm, setSearchTerm] = useState('');

    const [ventasOriginales, setVentasOriginales] = useState<Venta[]>([]);
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [ventasPorDia, setVentasPorDia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [inventarios, setInventarios] = useState<InventarioDiario[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    
    // Estados Modales originales
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
    const [showEditPayment, setShowEditPayment] = useState(false);
    const [ventaToEdit, setVentaToEdit] = useState<Venta | null>(null);
    const [showAdminReport, setShowAdminReport] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingVentaId, setCancellingVentaId] = useState<string | null>(null);

    // UI States
    const [showAllProducts, setShowAllProducts] = useState(false);
    const [limit, setLimit] = useState(20);

    const metricas = useMetricas(ventas);
    const [topProductos, setTopProductos] = useState<EstadisticaProducto[]>([]);
    const [desgloseMetodoPago, setDesgloseMetodoPago] = useState<DesgloseMetodoPago[]>([]);
    const [consumoPollos, setConsumoPollos] = useState<ConsumoPollosDia[]>([]);
    const [distribucionTipo, setDistribucionTipo] = useState<DistribucionTipoVenta[]>([]);
    const [comparativa, setComparativa] = useState<ComparativaSemanal | null>(null);
    const [ventasPorHora, setVentasPorHora] = useState<{ hora: string; total: number; cantidad: number }[]>([]);

    const CHART_COLORS = {
        primary: '#2563eb', 
        secondary: '#0ea5e9', 
        grid: '#f1f5f9'
    };

    const rangosRapidos = [
        { label: 'Hoy', action: () => { setTipoRango('dia'); setFechaSeleccionada(new Date()); } },
        { label: 'Ayer', action: () => { setTipoRango('dia'); setFechaSeleccionada(subDays(new Date(), 1)); } },
        { label: 'Semana', action: () => { setTipoRango('rango'); setFechaInicio(startOfWeek(new Date(), { weekStartsOn: 1 })); setFechaFin(new Date()); } },
        { label: 'Mes', action: () => { setTipoRango('rango'); setFechaInicio(startOfMonth(new Date())); setFechaFin(new Date()); } },
    ];

    useEffect(() => {
        cargarDatosBase();
    }, [fechaSeleccionada, fechaInicio, fechaFin, tipoRango, business?.id]);

    useEffect(() => {
        aplicarFiltrosAdicionales();
    }, [filtroTipo, filtroPago, searchTerm, ventasOriginales]);

    const cargarDatosBase = async () => {
        if(!business?.id) return;
        setLoading(true);
        try {
            let inicio = tipoRango === 'dia' ? format(fechaSeleccionada, 'yyyy-MM-dd') : format(fechaInicio, 'yyyy-MM-dd');
            let fin = tipoRango === 'dia' ? format(fechaSeleccionada, 'yyyy-MM-dd') : format(fechaFin, 'yyyy-MM-dd');

            const [ventasData, inventariosData, gastosData, ventasDia, comp] = await Promise.all([
                obtenerVentasPorRango(inicio, fin, business.id),
                obtenerInventarioPorRango(inicio, fin, business.id),
                obtenerGastosPorRango(inicio, fin, business.id),
                obtenerVentasPorDia(inicio, fin, business.id),
                obtenerComparativaSemanal(business.id)
            ]);

            setVentasOriginales(ventasData);
            setInventarios(inventariosData);
            setGastos(gastosData);
            setVentasPorDia(ventasDia);
            setComparativa(comp);
            
        } catch (error) {
            console.error('[Reportes] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const aplicarFiltrosAdicionales = () => {
        let filtradas = [...ventasOriginales];
        
        if (filtroTipo !== 'todos') {
            filtradas = filtradas.filter(v => v.tipo_pedido === filtroTipo);
        }
        
        if (filtroPago !== 'todos') {
            filtradas = filtradas.filter(v => {
                if (filtroPago === 'digital') return ['yape', 'plin', 'tarjeta'].includes(v.metodo_pago);
                return v.metodo_pago === filtroPago;
            });
        }
        
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtradas = filtradas.filter(v => 
                v.nombre_cliente?.toLowerCase().includes(searchLower) ||
                v.id.toLowerCase().includes(searchLower) ||
                v.items?.some((item: any) => item.nombre.toLowerCase().includes(searchLower))
            );
        }

        setVentas(filtradas);
        setTopProductos(calcularTopProductos(filtradas));
        setDesgloseMetodoPago(calcularDesgloseMetodoPago(filtradas));
        setConsumoPollos(calcularConsumoPollosPorDia(filtradas));
        setDistribucionTipo(calcularDistribucionTipoVenta(filtradas));
        setVentasPorHora(obtenerVentasPorHora(filtradas));
    };

    const totalInicial = inventarios.reduce((sum, inv) => sum + (inv.dinero_inicial || 0), 0);
    const ventasEfectivo = ventas.reduce((sum, v) => v.metodo_pago === 'efectivo' ? sum + v.total : (v.pago_dividido?.efectivo ? sum + v.pago_dividido.efectivo : sum), 0);
    const ventasDigital = ventas.reduce((sum, v) => ['yape', 'plin', 'tarjeta'].includes(v.metodo_pago) ? sum + v.total : (v.pago_dividido ? sum + (v.pago_dividido.yape || 0) + (v.pago_dividido.plin || 0) + (v.pago_dividido.tarjeta || 0) : sum), 0);
    const gastosEfectivo = gastos.reduce((sum, g) => (!g.metodo_pago || g.metodo_pago === 'efectivo') ? sum + g.monto : sum, 0);
    const gastosDigital = gastos.reduce((sum, g) => ['yape', 'plin'].includes(g.metodo_pago || '') ? sum + g.monto : sum, 0);
    const efectivoEnCaja = totalInicial + ventasEfectivo - gastosEfectivo;

    // Lógica Modales Originales
    const handleDeleteVentaClick = (ventaId: string) => {
        setCancellingVentaId(ventaId);
        setShowCancelModal(true);
    };

    const confirmDeleteVenta = async (motivo: string) => {
        if (!cancellingVentaId || !user || !business) return;
        try {
            const result = await registrarAnulacion(cancellingVentaId, motivo, user.id, user.nombre, business.id);
            if (result.success) {
                toast.success('Venta eliminada correctamente');
                cargarDatosBase();
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error('Error al eliminar la venta');
        } finally {
            setShowCancelModal(false);
            setCancellingVentaId(null);
        }
    };

    const exportarExcel = async () => {
        if (ventas.length === 0 && inventarios.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }

        const sortedInventarios = [...inventarios].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        const primerInv = sortedInventarios[0];
        const ultimoInv = sortedInventarios[sortedInventarios.length - 1];

        const stockResumen = {
            pollosIniciales: primerInv?.pollos_enteros || 0,
            pollosVendidos: metricas.pollosVendidos,
            pollosCena: inventarios.reduce((sum, inv) => sum + (inv.cena_personal || 0), 0),
            pollosGolpeados: inventarios.reduce((sum, inv) => sum + (inv.pollos_golpeados || 0), 0),
            pollosFinalReal: ultimoInv?.stock_pollos_real || 0,
            papasIniciales: primerInv?.papas_iniciales || 0,
            papasFinales: ultimoInv?.papas_finales || 0,
            chichaInicial: primerInv?.chicha_inicial || 0,
            chichaVendida: calcularConsumoChicha(ventas),
            chichaFinalReal: ultimoInv?.chicha_inicial || 0,
            bebidasFinales: ultimoInv?.bebidas_detalle || null
        };

        toast.loading('Generando Excel empresarial...', { id: 'excel' });
        try {
            await generarReporteExcelReportes({
                periodo: getPeriodoTexto(),
                metricas, ventas, topProductos, desgloseMetodoPago, consumoPollos, distribucionTipo,
                comparativa, ventasPorHora, inventarios, gastos,
                caja: { inicial: totalInicial, ventasEfectivo, ventasDigital, gastosEfectivo, gastosDigital, efectivoEnCaja },
                stockResumen, businessName: business?.nombre || 'Mi Negocio'
            });
            toast.success('Excel descargado correctamente', { id: 'excel' });
        } catch (error) {
            toast.error('Error al generar Excel', { id: 'excel' });
        }
    };

    const getPeriodoTexto = () => {
        if (tipoRango === 'dia') return format(fechaSeleccionada, "EEEE, d 'de' MMMM yyyy", { locale: es });
        return `${format(fechaInicio, 'd MMM')} - ${format(fechaFin, 'd MMM yyyy', { locale: es })}`;
    };

    const StatCard = ({ title, value, icon: Icon, bg, color }: any) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-black text-slate-900">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Cabecera y Filtros Avanzados */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-blue-600" /> Reportes
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Analiza el rendimiento y filtra operaciones</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => setShowAdminReport(true)} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                <FileText className="w-4 h-4" /> Admin
                            </button>
                            <button onClick={exportarExcel} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                                <FileSpreadsheet className="w-4 h-4" /> Exportar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Fecha */}
                        <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-1 flex">
                            <button onClick={() => setTipoRango('dia')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoRango === 'dia' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Diario</button>
                            <button onClick={() => setTipoRango('rango')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tipoRango === 'rango' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Por Rango</button>
                            {rangosRapidos.map((r, i) => (
                                <button key={i} onClick={r.action} className="hidden lg:block flex-1 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">{r.label}</button>
                            ))}
                        </div>
                        
                        <div className="md:col-span-3">
                            <button onClick={() => setMostrarCalendario(!mostrarCalendario)} className="w-full bg-white border border-slate-200 hover:border-blue-400 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm font-semibold text-slate-700 transition-colors">
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> {getPeriodoTexto()}</span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Filtros de Venta */}
                        <div className="md:col-span-2">
                            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="todos">Todos los Canales</option>
                                <option value="salon">Salón</option>
                                <option value="llevar">Para Llevar</option>
                                <option value="delivery">Delivery</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)} className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="todos">Todos los Pagos</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="digital">Digital (Yape/Plin/Tarj)</option>
                            </select>
                        </div>
                    </div>
                    
                    {mostrarCalendario && (
                         <div className="mt-4 p-4 border border-slate-200 bg-slate-50 rounded-xl max-w-sm">
                             <p className="text-xs font-bold text-slate-500 uppercase mb-2">Seleccionar Fechas Manualmente</p>
                             <div className="flex gap-2 mt-2">
                                <input type="date" value={tipoRango === 'dia' ? format(fechaSeleccionada, 'yyyy-MM-dd') : format(fechaInicio, 'yyyy-MM-dd')} onChange={e => {
                                    if(tipoRango === 'dia') setFechaSeleccionada(new Date(e.target.value + 'T12:00:00'));
                                    else setFechaInicio(new Date(e.target.value + 'T12:00:00'));
                                }} className="w-full border border-slate-300 p-2 rounded-lg text-sm text-slate-700 focus:ring-blue-500 outline-none" />
                                
                                {tipoRango === 'rango' && (
                                    <input type="date" value={format(fechaFin, 'yyyy-MM-dd')} onChange={e => setFechaFin(new Date(e.target.value + 'T12:00:00'))} className="w-full border border-slate-300 p-2 rounded-lg text-sm text-slate-700 focus:ring-blue-500 outline-none" />
                                )}
                             </div>
                         </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                ) : (
                    <div className="space-y-6">
                        {/* KPIs Principales */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Ingresos Brutos" value={`S/ ${metricas.totalIngresos.toFixed(2)}`} icon={DollarSign} bg="bg-green-100" color="text-green-600" />
                            <StatCard title="Total Pedidos" value={metricas.cantidadPedidos.toString()} icon={ShoppingBag} bg="bg-blue-100" color="text-blue-600" />
                            <StatCard title="Ticket Promedio" value={`S/ ${metricas.promedioPorPedido.toFixed(2)}`} icon={CreditCard} bg="bg-purple-100" color="text-purple-600" />
                            <StatCard title="Pollos Vendidos" value={formatearFraccionPollo(metricas.pollosVendidos)} icon={Package} bg="bg-orange-100" color="text-orange-600" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Flujo de Caja Profesional */}
                            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><DollarSign className="w-5 h-5 text-emerald-500"/> Flujo de Caja (Efectivo)</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-sm font-medium text-slate-500">Base Inicial (Apertura)</span>
                                            <span className="font-bold text-slate-800">S/ {totalInicial.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-sm font-medium text-slate-500">Ventas en Efectivo</span>
                                            <span className="font-bold text-emerald-600">+ S/ {ventasEfectivo.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-sm font-medium text-slate-500">Gastos en Efectivo</span>
                                            <span className="font-bold text-rose-500">- S/ {gastosEfectivo.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t-2 border-slate-100 flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                                    <span className="text-sm font-bold text-slate-800">Efectivo Físico Esperado</span>
                                    <span className="text-2xl font-black text-slate-900">S/ {efectivoEnCaja.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Tendencia / Peak Times */}
                            {tipoRango === 'rango' ? (
                                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-blue-500"/> Tendencia de Facturación</h3>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={ventasPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Area type="monotone" dataKey="total" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorVentas)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Clock className="w-5 h-5 text-blue-500"/> Ventas por Hora (Peak Times)</h3>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={ventasPorHora} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
                                                <Bar dataKey="total" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Productos Optimizados */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500"/> Productos Más Vendidos</h3>
                                    <button onClick={() => setShowAllProducts(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">Ver detalle completo</button>
                                </div>
                                <div className="space-y-3">
                                    {topProductos.slice(0, 5).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{p.nombre_producto}</p>
                                                    <p className="text-xs font-medium text-slate-500">{p.cantidad_total} unidades</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 text-sm">S/ {p.ingresos_total.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {topProductos.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No hay datos de productos.</p>}
                                </div>
                            </div>

                            {/* Distribución de Pago y Canal */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><CreditCard className="w-5 h-5 text-purple-500"/> Medios de Pago</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        {desgloseMetodoPago.map((m, i) => (
                                            <div key={i} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-center">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs font-bold text-slate-500 uppercase">{m.metodo}</p>
                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{m.porcentaje.toFixed(1)}%</span>
                                                </div>
                                                <p className="font-black text-lg text-slate-900">S/ {m.total.toFixed(2)}</p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-1">{m.cantidad} transacciones</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="border-t border-slate-100 pt-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Home className="w-5 h-5 text-indigo-500"/> Canales de Venta</h3>
                                    <div className="space-y-4">
                                        {distribucionTipo.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 w-28">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                    <span className="font-semibold text-slate-700">{d.tipo}</span>
                                                </div>
                                                <div className="flex-1 mx-4 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${d.porcentaje}%` }}></div>
                                                </div>
                                                <div className="w-24 text-right">
                                                    <span className="font-bold text-slate-900">{d.porcentaje.toFixed(0)}%</span>
                                                    <span className="text-[10px] text-slate-400 block">S/ {d.total.toFixed(0)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* TABLA DE TRANSACCIONES RESTAURADA */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
                            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Registro de Transacciones</h3>
                                    <p className="text-sm text-slate-500">{ventas.length} resultados encontrados</p>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar cliente o código..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Fecha / Hora</th>
                                            <th className="px-6 py-4">Canal / ID</th>
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Método Pago</th>
                                            <th className="px-6 py-4 text-right">Total</th>
                                            <th className="px-6 py-4 text-center">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ventas.slice(0, limit).map((venta) => (
                                            <tr key={venta.id} className={`hover:bg-slate-50 transition-colors ${venta.estado_pedido === 'anulado' ? 'opacity-60' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-slate-900">{format(new Date(venta.created_at), 'dd/MM/yyyy')}</div>
                                                    <div className="text-xs text-slate-500">{format(new Date(venta.created_at), 'HH:mm')}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium capitalize text-slate-900">{venta.tipo_pedido}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">...{venta.id.slice(-6)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900 line-clamp-1 max-w-[150px]">{venta.nombre_cliente || 'Cliente'}</div>
                                                    <div className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-xs" title={venta.items?.map((i: any) => `${i.cantidad}x ${i.nombre}`).join(', ')}>
                                                        {venta.items?.map((i: any) => `${i.cantidad}x ${i.nombre}`).join(', ')}
                                                    </div>
                                                    {venta.tipo_pedido === 'delivery' && venta.repartidor?.nombre && (
                                                        <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                                                            🏍️ Repartidor: {venta.repartidor.nombre}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                                                        ${venta.metodo_pago === 'efectivo' ? 'bg-emerald-100 text-emerald-700' :
                                                        venta.metodo_pago === 'yape' ? 'bg-purple-100 text-purple-700' :
                                                        venta.metodo_pago === 'plin' ? 'bg-cyan-100 text-cyan-700' :
                                                        venta.metodo_pago === 'tarjeta' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'}`}>
                                                        {venta.metodo_pago}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">
                                                    S/ {venta.total.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                                        ${venta.estado_pedido === 'anulado' ? 'bg-red-100 text-red-700' :
                                                        venta.estado_pedido === 'entregado' ? 'bg-green-100 text-green-700' :
                                                        venta.estado_pago === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-yellow-100 text-yellow-700'}`}>
                                                        {venta.estado_pedido === 'anulado' ? 'ANULADO' : 
                                                         venta.estado_pedido === 'entregado' ? 'ENTREGADO' : 
                                                         venta.estado_pago === 'pagado' ? 'PAGADO' : 
                                                         (venta.estado_pedido || 'PENDIENTE')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button 
                                                            onClick={() => { setSelectedVenta(venta); setShowReceipt(true); }}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Ver recibo / Imprimir"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        {user?.rol === 'admin' && venta.estado_pedido !== 'anulado' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => { setVentaToEdit(venta); setShowEditPayment(true); }}
                                                                    className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                                    title="Editar método de pago"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteVentaClick(venta.id)}
                                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Anular venta"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {ventas.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                    No se encontraron transacciones que coincidan con los filtros.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {ventas.length > limit && (
                                <div className="p-4 border-t border-slate-100 text-center bg-slate-50">
                                    <button 
                                        onClick={() => setLimit(prev => prev + 20)}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Cargar más resultados ({limit} de {ventas.length})
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Modal de Lista Completa de Productos */}
            {showAllProducts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500"/> Todos los Productos Vendidos</h2>
                                <p className="text-sm text-slate-500 mt-1">Ranking completo del período seleccionado</p>
                            </div>
                            <button onClick={() => setShowAllProducts(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-xl transition-colors border border-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-16 text-center">#</th>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3 text-center">Cantidad</th>
                                        <th className="px-4 py-3 text-right">Ingresos Generados</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topProductos.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-center font-bold text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-3 font-bold text-slate-800">{p.nombre_producto}</td>
                                            <td className="px-4 py-3 text-center font-medium text-slate-600">{p.cantidad_total} ud.</td>
                                            <td className="px-4 py-3 text-right font-black text-slate-900">S/ {p.ingresos_total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modales Originales Restaurados */}
            {showAdminReport && (
                <AdminReportModal
                    isOpen={showAdminReport}
                    onClose={() => setShowAdminReport(false)}
                    ventas={ventasOriginales} 
                    inventarios={inventarios}
                    gastos={gastos}
                    fechaInicio={tipoRango === 'dia' ? fechaSeleccionada : fechaInicio}
                    fechaFin={tipoRango === 'dia' ? fechaSeleccionada : fechaFin}
                />
            )}

            {showReceipt && selectedVenta && (
                <ReceiptModal
                    isOpen={showReceipt}
                    onClose={() => {
                        setShowReceipt(false);
                        setSelectedVenta(null);
                    }}
                    items={selectedVenta.items || []}
                    total={selectedVenta.total || 0}
                    orderId={selectedVenta.id}
                    title="COMPROBANTE DE VENTA"
                    clienteNombre={selectedVenta.nombre_cliente}
                    clienteDocumento={selectedVenta.documento_cliente}
                    metodoPago={selectedVenta.metodo_pago}
                    pagoDividido={selectedVenta.pago_dividido}
                    tipoComprobante={(selectedVenta.comprobante_tipo?.toUpperCase() as any) || 'TICKET'}
                    comprobanteSerie={selectedVenta.comprobante_serie || undefined}
                    comprobanteNumero={selectedVenta.comprobante_numero || undefined}
                />
            )}

            {showEditPayment && ventaToEdit && (
                <EditPaymentModal
                    isOpen={showEditPayment}
                    onClose={() => {
                        setShowEditPayment(false);
                        setVentaToEdit(null);
                    }}
                    venta={ventaToEdit}
                    onUpdate={cargarDatosBase}
                />
            )}

            <AnulacionModal
                isOpen={showCancelModal}
                onClose={() => {
                    setShowCancelModal(false);
                    setCancellingVentaId(null);
                }}
                onConfirm={confirmDeleteVenta}
            />
        </div>
    );
}
