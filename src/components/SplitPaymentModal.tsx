'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, CreditCard, Smartphone, Check, AlertCircle, FileText, Loader2, Search } from 'lucide-react';

interface PagoDividido {
    efectivo?: number;
    yape?: number;
    plin?: number;
    tarjeta?: number;
}

export interface ComprobanteData {
    tipo_comprobante: 'TICKET' | 'BOLETA' | 'FACTURA';
    cliente_documento_tipo?: '1' | '6'; // 1: DNI, 6: RUC
    cliente_documento_numero?: string;
    cliente_nombre?: string;
    cliente_direccion?: string;
}

interface SplitPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto', pagoDividido?: PagoDividido, comprobante?: ComprobanteData) => void;
}

const METODOS = [
    { key: 'efectivo' as const, label: 'Efectivo', icon: () => <span className="font-bold">S/</span>, color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'yape' as const, label: 'Yape', icon: Smartphone, color: 'bg-purple-500', lightColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'plin' as const, label: 'Plin', icon: Smartphone, color: 'bg-cyan-500', lightColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export default function SplitPaymentModal({ isOpen, onClose, total, onConfirm }: SplitPaymentModalProps) {
    const [montos, setMontos] = useState<PagoDividido>({});
    const [modoRapido, setModoRapido] = useState(true);

    // --- Facturacion State ---
    const [tipoComprobante, setTipoComprobante] = useState<'TICKET' | 'BOLETA' | 'FACTURA'>('TICKET');
    const [documento, setDocumento] = useState('');
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [docError, setDocError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setMontos({});
            setModoRapido(true);
            setTipoComprobante('TICKET');
            setDocumento('');
            setNombre('');
            setDireccion('');
            setDocError(null);
        }
    }, [isOpen]);

    const sumaActual = Object.values(montos).reduce((sum, v) => sum + (v || 0), 0);
    const diferencia = total - sumaActual;
    const esValido = Math.abs(diferencia) < 0.01;

    const metodosUsados = Object.entries(montos).filter(([, v]) => v && v > 0);
    const esMetodoUnico = metodosUsados.length === 1;

    const handleMontoChange = (key: keyof PagoDividido, valor: string) => {
        const num = valor === '' ? 0 : parseFloat(valor);
        if (isNaN(num) || num < 0) return;
        setMontos(prev => ({ ...prev, [key]: num }));
    };

    const handleBuscarDocumento = async () => {
        if (!documento) return;
        setBuscando(true);
        setDocError(null);
        try {
            const tipo = tipoComprobante === 'BOLETA' ? 'dni' : 'ruc';
            const res = await fetch('/api/apiperu?documento=' + documento + '&tipo=' + tipo);
            const data = await res.json();
            
            if (data.success && data.data) {
                setNombre(data.data.nombre_completo || data.data.nombre_o_razon_social || '');
                if (data.data.direccion) setDireccion(data.data.direccion);
            } else {
                setDocError(data.message || 'No encontrado');
                setNombre('');
            }
        } catch (e) {
            setDocError('Error de conexión');
        } finally {
            setBuscando(false);
        }
    };

    useEffect(() => {
        if (tipoComprobante === 'BOLETA' && documento.length === 8) {
            handleBuscarDocumento();
        } else if (tipoComprobante === 'FACTURA' && documento.length === 11) {
            handleBuscarDocumento();
        }
    }, [documento, tipoComprobante]);

    const getComprobanteData = (): ComprobanteData => {
        return {
            tipo_comprobante: tipoComprobante,
            cliente_documento_tipo: tipoComprobante === 'BOLETA' ? '1' : (tipoComprobante === 'FACTURA' ? '6' : undefined),
            cliente_documento_numero: tipoComprobante !== 'TICKET' ? documento : undefined,
            cliente_nombre: tipoComprobante !== 'TICKET' ? nombre : undefined,
            cliente_direccion: tipoComprobante === 'FACTURA' ? direccion : undefined,
        };
    };

    const handleQuickPay = (metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta') => {
        if (tipoComprobante !== 'TICKET' && !nombre) {
            setDocError('Debe ingresar un documento válido');
            return;
        }
        onConfirm(metodo, undefined, getComprobanteData());
    };

    const handleConfirm = () => {
        if (!esValido) return;
        if (tipoComprobante !== 'TICKET' && !nombre) {
            setDocError('Debe ingresar un documento válido');
            return;
        }

        if (esMetodoUnico) {
            const metodo = metodosUsados[0][0] as 'efectivo' | 'yape' | 'plin' | 'tarjeta';
            onConfirm(metodo, undefined, getComprobanteData());
        } else {
            const pagoLimpio: PagoDividido = {};
            for (const [k, v] of Object.entries(montos)) {
                if (v && v > 0) {
                    pagoLimpio[k as keyof PagoDividido] = v;
                }
            }
            onConfirm('mixto', pagoLimpio, getComprobanteData());
        }
    };

    const handleAutoCompletar = (key: keyof PagoDividido) => {
        if (diferencia > 0) {
            setMontos(prev => ({
                ...prev,
                [key]: (prev[key] || 0) + diferencia
            }));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-lg font-bold text-white">Cobrar Pedido</h2>
                            <p className="text-slate-400 text-sm">Total: <span className="text-white font-bold text-lg">S/ {total.toFixed(2)}</span></p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                            <X size={22} />
                        </button>
                    </div>

                    <div className="p-5 overflow-y-auto">
                        
                        {/* SELECCION DE COMPROBANTE */}
                        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-3">Comprobante</p>
                            <div className="flex gap-2 mb-3">
                                <button 
                                    onClick={() => setTipoComprobante('TICKET')} 
                                    className={lex-1 py-2 text-sm font-semibold rounded-lg transition-colors border }
                                >
                                    Ticket
                                </button>
                                <button 
                                    onClick={() => setTipoComprobante('BOLETA')} 
                                    className={lex-1 py-2 text-sm font-semibold rounded-lg transition-colors border }
                                >
                                    Boleta
                                </button>
                                <button 
                                    onClick={() => setTipoComprobante('FACTURA')} 
                                    className={lex-1 py-2 text-sm font-semibold rounded-lg transition-colors border }
                                >
                                    Factura
                                </button>
                            </div>

                            {tipoComprobante !== 'TICKET' && (
                                <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="relative">
                                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                                            <div className="px-3 text-slate-500 text-sm font-medium border-r border-slate-300 bg-slate-50">
                                                {tipoComprobante === 'BOLETA' ? 'DNI' : 'RUC'}
                                            </div>
                                            <input 
                                                type="text" 
                                                value={documento}
                                                onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                                                maxLength={tipoComprobante === 'BOLETA' ? 8 : 11}
                                                placeholder={Ingrese el }
                                                className="flex-1 py-2 px-3 text-sm outline-none w-full"
                                            />
                                            {buscando && (
                                                <div className="px-3 text-blue-500">
                                                    <Loader2 size={16} className="animate-spin" />
                                                </div>
                                            )}
                                            {!buscando && documento.length >= 8 && (
                                                <button onClick={handleBuscarDocumento} className="px-3 text-slate-400 hover:text-blue-500">
                                                    <Search size={16} />
                                                </button>
                                            )}
                                        </div>
                                        {docError && <p className="text-red-500 text-xs mt-1 absolute -bottom-5">{docError}</p>}
                                    </div>
                                    
                                    <div className="pt-2">
                                        <input 
                                            type="text" 
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value.toUpperCase())}
                                            placeholder={tipoComprobante === 'BOLETA' ? 'Nombre completo' : 'Razón Social'}
                                            className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                                        />
                                    </div>
                                    
                                    {tipoComprobante === 'FACTURA' && (
                                        <div>
                                            <input 
                                                type="text" 
                                                value={direccion}
                                                onChange={(e) => setDireccion(e.target.value.toUpperCase())}
                                                placeholder="Dirección fiscal"
                                                className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {modoRapido ? (
                            <>
                                {/* MODO RÁPIDO */}
                                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-3">Pago con un solo método</p>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                     {METODOS.map((m) => {
                                         const Icon = m.icon;
                                         return (
                                             <button
                                                 key={m.key}
                                                 onClick={() => handleQuickPay(m.key)}
                                                 className="py-5 rounded-none font-semibold text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex flex-col items-center justify-center gap-2 active:scale-95"
                                             >
                                                 {Icon && (
                                                     typeof Icon === 'function' && !(Icon as any).prototype?.render ? (Icon as any)() : <Icon size={20} className="text-slate-500" />
                                                 )}
                                                 {m.label}
                                             </button>
                                         );
                                     })}
                                 </div>

                                 {/* Separator */}
                                 <div className="relative my-5">
                                     <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                     <div className="relative flex justify-center">
                                         <span className="bg-white px-4 text-xs text-slate-400 uppercase font-semibold">o</span>
                                     </div>
                                 </div>

                                 {/* Botón dividir */}
                                 <button
                                     onClick={() => setModoRapido(false)}
                                     className="w-full py-4 rounded-none font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                 >
                                     Dividir Pago (Mixto)
                                 </button>
                            </>
                        ) : (
                            <>
                                {/* MODO DIVIDIDO */}
                                <button
                                    onClick={() => { setModoRapido(true); setMontos({}); }}
                                    className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 transition-colors"
                                >
                                    ← Volver a pago simple
                                </button>

                                <div className="space-y-3 mb-5">
                                    {METODOS.map(m => {
                                        const Icon = m.icon;
                                        return (
                                            <div key={m.key} className={lex items-center gap-3 p-3 rounded-none border  transition-all}>
                                                <div className={w-9 h-9 rounded-none  flex items-center justify-center flex-shrink-0}>
                                                    {Icon && (
                                                        typeof Icon === 'function' && !(Icon as any).prototype?.render ? (Icon as any)() : <Icon size={18} className="text-white" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 flex-1">{m.label}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-slate-400">S/</span>
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        min="0"
                                                        value={montos[m.key] || ''}
                                                        onChange={(e) => handleMontoChange(m.key, e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-24 text-right font-bold text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-slate-500 outline-none py-1 text-base transition-colors"
                                                    />
                                                    {diferencia > 0.01 && (
                                                        <button
                                                            onClick={() => handleAutoCompletar(m.key)}
                                                            title={Poner S/  restantes aquí}
                                                            className="text-[10px] text-amber-600 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-none font-bold transition-colors ml-1"
                                                        >
                                                            +{diferencia.toFixed(0)}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Resumen */}
                                <div className={p-4 rounded-none mb-4 }>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-slate-600">Total pedido:</span>
                                        <span className="font-bold text-slate-800">S/ {total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="font-medium text-slate-600">Ingresado:</span>
                                        <span className="font-bold text-slate-800">S/ {sumaActual.toFixed(2)}</span>
                                    </div>
                                    {!esValido && (
                                        <div className={lex items-center gap-1.5 mt-2 pt-2 border-t }>
                                            <AlertCircle size={14} />
                                            <span className="text-xs font-semibold">
                                                {diferencia > 0 ? Falta S/  : Excede S/ }
                                            </span>
                                        </div>
                                    )}
                                    {esValido && (
                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-green-200 text-green-700">
                                            <Check size={14} />
                                            <span className="text-xs font-semibold">¡Monto correcto!</span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirmar */}
                                <button
                                    onClick={handleConfirm}
                                    disabled={!esValido || (tipoComprobante !== 'TICKET' && !nombre)}
                                    className="w-full py-4 rounded-none font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Check size={20} />
                                    Confirmar Pago
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
