'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Producto } from '@/lib/database.types';

type PartesPollo = 'pecho' | 'pierna' | 'ala' | 'encuentro' | 'entrepierna' | 'Rabadilla';
type TipoTrozado = '1/8' | '1/4' | 'entero';

interface ProductOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (producto: Producto, opciones: { parte?: PartesPollo, trozado?: TipoTrozado, notas: string, detalle_bebida?: { marca: string, tipo: string }, cantidad: number }) => void;
    producto: Producto | null;
}

export default function ProductOptionsModal({ isOpen, onClose, onConfirm, producto }: ProductOptionsModalProps) {
    const [parte, setParte] = useState<PartesPollo | undefined>(undefined);
    const [trozado, setTrozado] = useState<TipoTrozado>('entero');
    const [cantidad, setCantidad] = useState(1);
    const [conteoPartes, setConteoPartes] = useState<Record<string, number>>({});
    const [notas, setNotas] = useState('');
    const [marcaGaseosa, setMarcaGaseosa] = useState<'inca_kola' | 'coca_cola'>('inca_kola');
    const [saborInfusion, setSaborInfusion] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setParte(undefined);
            setTrozado('entero');
            setCantidad(1);
            setConteoPartes({});
            setNotas('');
            setMarcaGaseosa('inca_kola');
            setSaborInfusion('');
        }
    }, [isOpen, producto]);

    if (!producto) return null;

    const nombreLower = producto.nombre.toLowerCase();
    const esPromocion = producto.tipo === 'promocion';
    const esPollo = (producto.tipo === 'pollo' || nombreLower.includes('pollo') || nombreLower.includes('mostrito')) && !nombreLower.includes('chaufa');

    // Para pollo entero o medio pollo: mostrar opción de trozado
    // También aplica para promos que incluyan pollo entero
    const esPolloEnteroOMedio = esPollo && (
        nombreLower.includes('entero') ||
        nombreLower.includes('medio') ||
        nombreLower.includes('1/2') ||
        /^1\s*pollo/i.test(nombreLower) ||
        (!esPromocion && nombreLower.includes('pollo') && !nombreLower.includes('1/4') && !nombreLower.includes('1/8') && !nombreLower.includes('combo') && !nombreLower.includes('mostrito'))
    );

    // Para platos con porción de pollo (1/4, 1/8): mostrar selección de parte (presa)
    // También aplica para promos que incluyan "1/4 pollo"
    const permiteParte = esPollo && !esPolloEnteroOMedio && (
        !esPromocion || nombreLower.includes('1/4')
    );

    // Detectar si la promo incluye gaseosa (no chicha)
    const promoConGaseosa = esPromocion && nombreLower.includes('gaseosa');

    // Detectar si es infusión (té, anis, manzanilla...)
    // El usuario pidió: "te manzanilla . canela y clavo, anis"
    // Evitamos que coincida con "entero" o "mostrito" que tienen "te"
    const esInfusion = !esPromocion && (
        nombreLower.includes('infusion') ||
        /\bte\b/i.test(nombreLower) ||
        nombreLower.includes('té') ||
        nombreLower.includes('mate') ||
        nombreLower.includes('anis') ||
        nombreLower.includes('manzanilla')
    );


    const todasPartes: { valor: PartesPollo; emoji: string; label: string }[] = [
        { valor: 'pecho', emoji: '🍗', label: 'Pecho' },
        { valor: 'pierna', emoji: '🍖', label: 'Pierna' },
        { valor: 'ala', emoji: '🦴', label: 'Ala' },
        { valor: 'encuentro', emoji: '🍗', label: 'Encuentro' },
        { valor: 'entrepierna', emoji: '🍖', label: 'Entrepierna' },
        { valor: 'Rabadilla', emoji: '🐔', label: 'Rabadilla' },
    ];

    // Lógica dinámica de presas según requerimiento del usuario
    const esOctavoOMostrito = nombreLower.includes('1/8') || nombreLower.includes('octavo') || nombreLower.includes('mostrito');
    const esCuartoOMostrazo = nombreLower.includes('1/4') || nombreLower.includes('cuarto') || nombreLower.includes('mostrazo');

    let partesConfiguradas = todasPartes;

    if (esCuartoOMostrazo) {
        // Mostrazo o 1/4 solo dos presas: pecho y pierna
        partesConfiguradas = todasPartes.filter(p => p.valor === 'pecho' || p.valor === 'pierna');
    } else if (esOctavoOMostrito) {
        // Mostrito o octavo: pecho, pierna, ala y entrepierna
        partesConfiguradas = todasPartes.filter(p => ['pecho', 'pierna', 'ala', 'entrepierna'].includes(p.valor));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Construir notas finales
        let notasFinales = notas;

        // --- LOGICA MULTI-PARTE ---
        // Si hay cantidad > 1 y conteo de partes, agregar al detalle en texto
        if (cantidad > 1 && Object.keys(conteoPartes).length > 0) {
            const resumenPartes = Object.entries(conteoPartes)
                .filter(([_, qty]) => qty > 0)
                .map(([p, qty]) => `${qty} ${p}`)
                .join(', ');

            if (resumenPartes) {
                notasFinales = notasFinales ? `(${resumenPartes}), ${notasFinales}` : `(${resumenPartes})`;
            }
        }

        if (esPolloEnteroOMedio && trozado !== 'entero') {
            const trozadoTexto = `Trozado en ${trozado}`;
            notasFinales = notasFinales ? `${trozadoTexto}, ${notasFinales}` : trozadoTexto;
        }

        // Si es promo con gaseosa, agregar la marca seleccionada a las notas
        if (promoConGaseosa) {
            const marcaTexto = marcaGaseosa === 'inca_kola' ? 'Inca Kola' : 'Coca Cola';
            notasFinales = notasFinales ? `${marcaTexto} 1.5L, ${notasFinales}` : `${marcaTexto} 1.5L`;
        }

        // Si es infusión, agregar el sabor
        if (esInfusion && saborInfusion) {
            notasFinales = notasFinales ? `${saborInfusion}, ${notasFinales}` : saborInfusion;
        }

        // Determinar detalle_bebida
        let detalleBebida: { marca: string, tipo: string } | undefined = promoConGaseosa
            ? { marca: marcaGaseosa, tipo: 'litro_medio' }
            : undefined;

        // Auto-detectar de los atributos del producto (para bebidas del catálogo dinámico)
        if (!detalleBebida && producto.marca_gaseosa && producto.tipo_gaseosa) {
            detalleBebida = {
                marca: producto.marca_gaseosa,
                tipo: producto.tipo_gaseosa
            };
        }

        // Auto-detectar Chicha si no es promo
        if (!detalleBebida && nombreLower.includes('chicha')) {
            let tipo: any = 'vaso';
            if (nombreLower.includes('medio') || nombreLower.includes('0.5') || nombreLower.includes('0,5') || nombreLower.includes('1/2')) {
                tipo = 'medio_litro';
            } else if (nombreLower.includes('litro') || nombreLower.includes('1l') || nombreLower.includes('jarra')) {
                tipo = 'litro';
            }
            detalleBebida = { marca: 'chicha', tipo };
        }

        onConfirm(producto, {
            parte: cantidad === 1 ? parte : undefined, // Si es 1, enviamos la parte structured. Si son varios, va en notas.
            trozado: esPolloEnteroOMedio ? trozado : undefined,
            notas: notasFinales,
            detalle_bebida: detalleBebida,
            cantidad
        });
        onClose();
    };

    const toggleParteCounter = (p: string, delta: number) => {
        setConteoPartes(prev => {
            const current = prev[p] || 0;
            const nuevo = Math.max(0, current + delta);
            const totalSeleccionado = Object.values(prev).reduce((a, b) => a + b, 0) - current + nuevo;

            // No permitir seleccionar más que la cantidad total
            if (totalSeleccionado > cantidad) return prev;

            return { ...prev, [p]: nuevo };
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/90 backdrop-blur-xl rounded-none shadow-2xl w-full max-w-md border-2 border-white/50 overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-rodrigo-cream to-white sticky top-0">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{producto.nombre}</h2>
                                <p className="text-theme-primary font-semibold">S/ {producto.precio.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-none transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Selector de Cantidad */}
                            <div className="flex items-center justify-between bg-theme-secondary/10 p-3 rounded-none border border-theme-secondary/20">
                                <span className="font-bold text-slate-900">Cantidad</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                                        className="w-8 h-8 rounded-none bg-white text-theme-primary font-bold flex items-center justify-center shadow-sm hover:bg-red-50"
                                    >
                                        -
                                    </button>
                                    <span className="text-xl font-bold text-theme-primary w-6 text-center">{cantidad}</span>
                                    <button
                                        type="button"
                                        onClick={() => setCantidad(cantidad + 1)}
                                        className="w-8 h-8 rounded-none bg-theme-primary text-white font-bold flex items-center justify-center shadow-sm hover:bg-red-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            {/* Opción de Trozado (para pollo entero o medio) */}
                            {esPolloEnteroOMedio && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-900/80 mb-2">
                                        ¿Cómo lo quiere?
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTrozado('entero')}
                                            className={`p-3 rounded-none border-2 transition-all flex flex-col items-center gap-1 ${trozado === 'entero'
                                                ? 'border-theme-primary bg-red-50 text-theme-primary'
                                                : 'border-gray-100 hover:border-theme-secondary/50 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-xl">🐔</span>
                                            <span className="font-semibold text-sm">Entero</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTrozado('1/4')}
                                            className={`p-3 rounded-none border-2 transition-all flex flex-col items-center gap-1 ${trozado === '1/4'
                                                ? 'border-theme-primary bg-red-50 text-theme-primary'
                                                : 'border-gray-100 hover:border-theme-secondary/50 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-xl">🍗</span>
                                            <span className="font-semibold text-sm">Trozado 1/4</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTrozado('1/8')}
                                            className={`p-3 rounded-none border-2 transition-all flex flex-col items-center gap-1 ${trozado === '1/8'
                                                ? 'border-theme-primary bg-red-50 text-theme-primary'
                                                : 'border-gray-100 hover:border-theme-secondary/50 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-xl">🦴</span>
                                            <span className="font-semibold text-sm">Trozado 1/8</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Selección de Parte (solo si aplica) */}
                            {permiteParte && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-900/80 mb-2">
                                        Elegir Parte del Pollo
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {partesConfiguradas.map((p) => {
                                            const count = conteoPartes[p.valor] || 0;
                                            return (
                                                <button
                                                    key={p.valor}
                                                    type="button"
                                                    onClick={() => {
                                                        if (cantidad === 1) {
                                                            setParte(p.valor);
                                                        } else {
                                                            // Lógica de contador
                                                            toggleParteCounter(p.valor, 1);
                                                        }
                                                    }}
                                                    className={`p-3 rounded-none border-2 transition-all flex flex-col items-center gap-1 ${(cantidad === 1 && parte === p.valor) || (cantidad > 1 && count > 0)
                                                        ? 'border-theme-primary bg-red-50 text-theme-primary'
                                                        : 'border-gray-100 hover:border-theme-secondary/50 text-gray-600'
                                                        }`}
                                                >
                                                    <div className="relative">
                                                        <span className="text-xl">{p.emoji}</span>
                                                        {cantidad > 1 && count > 0 && (
                                                            <span className="absolute -top-2 -right-2 bg-theme-primary text-white text-[10px] w-5 h-5 rounded-none flex items-center justify-center font-bold">
                                                                {count}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-semibold text-xs">{p.label}</span>
                                                    {cantidad > 1 && (
                                                        <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                                                            <div
                                                                className="w-full text-xs text-center font-bold text-theme-primary/50 hover:text-theme-primary"
                                                                onClick={() => toggleParteCounter(p.valor, 1)}
                                                            >
                                                                +1
                                                            </div>
                                                            {count > 0 && (
                                                                <div
                                                                    className="w-full text-xs text-center font-bold text-gray-400 hover:text-red-500"
                                                                    onClick={() => toggleParteCounter(p.valor, -1)}
                                                                >
                                                                    -1
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {!parte && <p className="text-amber-500 text-xs mt-1">* Selección opcional</p>}
                                </div>
                            )}

                            {/* Selección de Gaseosa para Promos */}
                            {promoConGaseosa && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-900/80 mb-2">
                                        🥤 Elegir Gaseosa de 1.5L
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMarcaGaseosa('inca_kola')}
                                            className={`p-4 rounded-none border-2 transition-all flex flex-col items-center gap-2 ${marcaGaseosa === 'inca_kola'
                                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                : 'border-gray-100 hover:border-yellow-300 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl">🟡</span>
                                            <span className="font-bold text-sm">Inca Kola</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMarcaGaseosa('coca_cola')}
                                            className={`p-4 rounded-none border-2 transition-all flex flex-col items-center gap-2 ${marcaGaseosa === 'coca_cola'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-100 hover:border-red-300 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl">🔴</span>
                                            <span className="font-bold text-sm">Coca Cola</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Selección de Infusiones */}
                            {esInfusion && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-900/80 mb-2">
                                        🍵 Elegir Sabor
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Manzanilla', 'Anís', 'Té Canela y Clavo'].map((sabor) => (
                                            <button
                                                key={sabor}
                                                type="button"
                                                onClick={() => setSaborInfusion(sabor)}
                                                className={`p-3 rounded-none border-2 transition-all flex flex-col items-center gap-1 ${saborInfusion === sabor
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-100 hover:border-green-300 text-gray-600'
                                                    }`}
                                            >
                                                <span className="font-semibold text-sm">{sabor}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas Adicionales */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-900/80">
                                    Notas / Personalización
                                </label>
                                <textarea
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Ej: Sin ensalada, papas bien fritas, para llevar..."
                                    className="w-full px-4 py-3 rounded-none bg-gray-50 border-2 border-gray-100 focus:border-theme-secondary focus:ring-4 focus:ring-theme-secondary/10 transition-all resize-none h-20"
                                />
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Sin ensalada" : "Sin ensalada"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-none text-gray-600 transition-colors"
                                    >
                                        + Sin ensalada
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Papas crujientes" : "Papas crujientes"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-none text-gray-600 transition-colors"
                                    >
                                        + Papas crujientes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Extra ají" : "Extra ají"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-none text-gray-600 transition-colors"
                                    >
                                        + Extra ají
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-theme-primary text-white font-bold rounded-none shadow-lg hover:bg-theme-primary-dark hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={20} strokeWidth={3} />
                                Agregar al Pedido
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
