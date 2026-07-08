'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, TrendingDown, Calendar, FileSpreadsheet, Star, Clock, CreditCard, Home, Package, ChevronLeft, ChevronRight, X, Filter, BarChart3, Printer, FileText, ChevronDown, Download, Pencil } from 'lucide-react';
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

type TipoRango = 'dia' | 'rango';

const CHART_COLORS = {
    primary: 'var(--theme-primary)',   
    secondary: 'var(--theme-secondary)', 
    info: '#38bdf8',      // Sky
    emerald: '#10b981',
    rose: '#f43f5e'
};
export default function ReportesPage() {
    const [tipoRango, setTipoRango] = useState<TipoRango>('dia');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [fechaInicio, setFechaInicio] = useState(new Date());
    const [fechaFin, setFechaFin] = useState(new Date());
    const [mesCalendario, setMesCalendario] = useState(new Date());
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [seleccionandoRango, setSeleccionandoRango] = useState<'inicio' | 'fin'>('inicio');

    const [ventas, setVentas] = useState<Venta[]>([]);
    const [ventasPorDia, setVentasPorDia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);

    const [showEditPayment, setShowEditPayment] = useState(false);
    const [ventaToEdit, setVentaToEdit] = useState<Venta | null>(null);

    const [limit, setLimit] = useState(20);

    const [showAdminReport, setShowAdminReport] = useState(false);
    const [inventarios, setInventarios] = useState<InventarioDiario[]>([]);
    const [gastos, setGastos] = useState<Gasto[]>([]);

    const metricas = useMetricas(ventas);
    const [topProductos, setTopProductos] = useState<EstadisticaProducto[]>([]);
    const [desgloseMetodoPago, setDesgloseMetodoPago] = useState<DesgloseMetodoPago[]>([]);
    const [consumoPollos, setConsumoPollos] = useState<ConsumoPollosDia[]>([]);
    const [distribucionTipo, setDistribucionTipo] = useState<DistribucionTipoVenta[]>([]);
    const [comparativa, setComparativa] = useState<ComparativaSemanal | null>(null);
    const [ventasPorHora, setVentasPorHora] = useState<{ hora: string; total: number; cantidad: number }[]>([]);

    // Colors aligned with premium theme
    const CHART_COLORS = {
        primary: 'var(--theme-primary)', 
        secondary: 'var(--theme-secondary)', 
        tertiary: '#5A3E2B',
        success: '#10B981',
        warning: '#F59E0B',
        info: '#3B82F6',
        text: '#64748b', // Slate 500
        grid: '#f1f5f9' // Slate 100
    };

    const METODO_COLORS: Record<string, string> = {
        'Efectivo': '#10B981',
        'Yape': '#7C3AED',
        'Plin': '#06B6D4',
        'Tarjeta': '#3B82F6'
    };

    const rangosRapidos = [
        { label: 'Hoy', action: () => { setTipoRango('dia'); setFechaSeleccionada(new Date()); } },
        { label: 'Ayer', action: () => { setTipoRango('dia'); setFechaSeleccionada(subDays(new Date(), 1)); } },
        {
            label: 'Esta semana', action: () => {
                setTipoRango('rango');
                setFechaInicio(startOfWeek(new Date(), { weekStartsOn: 1 }));
                setFechaFin(new Date());
            }
        },
        {
            label: 'Últimos 7 días', action: () => {
                setTipoRango('rango');
                setFechaInicio(subDays(new Date(), 6));
                setFechaFin(new Date());
            }
        },
        {
            label: 'Este mes', action: () => {
                setTipoRango('rango');
                setFechaInicio(startOfMonth(new Date()));
                setFechaFin(new Date());
            }
        },
    ];

    useEffect(() => {
        cargarDatos();
    }, [fechaSeleccionada, fechaInicio, fechaFin, tipoRango]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            let inicio: string, fin: string;

            if (tipoRango === 'dia') {
                inicio = format(fechaSeleccionada, 'yyyy-MM-dd');
                fin = inicio;
            } else {
                inicio = format(fechaInicio, 'yyyy-MM-dd');
                fin = format(fechaFin, 'yyyy-MM-dd');
            }

            const [ventasData, inventariosData, gastosData, ventasDia, comp] = await Promise.all([
                obtenerVentasPorRango(inicio, fin),
                obtenerInventarioPorRango(inicio, fin),
                obtenerGastosPorRango(inicio, fin),
                obtenerVentasPorDia(inicio, fin),
                obtenerComparativaSemanal()
            ]);

            setVentas(ventasData);
            setInventarios(inventariosData);
            setGastos(gastosData);
            setVentasPorDia(ventasDia);
            setComparativa(comp);

            setTopProductos(calcularTopProductos(ventasData));
            setDesgloseMetodoPago(calcularDesgloseMetodoPago(ventasData));
            setConsumoPollos(calcularConsumoPollosPorDia(ventasData));
            setDistribucionTipo(calcularDistribucionTipoVenta(ventasData));
            setVentasPorHora(obtenerVentasPorHora(ventasData));
            setLoading(false);

        } catch (error) {
            console.error('[Reportes] Error:', error);
            setLoading(false);
        }
    };

    const totalInicial = inventarios.reduce((sum, inv) => sum + (inv.dinero_inicial || 0), 0);

    const ventasEfectivo = ventas.reduce((sum, v) => {
        if (v.metodo_pago === 'efectivo') return sum + v.total;
        if (v.metodo_pago === 'mixto' && v.pago_dividido?.efectivo) return sum + v.pago_dividido.efectivo;
        return sum;
    }, 0);

    const ventasDigital = ventas.reduce((sum, v) => {
        if (['yape', 'plin', 'tarjeta'].includes(v.metodo_pago)) return sum + v.total;
        if (v.metodo_pago === 'mixto') {
            const digital = (v.pago_dividido?.yape || 0) + (v.pago_dividido?.plin || 0) + (v.pago_dividido?.tarjeta || 0);
            return sum + digital;
        }
        return sum;
    }, 0);

    const gastosEfectivo = gastos.reduce((sum, g) => {
        if (!g.metodo_pago || g.metodo_pago === 'efectivo') return sum + g.monto;
        return sum;
    }, 0);

    const gastosDigital = gastos.reduce((sum, g) => {
        if (['yape', 'plin'].includes(g.metodo_pago || '')) return sum + g.monto;
        return sum;
    }, 0);

    const efectivoEnCaja = totalInicial + ventasEfectivo - gastosEfectivo;

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

        try {
            const fileName = await generarReporteExcelReportes({
                periodo: getPeriodoTexto(),
                metricas,
                ventas,
                topProductos,
                desgloseMetodoPago,
                consumoPollos,
                distribucionTipo,
                comparativa,
                ventasPorHora,
                inventarios,
                gastos,
                caja: {
                    inicial: totalInicial,
                    ventasEfectivo,
                    ventasDigital,
                    gastosEfectivo,
                    gastosDigital,
                    efectivoEnCaja
                },
                stockResumen
            });
            toast.success(`Excel descargado: ${fileName}`, { icon: '📊' });
        } catch (error) {
            console.error('Error al generar Excel:', error);
            toast.error('Error al generar el reporte Excel');
        }
    };

    const generarDiasCalendario = () => {
        const inicio = startOfMonth(mesCalendario);
        const fin = endOfMonth(mesCalendario);
        const inicioSemana = startOfWeek(inicio, { weekStartsOn: 1 });
        const finSemana = endOfWeek(fin, { weekStartsOn: 1 });
        const dias = [];
        let dia = inicioSemana;
        while (dia <= finSemana) {
            dias.push(new Date(dia));
            dia = new Date(dia.getTime() + 24 * 60 * 60 * 1000);
        }
        return dias;
    };

    const handleClickDia = (dia: Date) => {
        if (tipoRango === 'dia') {
            setFechaSeleccionada(dia);
            setMostrarCalendario(false);
        } else {
            if (seleccionandoRango === 'inicio') {
                setFechaInicio(dia);
                setSeleccionandoRango('fin');
            } else {
                if (dia >= fechaInicio) {
                    setFechaFin(dia);
                    setMostrarCalendario(false);
                    setSeleccionandoRango('inicio');
                } else {
                    setFechaInicio(dia);
                    setSeleccionandoRango('fin');
                }
            }
        }
    };

    const esDiaSeleccionado = (dia: Date) => {
        if (tipoRango === 'dia') return isSameDay(dia, fechaSeleccionada);
        return isSameDay(dia, fechaInicio) || isSameDay(dia, fechaFin);
    };

    const estaEnRango = (dia: Date) => {
        if (tipoRango === 'rango' && fechaInicio && fechaFin) {
            return isWithinInterval(dia, { start: fechaInicio, end: fechaFin });
        }
        return false;
    };

    const getPeriodoTexto = () => {
        if (tipoRango === 'dia') return format(fechaSeleccionada, "EEEE, d 'de' MMMM yyyy", { locale: es });
        return `${format(fechaInicio, 'd MMM', { locale: es })} - ${format(fechaFin, 'd MMM yyyy', { locale: es })}`;
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic"
                        >
                            Reportes
                        </motion.h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center gap-2 italic">
                            <span className="w-2 h-2 rounded-none bg-theme-primary animate-pulse"></span>
                            Estadísticas y Rendimiento
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setShowAdminReport(true)}
                            className="px-6 py-4 bg-white border border-slate-100 text-slate-800 font-black rounded-none hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm"
                        >
                            <FileText size={16} className="text-theme-primary" /> Administrativo
                        </button>
                        <button
                            onClick={exportarExcel}
                            className="px-6 py-4 bg-theme-primary text-white font-black rounded-none shadow-xl hover:brightness-110 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2"
                        >
                            <Download size={16} /> Excel
                        </button>
                    </div>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-100 rounded-none p-8 mb-12 shadow-sm"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-center">
                        <div className="lg:col-span-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Modalidad</p>
                            <div className="flex bg-slate-50 rounded-none p-1 border border-slate-100">
                                <button
                                    onClick={() => setTipoRango('dia')}
                                    className={`flex-1 py-3 rounded-none text-[10px] font-black tracking-widest transition-all ${tipoRango === 'dia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    DIARIO
                                </button>
                                <button
                                    onClick={() => setTipoRango('rango')}
                                    className={`flex-1 py-3 rounded-none text-[10px] font-black tracking-widest transition-all ${tipoRango === 'rango' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    RANGO
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Período Seleccionado</p>
                            <button
                                onClick={() => setMostrarCalendario(!mostrarCalendario)}
                                className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-none transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-rodrigo-mustard" />
                                    <span className="text-slate-900 font-black text-xs uppercase tracking-widest italic">
                                        {getPeriodoTexto()}
                                    </span>
                                </div>
                                <ChevronDown size={18} className={`text-slate-300 transition-transform ${mostrarCalendario ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <div className="lg:col-span-5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Accesos Directos</p>
                            <div className="flex flex-wrap gap-2">
                                {rangosRapidos.map((rango, i) => (
                                    <button
                                        key={i}
                                        onClick={rango.action}
                                        className="px-4 py-2 text-[9px] font-black text-slate-600 bg-white border border-slate-200 hover:border-rodrigo-mustard hover:text-rodrigo-mustard hover:bg-rodrigo-mustard/5 rounded-none transition-all uppercase tracking-widest shadow-sm"
                                    >
                                        {rango.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {mostrarCalendario && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-none p-8 shadow-2xl relative z-50">
                                        <div className="flex items-center justify-between mb-8">
                                            <button onClick={() => setMesCalendario(subMonths(mesCalendario, 1))} className="p-3 hover:bg-slate-50 rounded-none transition-all"><ChevronLeft size={20} className="text-slate-400" /></button>
                                            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm italic">{format(mesCalendario, 'MMMM yyyy', { locale: es })}</h3>
                                            <button onClick={() => setMesCalendario(addMonths(mesCalendario, 1))} className="p-3 hover:bg-slate-50 rounded-none transition-all"><ChevronRight size={20} className="text-slate-400" /></button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(dia => (
                                                <div key={dia} className="text-center text-[9px] font-black text-slate-300 py-2">{dia}</div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {generarDiasCalendario().map((dia, i) => {
                                                const esDelMes = dia.getMonth() === mesCalendario.getMonth();
                                                const esHoy = isSameDay(dia, new Date());
                                                const seleccionado = esDiaSeleccionado(dia);
                                                const enRango = estaEnRango(dia);

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleClickDia(dia)}
                                                        disabled={!esDelMes}
                                                        className={`h-10 text-[11px] rounded-none transition-all font-bold flex items-center justify-center
                                                            ${!esDelMes ? 'text-slate-100 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600'}
                                                            ${esHoy && !seleccionado ? 'border border-rodrigo-terracotta text-rodrigo-terracotta' : ''}
                                                            ${seleccionado ? 'bg-rodrigo-mustard text-rodrigo-brown shadow-lg' : ''}
                                                            ${enRango && !seleccionado ? 'bg-rodrigo-mustard/10 text-rodrigo-mustard' : ''}`}
                                                    >
                                                        {dia.getDate()}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-white/5 border-t-rodrigo-mustard rounded-none animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-rodrigo-mustard font-black text-xl animate-pulse">S/</span>
                            </div>
                        </div>
                        <p className="text-white/30 font-black uppercase tracking-widest text-xs">Calculando métricas...</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Métricas Principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                label="Ingresos Totales"
                                value={`S/ ${metricas.totalIngresos.toFixed(2)}`}
                                sublabel={getPeriodoTexto()}
                                icon={<span className="text-2xl font-black text-white">S/</span>}
                                color="bg-green-500"
                            />
                            <StatCard
                                label="Total Pedidos"
                                value={metricas.cantidadPedidos.toString()}
                                sublabel="Pedidos procesados"
                                icon={<ShoppingBag size={24} className="text-white" />}
                                color="bg-blue-500"
                            />
                            <StatCard
                                label="Ticket Promedio"
                                value={`S/ ${metricas.promedioPorPedido.toFixed(2)}`}
                                sublabel="Por pedido"
                                icon={<span className="text-2xl font-black text-white">S/</span>}
                                color="bg-rodrigo-mustard"
                            />
                            <StatCard
                                label="Pollos Vendidos"
                                value={formatearFraccionPollo(metricas.pollosVendidos)}
                                sublabel="Consumo total"
                                icon={<Package size={24} className="text-white" />}
                                color="bg-rodrigo-terracotta"
                            />
                        </div>

                        {/* Cuadre de Caja */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-100 rounded-none p-10 group overflow-hidden relative shadow-sm"
                        >
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
                                <span className="text-[120px] font-black text-slate-900/5 select-none" style={{ lineHeight: 1 }}>S/</span>
                            </div>

                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">Conciliación de Efectivo</p>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Cuadre de Caja</h2>
                                </div>
                                <div className="w-16 h-16 bg-slate-50 rounded-none flex items-center justify-center border border-slate-100 group-hover:border-rodrigo-mustard/30 transition-all duration-500">
                                    <span className="text-2xl font-black text-rodrigo-mustard">S/</span>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-12 relative z-10">
                                {/* Columna Efectivo */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-6 bg-green-500 rounded-none"></div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm italic">Efectivo Físico</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-none border border-slate-100 group-hover:border-slate-200 transition-all">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Inicial</span>
                                            <span className="font-black text-slate-900">S/ {totalInicial.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-none border border-slate-100 group-hover:border-slate-200 transition-all">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ventas Efectivo</span>
                                            <span className="font-black text-green-600">S/ {ventasEfectivo.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-none border border-slate-100 group-hover:border-slate-200 transition-all">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gastos Efectivo</span>
                                            <span className="font-black text-rodrigo-terracotta">- S/ {gastosEfectivo.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-6 border-t border-slate-100 mt-6">
                                            <div className="flex justify-between items-center px-2">
                                                <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Efectivo Esperado</span>
                                                <span className="text-4xl font-black text-slate-900 tracking-tighter">S/ {efectivoEnCaja.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Digital */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-6 bg-blue-500 rounded-none"></div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm italic">Pagos Digitales</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-none border border-slate-100 group-hover:border-slate-200 transition-all">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ingresos Digitales</span>
                                            <span className="font-black text-blue-600">S/ {ventasDigital.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-none border border-slate-100 group-hover:border-slate-200 transition-all">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gastos Digitales</span>
                                            <span className="font-black text-rodrigo-terracotta">- S/ {gastosDigital.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-6 border-t border-slate-100 mt-6">
                                            <div className="flex justify-between items-center px-2">
                                                <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Total en Banco</span>
                                                <span className="text-4xl font-black text-blue-600 tracking-tighter">S/ {(ventasDigital - gastosDigital).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Rendimiento Semanal / Tendencia */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white border border-slate-100 rounded-none p-8 overflow-hidden relative shadow-sm h-[400px]"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Ventas por Hora</p>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Peak Times</h3>
                                    </div>
                                    <Clock size={20} className="text-slate-400" />
                                </div>
                                <div className="h-[280px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ventasPorHora}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="hora"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                labelStyle={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}
                                            />
                                            <Bar dataKey="total" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Canal de Venta - Pie Chart */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white border border-slate-100 rounded-none p-8 shadow-sm h-[400px]"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Distribución</p>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Canal de Venta</h3>
                                    </div>
                                    <Home size={20} className="text-slate-400" />
                                </div>
                                <div className="grid grid-cols-2 h-full items-center">
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={distribucionTipo as any[]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="cantidad"
                                                >
                                                    {distribucionTipo.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.info][index % 3]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #f1f5f9' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-4 pr-4">
                                        {distribucionTipo.map((d, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-none" style={{ backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.info][index % 3] }}></div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.tipo}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900">{d.porcentaje.toFixed(0)}%</p>
                                                    <p className="text-[9px] font-bold text-slate-400">{d.cantidad} ped.</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Tendencia de Facturación (Si hay rango) */}
                        {tipoRango === 'rango' && ventasPorDia.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-slate-100 rounded-none p-8 shadow-sm h-[400px] mt-8 overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Análisis Temporal</p>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Tendencia de Facturación</h3>
                                    </div>
                                    <TrendingUp size={20} className="text-emerald-500" />
                                </div>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={ventasPorDia}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="fecha"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="total" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}


                        {/* Ranking de Productos Más Vendidos */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-100 rounded-none shadow-sm overflow-hidden mt-8"
                        >
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-rodrigo-terracotta rounded-none shadow-sm"></div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">Ranking de Productos</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Los más vendidos del periodo</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-none text-slate-400">
                                    <Star size={20} />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">#</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Producto</th>
                                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cantidad</th>
                                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Veces Vendido</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Total Ingresos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {topProductos.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <span className="w-8 h-8 rounded-none bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                                                        {i + 1}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-black text-slate-900 uppercase italic">{p.nombre_producto}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="text-sm font-black text-rodrigo-terracotta underline decoration-rodrigo-terracotta/30 underline-offset-4">{p.cantidad_total}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase">{p.veces_vendido} pedidos</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-lg font-black text-slate-900 tracking-tighter">S/ {p.ingresos_total.toFixed(2)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>

                        {/* Transacciones Recientes */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-100 rounded-none shadow-sm overflow-hidden mt-8"
                        >
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-rodrigo-mustard rounded-none shadow-sm"></div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">Detalle de Ventas</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Listado cronológico de operaciones</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Fecha/Hora</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Referencia</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Productos</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Total</th>
                                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {ventas.slice(0, limit).map((v, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-700 italic">{format(new Date(v.updated_at || v.created_at), 'HH:mm')}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{format(new Date(v.updated_at || v.created_at), 'dd MMM yyyy')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                                            {v.mesas?.numero ? `Mesa ${v.mesas.numero}` : (v.tipo_pedido === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR')}
                                                        </span>
                                                        {v.metodo_pago === 'mixto' && v.pago_dividido ? (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {Object.entries(v.pago_dividido).map(([metodo, monto]) => monto ? (
                                                                    <span key={metodo} className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-none border border-slate-200 tracking-widest">
                                                                        {metodo} S/{monto.toFixed(2)}
                                                                    </span>
                                                                ) : null)}
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[9px] font-black uppercase mt-1 tracking-widest ${
                                                                v.metodo_pago === 'efectivo' ? 'text-emerald-500' :
                                                                v.metodo_pago === 'yape' ? 'text-purple-500' :
                                                                v.metodo_pago === 'plin' ? 'text-cyan-500' :
                                                                'text-blue-500'
                                                            }`}>
                                                                {v.metodo_pago || 'EFECTIVO'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {v.items.map((item, idx) => (
                                                            <span key={idx} className="bg-slate-50 px-2 py-1 rounded-none text-[10px] text-slate-500 font-bold border border-slate-100 grow-0 shrink-0">
                                                                {item.cantidad}x {item.nombre}
                                                            </span>
                                                        ))}
                                                        {v.tipo_pedido === 'delivery' && (v.costo_envio || 0) > 0 && (
                                                            <span className="bg-indigo-50 px-2 py-1 rounded-none text-[10px] text-indigo-500 font-bold border border-indigo-100 grow-0 shrink-0">
                                                                Envío: S/ {(v.costo_envio || 0).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-lg font-black text-slate-900 tracking-tighter">S/ {v.total.toFixed(2)}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => { setVentaToEdit(v); setShowEditPayment(true); }}
                                                            className="p-3 bg-slate-50 rounded-none text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-100"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedVenta(v); setShowReceipt(true); }}
                                                            className="p-3 bg-slate-50 rounded-none text-slate-400 hover:text-rodrigo-mustard hover:bg-rodrigo-mustard/10 transition-all border border-slate-100"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {ventas.length > limit && (
                                <div className="p-8 bg-slate-50/50 text-center border-t border-slate-100">
                                    <button
                                        onClick={() => setLimit(prev => prev + 20)}
                                        className="px-8 py-4 text-[10px] font-black text-slate-400 bg-white border border-slate-200 rounded-none hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-widest"
                                    >
                                        Cargar más transacciones ({ventas.length - limit} restantes)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Modales */}
            <AnimatePresence>
                {selectedVenta && showReceipt && (
                    <ReceiptModal
                        isOpen={showReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedVenta(null);
                        }}
                        items={selectedVenta.items}
                        total={selectedVenta.total}
                        orderId={selectedVenta.id}
                        mesaNumero={selectedVenta.mesas?.numero}
                    />
                )}
            </AnimatePresence>

            <AdminReportModal
                isOpen={showAdminReport}
                onClose={() => setShowAdminReport(false)}
                ventas={ventas}
                inventarios={inventarios}
                gastos={gastos}
                fechaInicio={tipoRango === 'dia' ? fechaSeleccionada : fechaInicio}
                fechaFin={tipoRango === 'dia' ? fechaSeleccionada : fechaFin}
            />

            <EditPaymentModal
                isOpen={showEditPayment}
                onClose={() => {
                    setShowEditPayment(false);
                    setVentaToEdit(null);
                }}
                venta={ventaToEdit}
                onUpdate={() => cargarDatos()}
            />
        </div>
    );
}

function StatCard({ label, value, icon, color, trend, sublabel }: any) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-white border border-slate-100 rounded-none p-8 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden"
        >
            <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] transition-all group-hover:opacity-[0.08]`}></div>

            <div className="flex justify-between items-start mb-6 relative">
                <div className={`p-4 rounded-none ${color} text-white shadow-lg shadow-${color.replace('bg-', '')}/30 group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {trend && (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-none italic border border-emerald-100 uppercase tracking-widest">
                        {trend}
                    </span>
                )}
            </div>

            <div className="relative">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 italic">{label}</p>
                <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{value}</p>
                {sublabel && (
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{sublabel}</p>
                )}
            </div>
        </motion.div>
    );
}
