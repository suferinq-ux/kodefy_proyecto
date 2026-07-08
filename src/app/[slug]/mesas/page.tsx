'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, RefreshCw, Loader2 } from 'lucide-react';
import { useMesas } from '@/hooks/useMesas';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MesasPage() {
    return (
        <ProtectedRoute>
            <MesasContent />
        </ProtectedRoute>
    );
}

function MesasContent() {
    const { mesas, loading, ocuparMesa, liberarMesa, refetch } = useMesas();
    const [toggling, setToggling] = useState<number | null>(null);

    const handleToggleMesa = async (mesaId: number, estadoActual: 'libre' | 'ocupada') => {
        setToggling(mesaId);
        try {
            if (estadoActual === 'libre') {
                await ocuparMesa(mesaId);
                toast.success('Mesa marcada como ocupada');
            } else {
                await liberarMesa(mesaId);
                toast.success('Mesa liberada');
            }
        } catch (error) {
            toast.error('Error al cambiar estado de mesa');
        } finally {
            setToggling(null);
        }
    };

    const mesasLibres = mesas.filter(m => m.estado === 'libre').length;
    const mesasOcupadas = mesas.filter(m => m.estado === 'ocupada').length;

    return (
        <div className="min-h-screen bg-stone-950 p-4 sm:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 mb-3"
                        >
                            <div className="w-1.5 h-10 bg-linear-to-b from-rodrigo-terracotta to-rodrigo-mustard rounded-full" />
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
                                Gestión de Mesas
                            </h1>
                        </motion.div>
                        <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] ml-6 italic">
                            Control Operativo • Disponibilidad en Tiempo Real
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={refetch}
                            className="p-4 glass-panel hover:bg-white/10 transition-all group"
                            title="Actualizar"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin text-rodrigo-mustard' : 'text-white/40 group-hover:text-white'} />
                        </button>
                    </div>
                </header>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel p-8 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rodrigo-mustard/5 blur-3xl -mr-16 -mt-16 group-hover:bg-rodrigo-mustard/10 transition-colors"></div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Total Salón</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-5xl font-black text-white italic">{mesas.length}</h3>
                            <Users size={32} className="text-rodrigo-mustard/40" />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-panel p-8 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
                        <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.3em] mb-4">Disponibles</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-5xl font-black text-emerald-400 italic">{mesasLibres}</h3>
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-panel p-8 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rodrigo-terracotta/5 blur-3xl -mr-16 -mt-16 group-hover:bg-rodrigo-terracotta/10 transition-colors"></div>
                        <p className="text-[10px] font-black text-rodrigo-terracotta/60 uppercase tracking-[0.3em] mb-4">Ocupadas</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-5xl font-black text-rodrigo-terracotta italic">{mesasOcupadas}</h3>
                            <div className="w-10 h-10 rounded-full bg-rodrigo-terracotta/10 border border-rodrigo-terracotta/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-rodrigo-terracotta animate-pulse"></div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Grid de Mesas */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6">
                        <div className="w-16 h-16 border-4 border-white/5 border-t-rodrigo-mustard rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] animate-pulse">Escaneando salón...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {mesas.map((mesa, index) => (
                            <motion.button
                                key={mesa.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleToggleMesa(mesa.id, mesa.estado)}
                                disabled={toggling === mesa.id}
                                className={`
                                    relative p-8 rounded-[2rem] border-2 transition-all duration-500 overflow-hidden group
                                    ${mesa.estado === 'libre'
                                        ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 shadow-lg shadow-emerald-500/0 hover:shadow-emerald-500/10'
                                        : 'bg-rodrigo-terracotta/5 border-rodrigo-terracotta/10 hover:border-rodrigo-terracotta/40 hover:bg-rodrigo-terracotta/10 shadow-lg shadow-rodrigo-terracotta/0 hover:shadow-rodrigo-terracotta/10'
                                    }
                                    ${toggling === mesa.id ? 'opacity-50 cursor-wait scale-95' : 'hover:-translate-y-2 active:scale-95'}
                                `}
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <div className={`w-2 h-2 rounded-full ${mesa.estado === 'libre' ? 'bg-emerald-400' : 'bg-rodrigo-terracotta'} animate-pulse`} />
                                </div>

                                <div className="relative z-10 text-center">
                                    <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${mesa.estado === 'libre' ? 'bg-emerald-500/10' : 'bg-rodrigo-terracotta/10'}`}>
                                        <Users size={28} className={mesa.estado === 'libre' ? 'text-emerald-400' : 'text-rodrigo-terracotta'} />
                                    </div>

                                    <h4 className="text-2xl font-black text-white mb-1 italic tracking-tighter uppercase">
                                        Mesa {mesa.numero}
                                    </h4>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${mesa.estado === 'libre' ? 'text-emerald-500/60' : 'text-rodrigo-terracotta/60'}`}>
                                        {mesa.estado}
                                    </p>
                                </div>

                                {toggling === mesa.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                        <Loader2 className="animate-spin text-white" size={24} />
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Footer Tip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-20 p-8 glass-panel border-dashed border-white/5 text-center relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-linear-to-r from-rodrigo-mustard/0 via-rodrigo-mustard/5 to-rodrigo-mustard/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] italic">
                        <span className="text-rodrigo-mustard mr-2">💡</span> Click en cualquier mesa para cambiar su estado instantáneamente
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
