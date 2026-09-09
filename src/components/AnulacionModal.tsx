import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface AnulacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => Promise<void>;
    titulo?: string;
    subtitulo?: string;
    loading?: boolean;
}

export default function AnulacionModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    titulo = 'Anular Pedido', 
    subtitulo = 'Por favor indique el motivo de la anulación.',
    loading = false 
}: AnulacionModalProps) {
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMotivo('');
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!motivo.trim()) {
            toast.error('El motivo de anulación es obligatorio.');
            return;
        }
        if (motivo.trim().length < 5) {
            toast.error('Por favor, sea más específico en el motivo.');
            return;
        }
        await onConfirm(motivo.trim());
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md"
                    >
                        <div className="bg-white rounded-none overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="bg-red-500 text-white p-5 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 text-red-600/30">
                                    <AlertTriangle size={80} strokeWidth={1} />
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-1.5 h-6 bg-white"></div>
                                    <div>
                                        <h3 className="font-black text-xl leading-none tracking-tight uppercase italic">{titulo}</h3>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-red-100 mt-1">{subtitulo}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors relative z-10 active:scale-90">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="mb-6">
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                                        Motivo de Eliminación <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        placeholder="Ej. Cliente canceló, error de digitación..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-none px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium resize-none"
                                        rows={3}
                                        disabled={loading}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 italic">
                                        * Este motivo quedará registrado en la auditoría del sistema para revisión administrativa.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        disabled={loading}
                                        className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading}
                                        className="flex-1 py-3 bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 italic disabled:opacity-50"
                                    >
                                        {loading ? (
                                            'Procesando...'
                                        ) : (
                                            <>
                                                <Trash2 size={16} /> Confirmar Anulación
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
