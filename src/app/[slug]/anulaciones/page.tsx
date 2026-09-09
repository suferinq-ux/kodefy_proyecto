'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertTriangle, Calendar, Search, ChevronLeft, ChevronRight, Eye, AlertOctagon, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { Anulacion } from '@/lib/database.types';

type TipoRango = 'dia' | 'rango';

export default function AnulacionesPage() {
    return (
        <ProtectedRoute requiredPermission="anulaciones">
            <AnulacionesContent />
        </ProtectedRoute>
    );
}

function AnulacionesContent() {
    const { user } = useAuth();
    const { business } = useBusiness();
    const [anulaciones, setAnulaciones] = useState<Anulacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    // Filtros de fecha
    const [tipoRango, setTipoRango] = useState<TipoRango>('dia');
    const [fechaInicio, setFechaInicio] = useState<Date>(new Date());
    const [fechaFin, setFechaFin] = useState<Date>(new Date());
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [mesCalendario, setMesCalendario] = useState<Date>(new Date());
    const [seleccionandoRango, setSeleccionandoRango] = useState<'inicio' | 'fin'>('inicio');

    const [selectedAnulacion, setSelectedAnulacion] = useState<Anulacion | null>(null);

    useEffect(() => {
        if (business) {
            cargarAnulaciones();
        }
    }, [business, tipoRango, fechaInicio, fechaFin]);

    const cargarAnulaciones = async () => {
        if (!business) return;
        setLoading(true);
        try {
            const inicio = startOfDay(fechaInicio).toISOString();
            const fin = endOfDay(tipoRango === 'rango' ? fechaFin : fechaInicio).toISOString();

            let query = supabase
                .from('anulaciones')
                .select('*')
                .eq('negocio_id', business.id)
                .gte('created_at', inicio)
                .lte('created_at', fin)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setAnulaciones(data as Anulacion[]);
        } catch (error) {
            console.error('Error cargando anulaciones:', error);
            toast.error('Error al cargar la auditoría');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminarRegistro = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar permanentemente este registro de auditoría?')) return;
        
        try {
            const { error } = await supabase.from('anulaciones').delete().eq('id', id);
            if (error) throw error;
            toast.success('Registro de anulación eliminado');
            cargarAnulaciones();
        } catch (error) {
            console.error('Error:', error);
            toast.error('No tiene permisos para eliminar registros de auditoría');
        }
    };

    // Funciones de Calendario
    const setFiltroPredefinido = (tipo: string) => {
        const hoy = new Date();
        switch (tipo) {
            case 'hoy':
                setTipoRango('dia');
                setFechaInicio(hoy);
                setFechaFin(hoy);
                break;
            case 'ayer':
                setTipoRango('dia');
                const ayer = subDays(hoy, 1);
                setFechaInicio(ayer);
                setFechaFin(ayer);
                break;
            case 'semana':
                setTipoRango('rango');
                setFechaInicio(startOfWeek(hoy, { weekStartsOn: 1 }));
                setFechaFin(hoy);
                break;
            case '7dias':
                setTipoRango('rango');
                setFechaInicio(subDays(hoy, 7));
                setFechaFin(hoy);
                break;
            case 'mes':
                setTipoRango('rango');
                setFechaInicio(startOfMonth(hoy));
                setFechaFin(hoy);
                break;
        }
        setMostrarCalendario(false);
    };

    const generarDiasCalendario = () => {
        const inicioMes = startOfMonth(mesCalendario);
        const finMes = endOfMonth(mesCalendario);
        const inicioCalendario = startOfWeek(inicioMes, { weekStartsOn: 1 });
        const finCalendario = endOfWeek(finMes, { weekStartsOn: 1 });

        const dias = [];
        let diaActual = inicioCalendario;
        while (diaActual <= finCalendario) {
            dias.push(diaActual);
            diaActual = addMonths(diaActual, 0); // Hack for adding 1 day correctly
            diaActual.setDate(diaActual.getDate() + 1);
        }
        return dias;
    };

    const seleccionarDia = (dia: Date) => {
        if (tipoRango === 'dia') {
            setFechaInicio(dia);
            setFechaFin(dia);
            setMostrarCalendario(false);
        } else {
            if (seleccionandoRango === 'inicio') {
                setFechaInicio(dia);
                if (dia > fechaFin) setFechaFin(dia);
                setSeleccionandoRango('fin');
            } else {
                if (dia < fechaInicio) {
                    setFechaInicio(dia);
                    setFechaFin(fechaInicio);
                } else {
                    setFechaFin(dia);
                }
                setSeleccionandoRango('inicio');
                setMostrarCalendario(false);
            }
        }
    };

    const estaEnRango = (dia: Date) => {
        if (tipoRango === 'dia') return isSameDay(dia, fechaInicio);
        return dia >= startOfDay(fechaInicio) && dia <= endOfDay(fechaFin);
    };

    // Filtro de texto
    const anulacionesFiltradas = anulaciones.filter(a => {
        const search = searchText.toLowerCase();
        return (
            a.usuario_nombre.toLowerCase().includes(search) ||
            a.motivo.toLowerCase().includes(search) ||
            a.monto_original.toString().includes(search)
        );
    });

    const totalAnulados = anulacionesFiltradas.length;
    const montoTotalAnulado = anulacionesFiltradas.reduce((sum, a) => sum + a.monto_original, 0);

    return (
        <div className="max-w-[1600px] mx-auto p-4 sm:p-8 pt-24 lg:pt-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 text-red-600 shadow-sm border border-red-200">
                            <AlertOctagon size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">ANULACIONES</h1>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-12">
                        Auditoría de pedidos eliminados
                    </p>
                </div>

                {/* Date Filters */}
                <div className="flex flex-col md:flex-row items-end md:items-center gap-4 bg-white p-2 border border-slate-200 shadow-sm">
                    <div className="flex items-center bg-slate-100 p-1">
                        <button
                            onClick={() => setTipoRango('dia')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                tipoRango === 'dia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            DIARIO
                        </button>
                        <button
                            onClick={() => setTipoRango('rango')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                tipoRango === 'rango' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            RANGO
                        </button>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setMostrarCalendario(!mostrarCalendario)}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-3 hover:bg-black transition-colors"
                        >
                            <Calendar size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {tipoRango === 'dia' 
                                    ? format(fechaInicio, "dd MMM yyyy", { locale: es })
                                    : `${format(fechaInicio, "dd MMM")} - ${format(fechaFin, "dd MMM")}`
                                }
                            </span>
                        </button>

                        <AnimatePresence>
                            {mostrarCalendario && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl p-4 z-50 w-80 md:w-[600px] flex flex-col md:flex-row gap-6"
                                >
                                    <div className="flex flex-col gap-2 min-w-[140px] border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Accesos Rápidos</p>
                                        {[
                                            { id: 'hoy', label: 'Hoy' },
                                            { id: 'ayer', label: 'Ayer' },
                                            { id: 'semana', label: 'Esta Semana' },
                                            { id: '7dias', label: 'Últimos 7 días' },
                                            { id: 'mes', label: 'Este Mes' }
                                        ].map(preset => (
                                            <button
                                                key={preset.id}
                                                onClick={() => setFiltroPredefinido(preset.id)}
                                                className="text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-widest transition-colors"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-4">
                                            <button onClick={() => setMesCalendario(subMonths(mesCalendario, 1))} className="p-1 hover:bg-slate-100 text-slate-600"><ChevronLeft size={16} /></button>
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                                {format(mesCalendario, 'MMMM yyyy', { locale: es })}
                                            </span>
                                            <button onClick={() => setMesCalendario(addMonths(mesCalendario, 1))} className="p-1 hover:bg-slate-100 text-slate-600"><ChevronRight size={16} /></button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                                            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                                                <div key={d} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {generarDiasCalendario().map((dia, idx) => {
                                                const isCurrentMonth = isSameMonth(dia, mesCalendario);
                                                const isSelected = estaEnRango(dia);
                                                const isStart = isSameDay(dia, fechaInicio);
                                                const isEnd = isSameDay(dia, fechaFin);

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => seleccionarDia(dia)}
                                                        className={`h-8 flex items-center justify-center text-xs font-bold transition-all
                                                            ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                                            ${isSelected && tipoRango === 'rango' ? 'bg-red-50 text-red-600' : ''}
                                                            ${isStart || (isEnd && tipoRango === 'rango') || (isSelected && tipoRango === 'dia') ? 'bg-red-500 text-white shadow-md shadow-red-500/30 scale-110 z-10' : 'hover:bg-slate-100'}
                                                        `}
                                                    >
                                                        {format(dia, 'd')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border border-slate-100 p-6 shadow-sm relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute -right-4 -top-4 text-slate-50 opacity-50">
                        <Trash2 size={100} strokeWidth={1} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Eliminados</p>
                    <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{totalAnulados}</p>
                </div>
                
                <div className="bg-red-50 border border-red-100 p-6 shadow-sm relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute -right-4 -top-4 text-red-100 opacity-50">
                        <AlertTriangle size={100} strokeWidth={1} />
                    </div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Monto Total Anulado</p>
                    <p className="text-4xl font-black text-red-600 italic tracking-tighter">S/ {montoTotalAnulado.toFixed(2)}</p>
                </div>

                <div className="bg-white border border-slate-100 p-6 shadow-sm flex flex-col justify-center gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Search size={12} /> Filtrar por Texto
                    </label>
                    <input 
                        type="text" 
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder="Buscar mozo, motivo..."
                        className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Fecha / Hora El.</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/3">Motivo de Eliminación</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Monto Original</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Productos</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex justify-center mb-2"><Loader2 className="animate-spin" /></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Cargando auditoría...</p>
                                    </td>
                                </tr>
                            ) : anulacionesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <p className="text-sm font-bold uppercase tracking-widest">No hay anulaciones en este periodo</p>
                                    </td>
                                </tr>
                            ) : (
                                anulacionesFiltradas.map((a) => (
                                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-black text-slate-900">{format(parseISO(a.created_at), 'dd MMM yyyy', { locale: es })}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(parseISO(a.created_at), 'HH:mm')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                {a.usuario_nombre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="bg-red-50 text-red-700 p-3 border-l-2 border-red-500 text-xs font-medium italic">
                                                "{a.motivo}"
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-black text-slate-900 tracking-tighter">
                                                S/ {a.monto_original.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-widest">
                                                {a.items.reduce((sum, i) => sum + i.cantidad, 0)} Items
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedAnulacion(a)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                                                    title="Ver detalles"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {user?.es_super_admin && (
                                                    <button 
                                                        onClick={() => handleEliminarRegistro(a.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                                                        title="Eliminar registro"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle */}
            <AnimatePresence>
                {selectedAnulacion && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
                        >
                            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-xl leading-none tracking-tight uppercase italic">Detalle de Venta Eliminada</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                                        Fecha original: {selectedAnulacion.fecha_venta ? format(parseISO(selectedAnulacion.fecha_venta), 'dd MMM yyyy HH:mm') : 'Desconocida'}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedAnulacion(null)} className="text-white/50 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="mb-6 p-4 bg-red-50 border border-red-100">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Motivo Registrado:</p>
                                    <p className="text-sm font-medium text-red-700 italic">"{selectedAnulacion.motivo}"</p>
                                    <p className="text-[10px] font-bold text-red-400 mt-2">— Por {selectedAnulacion.usuario_nombre}</p>
                                </div>

                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Productos Eliminados</h4>
                                <div className="space-y-3 mb-6">
                                    {selectedAnulacion.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100">
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase">{item.cantidad}x {item.nombre}</p>
                                                {item.notas && <p className="text-xs text-slate-500 italic mt-1">{item.notas}</p>}
                                            </div>
                                            <p className="text-sm font-bold text-slate-600">S/ {(item.precio * item.cantidad).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center p-4 bg-slate-100 border border-slate-200">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Monto Original</span>
                                    <span className="text-2xl font-black text-slate-900 italic tracking-tighter">S/ {selectedAnulacion.monto_original.toFixed(2)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
