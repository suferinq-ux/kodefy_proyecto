'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ShoppingBag, Bird, Drumstick } from 'lucide-react';
import { useMesas } from '@/hooks/useMesas';
import type { Mesa } from '@/lib/database.types';

interface TableSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTable: (mesa: Mesa | null) => void; // null = Para llevar
}

export default function TableSelector({ isOpen, onClose, onSelectTable }: TableSelectorProps) {
    const { mesas, loading } = useMesas();

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
                        <div className="bg-white rounded-none shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="bg-linear-to-r from-theme-primary to-theme-secondary p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center">
                                        <Users size={24} className="text-theme-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Seleccionar Mesa</h2>
                                        <p className="text-white/90 text-sm">Elige una mesa o selecciona "Para Llevar"</p>
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
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
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
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full mb-6 p-5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-none shadow-lg flex items-center justify-center gap-4 text-white font-bold text-xl transition-all"
                                        >
                                            <ShoppingBag size={32} />
                                            <span>🥡 PARA LLEVAR</span>
                                        </motion.button>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex-1 h-px bg-slate-900/20" />
                                            <span className="text-slate-900/60 font-semibold text-sm">o selecciona una mesa</span>
                                            <div className="flex-1 h-px bg-slate-900/20" />
                                        </div>

                                        {/* Grid de mesas */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            {mesas.map((mesa) => (
                                                <motion.button
                                                    key={mesa.id}
                                                    onClick={() => handleSelectTable(mesa)}
                                                    disabled={mesa.estado === 'ocupada'}
                                                    whileHover={mesa.estado === 'libre' ? { scale: 1.05 } : {}}
                                                    whileTap={mesa.estado === 'libre' ? { scale: 0.95 } : {}}
                                                    className={`
                                                        relative h-32 rounded-none font-bold flex flex-col items-center justify-center
                                                        transition-all duration-300
                                                        ${mesa.estado === 'libre'
                                                            ? 'bg-rodrigo-cream border-2 border-stone-200 text-stone-400 hover:border-theme-secondary hover:text-theme-secondary shadow-sm hover:shadow-md cursor-pointer'
                                                            : 'bg-stone-100 border-2 border-theme-primary text-theme-primary shadow-lg cursor-not-allowed opacity-90'
                                                        }
                                                    `}
                                                >
                                                    {mesa.estado === 'libre' ? (
                                                        <Bird size={36} className="mb-2 transition-colors" />
                                                    ) : (
                                                        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                                                            <Drumstick size={36} className="mb-2" />
                                                        </motion.div>
                                                    )}
                                                    <span className="text-lg">Mesa {mesa.numero}</span>
                                                </motion.button>
                                            ))}
                                        </div>

                                        {/* Leyenda */}
                                        <div className="flex flex-wrap items-center justify-center gap-6 p-4 bg-stone-100 rounded-none">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag size={20} className="text-amber-500" />
                                                <span className="text-stone-600 font-semibold text-sm">Para Llevar</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Bird size={20} className="text-stone-400" />
                                                <span className="text-stone-600 font-semibold text-sm">Libre / Disponible</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Drumstick size={20} className="text-theme-primary" />
                                                <span className="text-stone-600 font-semibold text-sm">Ocupada</span>
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

