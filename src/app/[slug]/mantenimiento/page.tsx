'use client';

import { useState } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RotateCcw, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';

export default function MantenimientoPage() {
    return (
        <ProtectedRoute requiredPermission="configuracion">
            <MantenimientoContent />
        </ProtectedRoute>
    );
}

function MantenimientoContent() {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { business } = useBusiness();

    const handleResetSystem = async () => {
        setLoading(true);
        try {
            const fechaHoy = obtenerFechaHoy();
            
            if (!business?.id) {
                toast.error('Error: Negocio no identificado');
                setLoading(false);
                return;
            }

            // 1. Eliminar ventas de hoy
            const { error: errorVentas } = await supabase
                .from('ventas')
                .delete()
                .eq('fecha', fechaHoy)
                .eq('negocio_id', business.id);

            if (errorVentas) throw errorVentas;

            // 2. Eliminar gastos de hoy
            const { error: errorGastos } = await supabase
                .from('gastos')
                .delete()
                .eq('fecha', fechaHoy)
                .eq('negocio_id', business.id);

            if (errorGastos) throw errorGastos;

            // 3. Eliminar inventario de hoy
            const { error: errorInv } = await supabase
                .from('inventario_diario')
                .delete()
                .eq('fecha', fechaHoy)
                .eq('negocio_id', business.id);

            if (errorInv) throw errorInv;

            // 4. Resetear estado de todas las mesas a libre
            const { error: errorMesas } = await supabase
                .from('mesas')
                .update({ estado: 'libre' })
                .eq('negocio_id', business.id);

            if (errorMesas) throw errorMesas;

            setSuccess(true);
            toast.success('Sistema restablecido totalmente', { icon: '🔥' });

            setTimeout(() => {
                router.push(`/${params.slug}/apertura`);
            }, 2000);

        } catch (error: any) {
            console.error('Error al restablecer sistema:', error);
            toast.error('Error crítico al restablecer: ' + (error.message || 'Error de base de datos'));
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12 flex items-center justify-center">
            <div className="max-w-2xl w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-100 rounded-none p-8 md:p-12 shadow-sm text-center relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rodrigo-mustard/5 blur-3xl -mr-32 -mt-32"></div>

                    <div className="relative z-10">
                        <header className="mb-12">
                            <div className="w-20 h-20 bg-slate-50 rounded-none flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-sm">
                                <ShieldAlert size={40} className="text-rodrigo-terracotta" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">
                                Mantenimiento del Sistema
                            </h1>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 italic">
                                <span className="w-2 h-2 rounded-none bg-rodrigo-terracotta animate-pulse"></span>
                                Zona de Acceso Restringido
                            </p>
                        </header>

                        {!success ? (
                            <div className="space-y-8">
                                <div className="bg-red-50 border border-red-100 rounded-none p-8 text-left">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center border border-red-200 shrink-0 shadow-sm">
                                            <AlertTriangle size={20} className="text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-red-900 uppercase tracking-tight italic mb-2">BORRADO TOTAL DEL DÍA</h3>
                                            <p className="text-red-700/70 text-sm font-bold uppercase tracking-wide leading-relaxed italic">
                                                ESTA ACCIÓN ES DESTRUCTIVA. Se borrarán todas las VENTAS, GASTOS y la APERTURA de hoy. Las mesas volverán a estado LIBRE.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-red-100 flex flex-col gap-2">
                                        <div className="flex items-center gap-3 text-[10px] font-black text-red-400 uppercase tracking-widest italic">
                                            <CheckCircle2 size={14} /> Se eliminarán todas las transacciones de hoy.
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-black text-red-400 uppercase tracking-widest italic">
                                            <CheckCircle2 size={14} /> Se requerirá una nueva apertura manual.
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowConfirm(true)}
                                    disabled={loading}
                                    className="w-full py-6 bg-red-600 text-white font-black rounded-none shadow-2xl hover:bg-red-700 active:scale-95 transition-all text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic group"
                                >
                                    <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                                    BORRAR TODA LA JORNADA
                                </button>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12"
                            >
                                <div className="w-24 h-24 bg-green-50 rounded-none flex items-center justify-center mx-auto mb-8 border border-green-100">
                                    <CheckCircle2 size={48} className="text-green-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-4">¡Sistema Restablecido!</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Redirigiendo a la pantalla de apertura...</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white border border-slate-100 rounded-none p-10 w-full max-w-sm text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-none flex items-center justify-center mx-auto mb-6 border border-red-200">
                                <AlertTriangle size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase italic">¿ESTÁS SEGURO?</h3>
                            <p className="text-slate-400 text-[11px] mb-8 font-bold uppercase tracking-widest leading-relaxed italic">
                                ESTA ACCIÓN BORRARÁ VENTAS Y GASTOS DE HOY. NO SE PUEDE DESHACER.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleResetSystem}
                                    disabled={loading}
                                    className="w-full py-5 bg-red-600 text-white font-black rounded-none shadow-lg hover:bg-red-700 active:scale-95 transition-all uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-2"
                                >
                                    {loading ? 'BORRANDO...' : 'SÍ, BORRAR TODO'}
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full py-5 bg-slate-50 text-slate-400 font-black rounded-none hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest italic"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
