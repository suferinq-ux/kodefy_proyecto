import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ShoppingBag, Bird, Drumstick, Layers } from 'lucide-react';
import { useMesas } from '@/hooks/useMesas';
import type { Mesa } from '@/lib/database.types';

interface TableSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTable: (mesa: Mesa | null) => void; // null = Para llevar
}

export default function TableSelector({ isOpen, onClose, onSelectTable }: TableSelectorProps) {
    const { mesas, loading } = useMesas();
    const [filtroPiso, setFiltroPiso] = useState<number>(0); // 0 = Todos

    const handleSelectTable = (mesa: Mesa) => {
        if (mesa.estado === 'libre') {
            onSelectTable(mesa);
            onClose();
        }
    };

    const handleParaLlevar = () => {
        onSelectTable(null);
        onClose();
    };

    // Obtener pisos únicos presentes en las mesas
    const pisosDisponibles = Array.from(new Set(mesas.map(m => m.piso || 1))).sort((a, b) => a - b);
    const mesasFiltradas = mesas.filter(m => filtroPiso === 0 || (m.piso || 1) === filtroPiso);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-none shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-linear-to-r from-theme-primary to-theme-secondary p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center">
                                        <Users size={24} className="text-theme-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Seleccionar Mesa</h2>
                                        <p className="text-white/90 text-sm">Elige una mesa agrupada por piso o selecciona "Para Llevar"</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-none flex items-center justify-center transition-colors"
                                >
                                    <X size={24} className="text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin w-12 h-12 border-4 border-theme-secondary border-t-transparent rounded-full mx-auto mb-4" />
                                        <p className="text-slate-900/60">Cargando mesas...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Opción Para Llevar - Destacada */}
                                        <motion.button
                                            onClick={handleParaLlevar}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full p-4 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-none shadow-md flex items-center justify-center gap-3 text-white font-bold text-lg transition-all"
                                        >
                                            <ShoppingBag size={26} />
                                            <span>🥡 PARA LLEVAR</span>
                                        </motion.button>

                                        {/* Pestañas de Pisos / Niveles */}
                                        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
                                            <div className="flex items-center gap-1.5 text-slate-400 font-black text-xs uppercase mr-2 shrink-0">
                                                <Layers size={16} /> Pisos:
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFiltroPiso(0)}
                                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all italic shrink-0 ${
                                                    filtroPiso === 0
                                                        ? 'bg-slate-900 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                Todos ({mesas.filter(m => m.estado === 'libre').length}/{mesas.length} libres)
                                            </button>

                                            {pisosDisponibles.map(pisoNum => {
                                                const mesasPiso = mesas.filter(m => (m.piso || 1) === pisoNum);
                                                const libresPiso = mesasPiso.filter(m => m.estado === 'libre').length;
                                                const label = pisoNum === 5 ? 'Terraza' : `${pisoNum}° Piso`;
                                                return (
                                                    <button
                                                        key={pisoNum}
                                                        type="button"
                                                        onClick={() => setFiltroPiso(pisoNum)}
                                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none transition-all italic shrink-0 ${
                                                            filtroPiso === pisoNum
                                                                ? 'bg-slate-900 text-white shadow-sm'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {label} ({libresPiso}/{mesasPiso.length} libres)
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Grid de mesas */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {mesasFiltradas.length === 0 ? (
                                                <div className="col-span-full text-center py-10 text-slate-400 font-bold text-sm">
                                                    No hay mesas configuradas para este piso.
                                                </div>
                                            ) : (
                                                mesasFiltradas.map((mesa) => (
                                                    <motion.button
                                                        key={mesa.id}
                                                        onClick={() => handleSelectTable(mesa)}
                                                        disabled={mesa.estado === 'ocupada'}
                                                        whileHover={mesa.estado === 'libre' ? { scale: 1.03 } : {}}
                                                        whileTap={mesa.estado === 'libre' ? { scale: 0.97 } : {}}
                                                        className={`
                                                            relative h-32 rounded-none font-bold flex flex-col items-center justify-center p-3
                                                            transition-all duration-300
                                                            ${mesa.estado === 'libre'
                                                                ? 'bg-rodrigo-cream border-2 border-stone-200 text-stone-700 hover:border-theme-secondary hover:text-theme-secondary shadow-sm hover:shadow-md cursor-pointer'
                                                                : 'bg-stone-100 border-2 border-theme-primary text-theme-primary shadow-md cursor-not-allowed opacity-90'
                                                            }
                                                        `}
                                                    >
                                                        <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-black/5 text-stone-500">
                                                            {(mesa.piso || 1) === 5 ? 'Terraza' : `${mesa.piso || 1}° Piso`}
                                                        </span>

                                                        {mesa.estado === 'libre' ? (
                                                            <Bird size={32} className="mb-1 transition-colors text-emerald-600" />
                                                        ) : (
                                                            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                                                                <Drumstick size={32} className="mb-1 text-theme-primary" />
                                                            </motion.div>
                                                        )}
                                                        <span className="text-base font-black uppercase italic">Mesa {mesa.numero}</span>
                                                    </motion.button>
                                                ))
                                            )}
                                        </div>

                                        {/* Leyenda */}
                                        <div className="flex flex-wrap items-center justify-center gap-6 p-3.5 bg-stone-100 rounded-none">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag size={18} className="text-amber-500" />
                                                <span className="text-stone-600 font-semibold text-xs">Para Llevar</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Bird size={18} className="text-emerald-600" />
                                                <span className="text-stone-600 font-semibold text-xs">Libre / Disponible</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Drumstick size={18} className="text-theme-primary" />
                                                <span className="text-stone-600 font-semibold text-xs">Ocupada</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

