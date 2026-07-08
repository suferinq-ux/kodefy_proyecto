'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Clock, CheckCircle, ChefHat, Printer, Trash2, Edit3, Drumstick, Utensils, CupSoda, Package, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Venta } from '@/lib/database.types';

interface PedidoCardProps {
    venta: Venta;
    onComplete: (id: string) => void;
    onPrint?: (venta: Venta) => void;
    onCancel?: (id: string) => void;
    onEdit?: (venta: Venta) => void;
    index?: number;
}

const getItemIcon = (nombre: string) => {
    const text = nombre.toLowerCase();
    if (text.includes('pollo') || text.includes('1/') || text.includes('brasa') || text.includes('broaster') || text.includes('ala')) return <Drumstick size={16} className="text-theme-primary" />;
    if (text.includes('gaseosa') || text.includes('chicha') || text.includes('agua') || text.includes('limonada') || text.includes('inca') || text.includes('coca')) return <CupSoda size={16} className="text-blue-500" />;
    if (text.includes('papa')) return <Package size={16} className="text-theme-secondary" />;
    return <Utensils size={16} className="text-stone-500" />;
};

export default function PedidoCard({ venta, onComplete, onPrint, onCancel, onEdit, index = 0 }: PedidoCardProps) {
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    const x = useMotionValue(0);
    const opacity = useTransform(x, [0, 200], [1, 0]);
    const scale = useTransform(x, [0, 150], [1, 0.95]);
    const rotate = useTransform(x, [0, 150], [0, -2]);

    useEffect(() => {
        const updateTime = () => {
            const created = new Date(venta.created_at).getTime();
            const now = new Date().getTime();
            setElapsedMinutes(Math.floor((now - created) / 60000));
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [venta.created_at]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 150) {
            onComplete(venta.id);
        }
    };

    const isDelayed = elapsedMinutes >= 15;
    const isCrisis = elapsedMinutes >= 25;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
            transition={{
                delay: index * 0.05,
                type: "spring",
                stiffness: 400,
                damping: 30
            }}
            style={{ x, opacity, scale, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragSnapToOrigin={true}
            onDragEnd={handleDragEnd}
            className="group relative cursor-grab active:cursor-grabbing"
        >
            {/* Swiper Hint Backdrop */}
            <div className="absolute inset-0 bg-linear-to-r from-green-500/20 to-transparent rounded-none opacity-0 group-active:opacity-100 transition-opacity flex items-center pl-8">
                <CheckCircle size={40} className="text-green-500 animate-pulse" />
            </div>

            {/* Main Card */}
            <div className={`
                relative bg-white rounded-none border overflow-hidden transition-all duration-500 shadow-sm
                ${isCrisis ? 'border-red-500' : isDelayed ? 'border-theme-primary' : 'border-slate-100'}
            `}>
                {/* Status Bar */}
                <div className={`h-1.5 w-full ${isCrisis ? 'bg-red-500' : isDelayed ? 'bg-theme-primary' : 'bg-theme-secondary'}`}></div>

                <div className="p-4 md:p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isCrisis ? 'text-red-500' : isDelayed ? 'text-theme-primary' : 'text-slate-400'}`}>
                                    {isCrisis ? 'CRÍTICO' : isDelayed ? 'RETRASADO' : 'EN PREPARACIÓN'}
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 leading-none flex items-center gap-3 italic">
                                MESA {(venta as any).mesas?.numero || venta.mesa_id || 'MOSTRADOR'}
                                <span className="text-[10px] font-mono text-slate-300 tracking-tighter not-italic">#TK-{venta.id.slice(0, 4).toUpperCase()}</span>
                            </h3>
                        </div>

                        <div className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-none border transition-colors duration-500 shadow-sm
                            ${isCrisis ? 'bg-red-50 border-red-100 text-red-600' :
                                isDelayed ? 'bg-theme-primary/5 border-theme-primary/10 text-theme-primary' :
                                    'bg-slate-50 border-slate-100 text-slate-400'}
                        `}>
                            <Clock size={14} className={isDelayed ? 'animate-pulse' : ''} />
                            <span className="text-sm font-black tabular-nums">{elapsedMinutes}m</span>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3 mb-6">
                        {venta.items.map((item, idx) => (
                            <div key={idx} className="relative group/item">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 shrink-0 rounded-none bg-slate-50 border border-slate-100 flex items-center justify-center text-theme-primary font-black text-lg shadow-sm">
                                        {item.cantidad}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-900 font-black text-base md:text-lg uppercase tracking-tight group-hover/item:text-theme-primary transition-colors italic">
                                                {item.nombre}
                                            </span>
                                            <div className="opacity-40 scale-90">{getItemIcon(item.nombre)}</div>
                                        </div>

                                        {(item as any).detalles && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {(item as any).detalles.parte && (
                                                    <span className="px-2 py-0.5 bg-theme-primary/80 text-white text-[9px] font-black uppercase rounded-none tracking-widest shadow-lg">
                                                        {(item as any).detalles.parte}
                                                    </span>
                                                )}
                                                {(item as any).detalles.notas && (
                                                    <div className="w-full mt-1 p-2 bg-theme-secondary/5 border border-theme-secondary/20 rounded-none">
                                                        <p className="text-[11px] text-theme-secondary font-bold leading-tight">
                                                            <span className="opacity-50">NOTA:</span> {(item as any).detalles.notas.toUpperCase()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* General Notes */}
                    {venta.notas && (
                        <div className="mb-8 p-4 bg-white/[0.03] border-l-2 border-theme-secondary rounded-none">
                            <p className="text-[9px] font-black text-theme-secondary uppercase tracking-[0.2em] mb-1 opacity-60">Instrucciones del Pedido</p>
                            <p className="text-sm font-medium text-white/80 italic">"{venta.notas}"</p>
                        </div>
                    )}

                    {/* Action Footer */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex gap-2">
                            {onPrint && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onPrint(venta); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-none bg-white border border-slate-100 text-slate-400 hover:text-theme-primary hover:border-theme-primary/30 transition-all shadow-sm"
                                >
                                    <Printer size={18} />
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(venta); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-none bg-white border border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm"
                                >
                                    <Edit3 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pointer-events-none">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em]">Deslizar para completar</span>
                            <ArrowRight size={14} className="text-slate-300" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
