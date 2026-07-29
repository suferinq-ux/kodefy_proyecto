'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shuffle, Users, Check, Loader2, ArrowRight } from 'lucide-react';
import type { Mesa } from '@/lib/database.types';
import toast from 'react-hot-toast';

interface CambiarMesaModalProps {
    isOpen: boolean;
    onClose: () => void;
    mesaOrigen: Mesa | null;
    mesas: Mesa[];
    onConfirmCambio: (mesaOrigenId: number, mesaDestinoId: number) => Promise<boolean>;
}

export default function CambiarMesaModal({
    isOpen,
    onClose,
    mesaOrigen,
    mesas,
    onConfirmCambio,
}: CambiarMesaModalProps) {
    const [selectedDestino, setSelectedDestino] = useState<Mesa | null>(null);
    const [filtroPiso, setFiltroPiso] = useState<number>(0);
    const [procesando, setProcesando] = useState(false);

    if (!isOpen || !mesaOrigen) return null;

    // Solo mesas libres y que no sean la misma origen
    const mesasLibres = mesas.filter(
        (m) => m.estado === 'libre' && m.id !== mesaOrigen.id
    );

    const pisosExistentes = Array.from(
        new Set(mesasLibres.map((m) => m.piso || 1))
    ).sort((a, b) => a - b);

    const mesasFiltradas = mesasLibres.filter(
        (m) => filtroPiso === 0 || (m.piso || 1) === filtroPiso
    );

    const handleConfirm = async () => {
        if (!selectedDestino) {
            toast.error('Selecciona una mesa de destino');
            return;
        }

        setProcesando(true);
        try {
            const exito = await onConfirmCambio(mesaOrigen.id, selectedDestino.id);
            if (exito) {
                toast.success(`¡Pedido movido exitosamente a Mesa ${selectedDestino.numero}!`, {
                    icon: '🔀',
                    duration: 4000,
                });
                onClose();
                setSelectedDestino(null);
            } else {
                toast.error('No se pudo cambiar la mesa. Intenta nuevamente.');
            }
        } catch (err) {
            console.error('Error al cambiar mesa:', err);
            toast.error('Error al intentar cambiar de mesa');
        } finally {
            setProcesando(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-none overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header Modal */}
                    <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rodrigo-terracotta text-white flex items-center justify-center rounded-none shadow-md">
                                <Shuffle size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-tight">
                                    Cambiar de Mesa
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    Mover pedido activo de <span className="text-rodrigo-mustard font-black">Mesa {mesaOrigen.numero}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* Selector de Pisos */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                Ambiente:
                            </span>
                            <button
                                type="button"
                                onClick={() => setFiltroPiso(0)}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                                    filtroPiso === 0
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                Todas libres ({mesasLibres.length})
                            </button>
                            {pisosExistentes.map((pisoNum) => {
                                const count = mesasLibres.filter(
                                    (m) => (m.piso || 1) === pisoNum
                                ).length;
                                const label = pisoNum === 5 ? 'Terraza' : `${pisoNum}° Piso`;
                                return (
                                    <button
                                        key={pisoNum}
                                        type="button"
                                        onClick={() => setFiltroPiso(pisoNum)}
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                                            filtroPiso === pisoNum
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {label} ({count})
                                    </button>
                                );
                            })}
                        </div>

                        {/* Indicador Mesa Origen -> Mesa Destino */}
                        <div className="p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div className="text-center sm:text-left">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                                    Mesa Origen (Actual)
                                </span>
                                <span className="text-lg font-black text-slate-900 italic uppercase">
                                    Mesa {mesaOrigen.numero}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-rodrigo-terracotta px-4">
                                <ArrowRight size={24} className="animate-pulse" />
                            </div>

                            <div className="text-center sm:text-right">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                                    Nueva Mesa (Destino)
                                </span>
                                <span
                                    className={`text-lg font-black italic uppercase ${
                                        selectedDestino
                                            ? 'text-emerald-600'
                                            : 'text-slate-300'
                                    }`}
                                >
                                    {selectedDestino ? `Mesa ${selectedDestino.numero}` : 'Sin seleccionar'}
                                </span>
                            </div>
                        </div>

                        {/* Grid de Mesas Libres */}
                        {mesasFiltradas.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-slate-200">
                                <Users size={40} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    No hay mesas libres disponibles en este ambiente
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {mesasFiltradas.map((mesa) => {
                                    const isSelected = selectedDestino?.id === mesa.id;
                                    return (
                                        <button
                                            key={mesa.id}
                                            type="button"
                                            onClick={() => setSelectedDestino(mesa)}
                                            className={`p-4 border-2 transition-all text-center relative group ${
                                                isSelected
                                                    ? 'bg-emerald-50 border-emerald-500 shadow-md scale-[1.02]'
                                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            )}

                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                                {(mesa.piso || 1) === 5 ? 'Terraza' : `${mesa.piso || 1}° P.`}
                                            </span>

                                            <p className={`text-xl font-black italic tracking-tighter uppercase ${isSelected ? 'text-emerald-800' : 'text-slate-900'}`}>
                                                Mesa {mesa.numero}
                                            </p>

                                            <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest mt-1 inline-block">
                                                Libre
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={procesando}
                            className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all border border-slate-200"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!selectedDestino || procesando}
                            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 shadow-lg ${
                                selectedDestino && !procesando
                                    ? 'bg-rodrigo-terracotta hover:bg-red-700 shadow-rodrigo-terracotta/30'
                                    : 'bg-slate-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {procesando ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>Moviendo pedido...</span>
                                </>
                            ) : (
                                <>
                                    <Shuffle size={14} />
                                    <span>
                                        Mover Pedido {selectedDestino ? `a Mesa ${selectedDestino.numero}` : ''}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
