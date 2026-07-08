'use client';
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, DollarSign, Package, TrendingDown, AlertCircle, Check, Loader2, Share2, Calculator, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useInventario } from '@/hooks/useInventario';
import { useVentas } from '@/hooks/useVentas';
import { useMetricas } from '@/hooks/useMetricas';
import { formatearCantidadPollos, formatearFraccionPollo } from '@/lib/utils';
import { generarReporteExcel } from '@/lib/excelReport';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedCard from '@/components/AnimatedCard';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { BebidasDetalle } from '@/lib/database.types';
import { useBebidasConfig } from '@/hooks/useBebidasConfig';



export default function CierreCajaPage() {
    return (
        <ProtectedRoute>
            <CierreCajaContent />
        </ProtectedRoute>
    );
}

function CierreCajaContent() {
    const router = useRouter();
    const params = useParams();
    const { stock, loading } = useInventario();
    const { ventas } = useVentas();
    const metricas = useMetricas(ventas);

    // Estado para gastos del día
    const [gastosDelDia, setGastosDelDia] = useState<{ descripcion: string; monto: number; metodo_pago?: string }[]>([]);
    const totalGastos = gastosDelDia.reduce((sum, g) => sum + g.monto, 0);
    const gastosEfectivo = gastosDelDia.filter(g => !g.metodo_pago || g.metodo_pago === 'efectivo').reduce((sum, g) => sum + g.monto, 0);
    const gastosYape = gastosDelDia.filter(g => g.metodo_pago === 'yape').reduce((sum, g) => sum + g.monto, 0);
    const gastosPlin = gastosDelDia.filter(g => g.metodo_pago === 'plin').reduce((sum, g) => sum + g.monto, 0);

    // Estados para inputs manuales
    const [pollosAderezados, setPollosAderezados] = useState('');
    const [pollosCrudos, setPollosCrudos] = useState('');
    const [cenaPersonal, setCenaPersonal] = useState('');
    const [pollosGolpeados, setPollosGolpeados] = useState('');
    const [stockGaseosasReal, setStockGaseosasReal] = useState('');
    const [stockPapasFinal, setStockPapasFinal] = useState('');
    const [dineroCajaReal, setDineroCajaReal] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [bebidasDetalle, setBebidasDetalle] = useState<Record<string, Record<string, number>>>({});
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

    // Dynamic beverage catalog
    const { allBrands, mergeWithStock, loading: loadingCatalog } = useBebidasConfig();

    // Cargar stock inicial de bebidas cuando 'stock' esté disponible
    useEffect(() => {
        if (stock?.bebidas_detalle) {
            setBebidasDetalle(mergeWithStock(stock.bebidas_detalle as any));
        } else if (!loadingCatalog && allBrands.length > 0) {
            setBebidasDetalle(mergeWithStock({}));
        }
    }, [stock, loadingCatalog, allBrands.length]);

    const updateBeverage = (brand: string, size: string, value: string) => {
        const numValue = value === '' ? 0 : parseInt(value) || 0;
        setBebidasDetalle(prev => ({
            ...prev,
            [brand]: {
                ...(prev[brand] || {}),
                [size]: numValue
            }
        }));
    };

    const calculateTotalBeverages = (): number => {
        let total = 0;
        Object.values(bebidasDetalle).forEach(brand => {
            if (brand) {
                Object.values(brand).forEach(qty => {
                    total += (qty as number) || 0;
                });
            }
        });
        return total;
    };

    // Actualizar stockGaseosasReal cada vez que cambia bebidasDetalle
    useEffect(() => {
        const total = calculateTotalBeverages();
        setStockGaseosasReal(total.toString());
    }, [bebidasDetalle]);

    // Total de pollos sobrantes
    const stockPollosReal = (parseFloat(pollosAderezados || '0') + parseFloat(pollosCrudos || '0')).toString();

    const [procesando, setProcesando] = useState(false);
    const [cierreCompletado, setCierreCompletado] = useState(false);
    const [resumenWhatsApp, setResumenWhatsApp] = useState('');

    // Cargar gastos del día
    useEffect(() => {
        const cargarGastos = async () => {
            const { data } = await supabase
                .from('gastos')
                .select('descripcion, monto, metodo_pago')
                .eq('fecha', obtenerFechaHoy());
            setGastosDelDia(data || []);
        };
        cargarGastos();
    }, []);

    // Agrupar ventas por método de pago (con soporte para pago dividido)
    const ventasPorMetodo = ventas.reduce((acc, venta) => {
        if (venta.pago_dividido && venta.metodo_pago === 'mixto') {
            // Distribuir montos a cada método individual
            for (const [metodo, monto] of Object.entries(venta.pago_dividido)) {
                if (monto && monto > 0) {
                    acc[metodo] = (acc[metodo] || 0) + monto;
                }
            }
        } else {
            const metodo = venta.metodo_pago || 'efectivo';
            acc[metodo] = (acc[metodo] || 0) + venta.total;
        }
        return acc;
    }, {} as Record<string, number>);

    // Desglose de pollos por fracción y tipo
    const desglosePollos = ventas.reduce((acc, venta) => {
        venta.items.forEach(item => {
            const nombre = item.nombre.toLowerCase();
            if (nombre.includes('mostrito')) {
                acc.mostritos = (acc.mostritos || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 1) {
                acc.enteros = (acc.enteros || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 0.5) {
                acc.medios = (acc.medios || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 0.25) {
                acc.cuartos = (acc.cuartos || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 0.125) {
                acc.octavos = (acc.octavos || 0) + item.cantidad;
            }
        });
        return acc;
    }, { enteros: 0, medios: 0, cuartos: 0, octavos: 0, mostritos: 0 });

    // Resumen de TODOS los platos vendidos hoy
    const ventasResumen = ventas.reduce((acc, venta) => {
        venta.items.forEach(item => {
            acc[item.nombre] = (acc[item.nombre] || 0) + item.cantidad;
        });
        return acc;
    }, {} as Record<string, number>);

    // Convertir a array y ordenar por cantidad (más vendido primero)
    const listaPlatosVendidos = Object.entries(ventasResumen)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

    // NUEVO: Agrupar ventas de bebidas por marca y tipo (usando bebidas_detalle de cada venta)
    const ventasBebidasDesglose = ventas.reduce((acc, venta) => {
        if (venta.bebidas_detalle) {
            const detalle = venta.bebidas_detalle as BebidasDetalle;
            for (const [marca, tipos] of Object.entries(detalle)) {
                if (!acc[marca]) acc[marca] = {};
                for (const [tipo, qty] of Object.entries(tipos || {})) {
                    acc[marca][tipo] = (acc[marca][tipo] || 0) + (qty as number);
                }
            }
        }
        return acc;
    }, {} as Record<string, Record<string, number>>);

    const calcularDiferencias = () => {
        if (!stock) return { diffPollos: 0, diffGaseosas: 0 };

        const pollosEsperados = stock.pollos_disponibles;
        const gaseosasEsperadas = stock.gaseosas_disponibles;

        // La diferencia se calcula sumando el stock físico + lo que se comió el personal (justificado)
        // y restándole lo que debería haber según el sistema
        const stockFisico = parseFloat(stockPollosReal || '0');
        const consumoPersonal = parseFloat(cenaPersonal || '0');
        const mermaGolpeados = parseFloat(pollosGolpeados || '0');

        // Diferencia = (Físico + Cena + Golpeados) - Esperado
        const diffPollos = (stockFisico + consumoPersonal + mermaGolpeados) - pollosEsperados;
        const diffGaseosas = parseInt(stockGaseosasReal || '0') - gaseosasEsperadas;

        return { diffPollos, diffGaseosas };
    };

    const { diffPollos, diffGaseosas } = calcularDiferencias();

    const handleConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#C8102E', '#F2C94C']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#C8102E', '#F2C94C']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    };

    const confirmarCierre = async () => {
        if (!stock) return;
        setProcesando(true);

        try {
            const { error } = await supabase
                .from('inventario_diario')
                .update({
                    estado: 'cerrado',
                    stock_pollos_real: parseFloat(stockPollosReal || '0'),
                    stock_gaseosas_real: parseInt(stockGaseosasReal || '0'),
                    papas_finales: parseFloat(stockPapasFinal || '0'),
                    dinero_cierre_real: parseFloat(dineroCajaReal || '0'),
                    cena_personal: parseFloat(cenaPersonal || '0'),
                    pollos_golpeados: parseFloat(pollosGolpeados || '0'),
                    observaciones_cierre: observaciones,
                    // para que la apertura del siguiente día las cargue correctamente
                    bebidas_detalle: bebidasDetalle || null,
                })
                .eq('fecha', obtenerFechaHoy());

            // Calcular total efectivo esperado (base + ventas efectivo - gastos efectivo)
            const totalEfectivoEsperado = (ventasPorMetodo['efectivo'] || 0) + (stock?.dinero_inicial || 0) - gastosEfectivo;

            // Formatear gastos para el mensaje de WhatsApp
            const gastosTexto = gastosDelDia.length > 0
                ? gastosDelDia.map(g => `- ${g.descripcion}: S/ ${g.monto.toFixed(2)}`).join('\n')
                : 'No hubo gastos registrados.';
    
            // Formatear platillos vendidos para el mensaje de WhatsApp
            const platillosTexto = listaPlatosVendidos.length > 0
                ? listaPlatosVendidos.map(item => `- ${item.nombre}: ${item.cantidad}`).join('\n')
                : 'No se vendieron platillos hoy.';
    
            // Función auxiliar para obtener labels legibles de marcas y tamaños
            const getLabels = (brandKey: string, sizeKey: string) => {
                const brand = allBrands.find(b => b.key === brandKey);
                const size = brand?.sizes.find(s => s.key === sizeKey);
                return {
                    brandName: brand?.name || brandKey,
                    sizeLabel: size?.label || sizeKey
                };
            };
    
            // Formatear detalle de bebidas VENDIDAS
            let bebidasVendidasTexto = '';
            const lineasVendidas: string[] = [];
            for (const [marca, tipos] of Object.entries(ventasBebidasDesglose)) {
                const items = Object.entries(tipos).filter(([, qty]) => qty > 0);
                if (items.length > 0) {
                    const firstSize = items[0][0];
                    const { brandName } = getLabels(marca, firstSize);
                    lineasVendidas.push(`*${brandName}*`);
                    for (const [tipo, qty] of items) {
                        const { sizeLabel } = getLabels(marca, tipo);
                        lineasVendidas.push(`   ${sizeLabel}: ${qty}`);
                    }
                }
            }
            bebidasVendidasTexto = lineasVendidas.length > 0 ? lineasVendidas.join('\n') : 'Sin ventas de bebidas detalladas.';
    
            // Formatear detalle de bebidas SOBRANTES (actuales)
            let bebidasSobrantesTexto = '';
            if (stock?.bebidas_detalle) {
                const lineasSobrantes: string[] = [];
                for (const [marca, tipos] of Object.entries(stock.bebidas_detalle)) {
                    const tiposObj = tipos as Record<string, number>;
                    const items = Object.entries(tiposObj).filter(([, qty]) => qty > 0);
                    if (items.length > 0) {
                        const firstSize = items[0][0];
                        const { brandName } = getLabels(marca, firstSize);
                        lineasSobrantes.push(`*${brandName}*`);
                        for (const [tipo, qty] of items) {
                            const { sizeLabel } = getLabels(marca, tipo);
                            lineasSobrantes.push(`   ${sizeLabel}: ${qty}`);
                        }
                    }
                }
                bebidasSobrantesTexto = lineasSobrantes.length > 0 ? lineasSobrantes.join('\n') : 'Sin bebidas restantes.';
            } else {
                bebidasSobrantesTexto = 'Sin detalle disponible.';
            }

            if (error) {
                console.error('Error al actualizar inventario diario:', error);
                toast.error('Error al guardar el cierre: ' + error.message);
                setProcesando(false);
                return;
            }

            const mensaje = `🐔 *RESUMEN Rodrigo's - Brasas & Broasters - ${new Date().toLocaleDateString('es-PE')}* 🐔

💰 *VENTAS TOTALES: S/ ${metricas.totalIngresos.toFixed(2)}*
--------------------------------
💵 Efectivo en Caja: S/ ${(ventasPorMetodo['efectivo'] || 0).toFixed(2)}
💳 Tarjeta: S/ ${(ventasPorMetodo['tarjeta'] || 0).toFixed(2)}
📱 Yape: S/ ${(ventasPorMetodo['yape'] || 0).toFixed(2)}${gastosYape > 0 ? ` (Gastos: -S/${gastosYape.toFixed(2)})` : ''}
💠 Plin: S/ ${(ventasPorMetodo['plin'] || 0).toFixed(2)}${gastosPlin > 0 ? ` (Gastos: -S/${gastosPlin.toFixed(2)})` : ''}

🫰 *TOTAL EFECTIVO + BASE: S/ ${totalEfectivoEsperado.toFixed(2)}*

📤 *GASTOS DEL DÍA: S/ ${totalGastos.toFixed(2)}*
--------------------------------
${gastosTexto}

💵 *EFECTIVO NETO (Caja): S/ ${totalEfectivoEsperado.toFixed(2)}*
📱 *YAPE NETO: S/ ${((ventasPorMetodo['yape'] || 0) - gastosYape).toFixed(2)}*
💠 *PLIN NETO: S/ ${((ventasPorMetodo['plin'] || 0) - gastosPlin).toFixed(2)}*

🍗 *DESGLOSE DE POLLOS*
--------------------------------
🐣 Pollos Iniciales: ${stock?.pollos_iniciales || 0}
✅ Vendidos (Total): ${formatearCantidadPollos(metricas.pollosVendidos)}
   - Enteros: ${desglosePollos.enteros}
   - Medios: ${desglosePollos.medios}
   - Cuartos: ${desglosePollos.cuartos}
   - Octavos: ${desglosePollos.octavos}
   - Mostritos: ${desglosePollos.mostritos}
❌ Sobrantes Total: ${stockPollosReal}
   - 🍗 Aderezados: ${pollosAderezados || '0'}
   - 📦 Crudo: ${pollosCrudos || '0'}
🍽️ Cena del Personal: ${cenaPersonal || '0'}
💥 Pollos Golpeados: ${pollosGolpeados || '0'}
📊 Pollos Finales Netos: ${formatearFraccionPollo(parseFloat(stockPollosReal || '0') - parseFloat(cenaPersonal || '0') - parseFloat(pollosGolpeados || '0'))}

🥔 *INVENTARIO PAPAS*
--------------------------------
Iniciales: ${stock?.papas_iniciales || 0} Kg
Finales: ${stockPapasFinal || 0} Kg
Consumo Aprox: ${((stock?.papas_iniciales || 0) - (parseFloat(stockPapasFinal) || 0)).toFixed(1)} Kg

📋 *PLATILLOS VENDIDOS*
--------------------------------
${platillosTexto}

🥤 *BEBIDAS VENDIDAS (Desglose)*
--------------------------------
${bebidasVendidasTexto}

🥤 *BEBIDAS SOBRANTES (para mañana)*
--------------------------------
${bebidasSobrantesTexto}

📊 *CUADRE DE STOCK*
--------------------------------
Pollos Diff: ${diffPollos > 0 ? '+' : ''}${formatearFraccionPollo(diffPollos)} ${(parseFloat(cenaPersonal || '0') > 0 || parseFloat(pollosGolpeados || '0') > 0) ? '(Inc. Justificados)' : ''}
Gaseosas Total: ${stockGaseosasReal} (Diff: ${diffGaseosas > 0 ? '+' : ''}${diffGaseosas})

📝 Notas: ${observaciones || 'Ninguna'}

_Generado automáticamente por Rodrigo's - Brasas & Broasters POS_`;

            setResumenWhatsApp(mensaje);
            setCierreCompletado(true);
            handleConfetti();
            toast.success('¡Jornada finalizada exitosamente!', { duration: 5000 });

        } catch (error) {
            console.error('Error al cerrar caja:', error);
            toast.error('Error al cerrar la caja');
        } finally {
            setProcesando(false);
        }
    };

    const copiarWhatsApp = () => {
        navigator.clipboard.writeText(resumenWhatsApp);
        toast.success('Resumen copiado al portapapeles');
        // Abrir WhatsApp Web
        window.open(`https://wa.me/?text=${encodeURIComponent(resumenWhatsApp)}`, '_blank');
    };

    const descargarExcel = async () => {
        if (!stock) return;
        try {
            // Preparar mapa de labels para el reporte Excel
            const labelsMap: Record<string, { brand: string; sizes: Record<string, string> }> = {};
            allBrands.forEach(b => {
                labelsMap[b.key] = {
                    brand: b.name,
                    sizes: b.sizes.reduce((acc, s) => ({ ...acc, [s.key]: s.label }), {})
                };
            });

            const fileName = await generarReporteExcel({
                fecha: new Date().toLocaleDateString('es-PE'),
                stock,
                metricas,
                ventasPorMetodo,
                desglosePollos,
                listaPlatosVendidos,
                gastosDelDia,
                totalGastos,
                stockPollosReal,
                pollosAderezados,
                pollosCrudos,
                cenaPersonal,
                pollosGolpeados,
                stockGaseosasReal,
                stockPapasFinal,
                dineroCajaReal,
                observaciones,
                diffPollos,
                diffGaseosas,
                ventasBebidasDesglose,
                labelsMap
            });
            toast.success(`Excel descargado: ${fileName}`, { icon: '📊' });
        } catch (error) {
            console.error('Error al generar Excel:', error);
            toast.error('Error al generar el reporte Excel');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-8 gap-6">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-rodrigo-terracotta rounded-none animate-spin"></div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] animate-pulse">Sincronizando caja...</p>
        </div>
    );

    if (cierreCompletado) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 lg:p-12">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full bg-white border border-slate-100 rounded-none p-12 text-center relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500/20"></div>

                    <div className="w-24 h-24 bg-emerald-50 rounded-none border border-emerald-100 flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Check className="text-emerald-600" size={48} strokeWidth={3} />
                    </div>

                    <h1 className="text-4xl font-black text-slate-900 mb-3 italic uppercase tracking-tighter">¡Cierre Exitoso!</h1>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-12 italic">La jornada ha finalizado correctamente</p>

                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={copiarWhatsApp}
                            className="w-full py-5 bg-[#25D366] text-white font-black rounded-none shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest text-xs italic"
                        >
                            <Share2 size={18} />
                            Compartir WhatsApp
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={descargarExcel}
                            className="w-full py-5 bg-slate-50 border border-slate-100 text-slate-400 font-black rounded-none flex items-center justify-center gap-3 uppercase tracking-widest text-xs italic hover:bg-slate-100 transition-colors"
                        >
                            <FileSpreadsheet size={18} />
                            Reporte Excel
                        </motion.button>

                        <button
                            onClick={() => router.push(`/${params.slug}/dashboard`)}
                            className="w-full py-5 text-slate-300 font-black uppercase tracking-[0.3em] text-[10px] hover:text-slate-500 transition-colors mt-4"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12 pb-40">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 mb-3"
                        >
                            <div className="w-1.5 h-10 bg-rodrigo-terracotta rounded-none shadow-sm" />
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                                Cierre de Jornada
                            </h1>
                        </motion.div>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] ml-6 italic">
                            Verificación Final • Liquidación de Caja e Inventario
                        </p>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-none border bg-emerald-50 border-emerald-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest shadow-sm`}>
                        <div className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse" />
                        <span>En Línea</span>
                    </div>
                </header>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    {/* Columna Financiera */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-none border border-slate-100 shadow-sm relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rodrigo-mustard/5 blur-3xl -mr-16 -mt-16"></div>
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                <span className="text-rodrigo-mustard font-black">S/</span>
                                Resumen del Día
                            </h2>

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-none flex justify-between items-center group hover:bg-slate-100 transition-colors shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Inicial</span>
                                    <span className="text-lg font-black text-slate-700 italic">S/ {((stock?.dinero_inicial || 0)).toFixed(2)}</span>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-none flex justify-between items-center group hover:bg-slate-100 transition-colors shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-none bg-emerald-500 shadow-sm"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efectivo</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-700 italic">S/ {(ventasPorMetodo['efectivo'] || 0).toFixed(2)}</span>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-none flex justify-between items-center group hover:bg-slate-100 transition-colors shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-none bg-blue-500 shadow-sm"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarjeta</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-700 italic">S/ {(ventasPorMetodo['tarjeta'] || 0).toFixed(2)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-none shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Image src="/images/yape-logo.png" alt="Yape" width={14} height={14} />
                                            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Yape</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-700 italic">S/ {((ventasPorMetodo['yape'] || 0) - gastosYape).toFixed(2)}</p>
                                    </div>
                                    <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-none shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Image src="/images/plin-logo.png" alt="Plin" width={14} height={14} />
                                            <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest">Plin</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-700 italic">S/ {((ventasPorMetodo['plin'] || 0) - gastosYape).toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-50 space-y-4">
                                    {gastosDelDia.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-rodrigo-terracotta uppercase tracking-[0.2em]">Egresos (Gastos)</span>
                                                <span className="text-[11px] font-black text-rodrigo-terracotta">- S/ {totalGastos.toFixed(2)}</span>
                                            </div>
                                            <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                                                {gastosDelDia.map((g, i) => (
                                                    <div key={i} className="flex justify-between p-2 bg-red-50 border border-red-100 rounded-none text-[9px] font-bold shadow-xs">
                                                        <span className="text-slate-400 uppercase truncate max-w-[120px] font-black italic">{g.descripcion}</span>
                                                        <span className="text-slate-600 font-black">S/ {g.monto.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6 bg-rodrigo-mustard/10 border border-rodrigo-mustard/20 rounded-none text-center">
                                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-[0.3em] mb-2">Total Ventas</p>
                                        <p className="text-4xl font-black text-slate-800 tracking-tighter italic">S/ {metricas.totalIngresos.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-8 rounded-none border border-slate-100 shadow-sm relative overflow-hidden group"
                        >
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                <Calculator size={16} className="text-rodrigo-terracotta" />
                                Cuadre Físico
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Dinero Físico en Caja</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-rodrigo-mustard italic">S/</span>
                                        <input
                                            type="number"
                                            value={dineroCajaReal}
                                            onChange={e => setDineroCajaReal(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-none pl-16 pr-6 py-5 text-4xl font-black text-slate-900 italic outline-none focus:border-rodrigo-terracotta/30 transition-all placeholder:text-slate-200"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {dineroCajaReal && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`p-4 rounded-none border flex justify-between items-center ${Math.abs(parseFloat(dineroCajaReal) - ((ventasPorMetodo['efectivo'] || 0) + (stock?.dinero_inicial || 0) - gastosEfectivo)) < 0.1
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : 'bg-rodrigo-terracotta/10 border-rodrigo-terracotta/20 text-rodrigo-terracotta'
                                            }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">Diferencia</span>
                                        <span className="font-black italic">
                                            S/ {(parseFloat(dineroCajaReal) - ((ventasPorMetodo['efectivo'] || 0) + (stock?.dinero_inicial || 0) - gastosEfectivo)).toFixed(2)}
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Columna Inventario */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-8 rounded-none border border-slate-100 shadow-sm"
                        >
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-10 flex items-center gap-3">
                                <Package className="text-rodrigo-mustard" size={24} />
                                Arqueo de Inventario
                            </h2>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Stock de Pollos</p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aderezados</label>
                                            <input
                                                type="number"
                                                step="0.125"
                                                value={pollosAderezados}
                                                onChange={e => setPollosAderezados(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-lg font-black text-slate-800 italic outline-none focus:border-rodrigo-terracotta/50 transition-all placeholder:text-slate-200 shadow-xs"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crudo</label>
                                            <input
                                                type="number"
                                                step="0.125"
                                                value={pollosCrudos}
                                                onChange={e => setPollosCrudos(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-lg font-black text-slate-800 italic outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-200 shadow-xs"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena Personal</label>
                                            <input
                                                type="number"
                                                step="0.125"
                                                value={cenaPersonal}
                                                onChange={e => setCenaPersonal(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-lg font-black text-slate-800 italic outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-200 shadow-xs"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Merma/Golpeados</label>
                                            <input
                                                type="number"
                                                step="0.125"
                                                value={pollosGolpeados}
                                                onChange={e => setPollosGolpeados(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-lg font-black text-slate-800 italic outline-none focus:border-red-500/50 transition-all placeholder:text-slate-200 shadow-xs"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50 rounded-none border border-slate-100 flex flex-col items-center justify-center text-center shadow-inner">
                                        <div className="flex items-center gap-4 mb-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Sobrantes</p>
                                            <span className="text-3xl font-black text-slate-900 italic">{formatearFraccionPollo(parseFloat(stockPollosReal || '0'))}</span>
                                        </div>
                                        {stockPollosReal && diffPollos !== 0 && (
                                            <div className={`px-4 py-1 rounded-none text-[10px] font-black uppercase tracking-widest ${diffPollos > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                Diferencia: {diffPollos > 0 ? '+' : ''}{formatearFraccionPollo(Math.abs(diffPollos))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Otros Insumos</p>

                                        <div className="p-6 bg-amber-50 border border-amber-100 rounded-none shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">Stock Final Papas (Kg)</label>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Sist: {stock?.papas_iniciales || 0}Kg</span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={stockPapasFinal}
                                                    onChange={e => setStockPapasFinal(e.target.value)}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-none px-6 py-4 text-3xl font-black text-slate-900 italic outline-none focus:border-amber-500/50 transition-all shadow-inner"
                                                    placeholder="0.0"
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black italic uppercase text-xs">Kg</span>
                                            </div>
                                        </div>

                                        <div className="bg-[#f8fafc] p-6 rounded-none border border-slate-200 shadow-inner">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-blue-500 rounded-none"></div>
                                                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest italic">Detalle de Gaseosas</label>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 italic">Sist: {stock?.gaseosas_disponibles || 0}u</span>
                                            </div>

                                            <div className="space-y-4">
                                                {allBrands.map((marca) => {
                                                    const brandData = bebidasDetalle[marca.key] as Record<string, number> | undefined;
                                                    const brandTotal = marca.sizes.reduce((sum, s) => sum + ((brandData?.[s.key]) || 0), 0);
                                                    const isOpen = expandedBrands.has(marca.key);
                                                    const isYellow = marca.key === 'inca_kola';

                                                    const toggleBrand = () => {
                                                        setExpandedBrands(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(marca.key)) next.delete(marca.key);
                                                            else next.add(marca.key);
                                                            return next;
                                                        });
                                                    };

                                                    return (
                                                        <div key={marca.key} className={`rounded-none border transition-all duration-300 ${isOpen
                                                            ? 'bg-white border-slate-200 shadow-md'
                                                            : 'bg-white/50 border-slate-100 hover:border-slate-200'
                                                            }`}>
                                                            <button
                                                                type="button"
                                                                onClick={toggleBrand}
                                                                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                                                            >
                                                                <div className={`w-3 h-3 rounded-none shrink-0 shadow-sm ${marca.dot}`}></div>
                                                                <div className="flex-1">
                                                                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${isYellow ? 'text-rodrigo-brown' : 'text-slate-900'}`}>{marca.name}</h3>
                                                                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isYellow ? 'text-rodrigo-mustard' : 'text-slate-400'}`}>{brandTotal} unidades</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-none flex items-center justify-center transition-all duration-300 ${isOpen ? 'rotate-180 bg-slate-100 text-slate-900' : 'text-slate-300'}`}>
                                                                    <ArrowRight className="rotate-90" size={12} />
                                                                </div>
                                                            </button>

                                                            <AnimatePresence>
                                                                {isOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-slate-50">
                                                                            {marca.sizes.map((size) => {
                                                                                const val = (brandData?.[size.key]) || 0;
                                                                                return (
                                                                                    <div key={size.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-none border border-slate-100 group/size hover:bg-white hover:border-blue-200 transition-all">
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{size.label}</p>
                                                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{size.desc}</p>
                                                                                        </div>
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="numeric"
                                                                                            min="0"
                                                                                            value={val === 0 ? '' : val}
                                                                                            placeholder="0"
                                                                                            onChange={(e) => updateBeverage(marca.key, size.key, e.target.value)}
                                                                                            onFocus={(e) => (e.target as any).select()}
                                                                                            className="w-16 bg-white border border-slate-200 rounded-none px-2 py-1.5 text-center text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all"
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-6 flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Gaseosas</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black text-slate-900 italic">{stockGaseosasReal}</span>
                                                    {stockGaseosasReal && diffGaseosas !== 0 && (
                                                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black italic shadow-sm border ${diffGaseosas > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                                            {diffGaseosas > 0 ? '+' : ''}{diffGaseosas}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white p-8 rounded-none border border-slate-100 shadow-sm"
                            >
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                    <ShoppingBag size={16} className="text-rodrigo-mustard" />
                                    Top Ventas hoy
                                </h2>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {listaPlatosVendidos.length > 0 ? listaPlatosVendidos.map((plato, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-none group hover:bg-slate-100 transition-colors">
                                            <span className="text-[10px] text-slate-600 font-black uppercase truncate max-w-[150px] italic">{plato.nombre}</span>
                                            <span className="bg-rodrigo-mustard border border-rodrigo-mustard/20 px-3 py-1 rounded-none text-[10px] font-black text-slate-900 uppercase shadow-sm">
                                                x{plato.cantidad}
                                            </span>
                                        </div>
                                    )) : (
                                        <p className="text-center py-8 text-slate-200 font-black uppercase tracking-widest text-[10px]">Sin registros</p>
                                    )}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white p-8 rounded-none border border-slate-100 shadow-sm"
                            >
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                    <AlertCircle size={16} className="text-rodrigo-terracotta" />
                                    Observaciones
                                </h2>
                                <textarea
                                    value={observaciones}
                                    onChange={e => setObservaciones(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-none p-6 text-slate-900 text-[11px] font-black outline-none focus:border-rodrigo-terracotta/30 transition-all h-40 resize-none placeholder:text-slate-200 italic uppercase tracking-widest"
                                    placeholder="DETALLES, INCIDENCIAS O NOTAS IMPORTANTES..."
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar with action button */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="fixed bottom-0 left-0 right-0 p-8 pt-12 bg-linear-to-t from-slate-50 via-slate-50/95 to-transparent z-40"
            >
                <div className="max-w-6xl mx-auto flex justify-end">
                    <motion.button
                        onClick={confirmarCierre}
                        disabled={procesando || !stock}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-accent px-12 py-5 rounded-none font-black text-sm uppercase tracking-[0.3em] flex items-center gap-4 bg-slate-900 text-white shadow-xl disabled:opacity-50 disabled:grayscale transition-all italic"
                    >
                        {procesando ? (
                            <>
                                <Loader2 className="animate-spin" /> <span>Finalizando...</span>
                            </>
                        ) : (
                            <>
                                <Lock size={20} strokeWidth={3} />
                                <span>Finalizar Jornada</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

// Ensure necessary imports are present or handled at the top
import { ShoppingBag } from 'lucide-react';
