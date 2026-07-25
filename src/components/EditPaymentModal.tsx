import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Calculator, ShoppingBag, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { Venta, ItemVenta } from '@/lib/database.types';
import { calcularStockRestado } from '@/lib/ventas';
import toast from 'react-hot-toast';

interface EditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onUpdate: () => void;
}

type MetodoPago = 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto';
type Tab = 'pago' | 'productos';

export default function EditPaymentModal({ isOpen, onClose, venta, onUpdate }: EditPaymentModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('pago');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
    const [splitPago, setSplitPago] = useState({
        efectivo: 0,
        yape: 0,
        plin: 0,
        tarjeta: 0
    });
    const [items, setItems] = useState<ItemVenta[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isOpen && venta) {
            setMetodoPago((venta.metodo_pago as MetodoPago) || 'efectivo');
            if (venta.metodo_pago === 'mixto' && venta.pago_dividido) {
                setSplitPago({
                    efectivo: venta.pago_dividido.efectivo || 0,
                    yape: venta.pago_dividido.yape || 0,
                    plin: venta.pago_dividido.plin || 0,
                    tarjeta: venta.pago_dividido.tarjeta || 0
                });
            } else {
                setSplitPago({ efectivo: 0, yape: 0, plin: 0, tarjeta: 0 });
            }
            // Clonar items de la venta
            setItems(JSON.parse(JSON.stringify(venta.items || [])));
            setActiveTab('pago');
        }
    }, [isOpen, venta]);

    const handleSplitChange = (method: keyof typeof splitPago, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSplitPago(prev => ({ ...prev, [method]: numValue }));
    };

    // Calcular subtotal acumulado de los productos actuales
    const totalProductos = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalVentaCalculado = totalProductos + (venta?.costo_envio || 0);

    const totalSplit = Object.values(splitPago).reduce((a, b) => a + b, 0);
    const montoFaltante = totalVentaCalculado - totalSplit;

    // Modificar cantidad de un producto
    const updateCantidad = (index: number, delta: number) => {
        setItems(prev => {
            const copy = [...prev];
            const nuevaCantidad = copy[index].cantidad + delta;
            if (nuevaCantidad <= 0) {
                // Eliminar producto si llega a 0
                copy.splice(index, 1);
            } else {
                copy[index].cantidad = nuevaCantidad;
            }
            return copy;
        });
    };

    // Eliminar producto individual
    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Guardar cambios en la venta
    const handleSave = async () => {
        if (!venta) return;

        if (items.length === 0) {
            toast.error('La venta debe tener al menos 1 producto. Si deseas anularla, usa el botón Eliminar Venta.');
            return;
        }

        if (metodoPago === 'mixto' && Math.abs(montoFaltante) > 0.1) {
            toast.error(`Los montos del pago mixto no coinciden. Faltan S/ ${montoFaltante.toFixed(2)}`);
            return;
        }

        setLoading(true);
        try {
            // Reconstruir items para cálculo de stock
            const itemsParaCalculo = items.map(it => ({
                ...it,
                subtotal: it.precio * it.cantidad,
                fraccion_pollo: it.fraccion_pollo || 0
            }));

            const { pollosRestados, gaseosasRestadas, chichaRestada, bebidasDetalle } = calcularStockRestado(itemsParaCalculo as any);

            const updateData: any = {
                items: items,
                total: totalVentaCalculado,
                pollos_restados: pollosRestados,
                gaseosas_restadas: gaseosasRestadas,
                chicha_restada: chichaRestada,
                bebidas_detalle: bebidasDetalle,
                metodo_pago: metodoPago
            };

            if (metodoPago === 'mixto') {
                updateData.pago_dividido = splitPago;
            } else {
                updateData.pago_dividido = null;
            }

            const { error } = await supabase
                .from('ventas')
                .update(updateData)
                .eq('id', venta.id);

            if (error) throw error;

            toast.success('Venta actualizada correctamente');
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating sale:', error);
            toast.error('Error al actualizar la venta');
        } finally {
            setLoading(false);
        }
    };

    // Eliminar la venta completa de la base de datos
    const handleDeleteVenta = async () => {
        if (!venta) return;
        if (!confirm(`¿Está seguro de eliminar esta venta por completo? (Monto: S/ ${venta.total.toFixed(2)}). Esta acción no se puede deshacer.`)) {
            return;
        }

        setDeleting(true);
        try {
            const { error } = await supabase
                .from('ventas')
                .delete()
                .eq('id', venta.id);

            if (error) throw error;

            toast.success('Venta eliminada correctamente');
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Error deleting sale:', error);
            toast.error('Error al eliminar la venta: ' + error.message);
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen || !venta) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-none shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
                >
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-rodrigo-mustard"></div>
                            <div>
                                <h3 className="font-black text-base uppercase italic tracking-wider flex items-center gap-2">
                                    <Calculator size={18} className="text-rodrigo-mustard" />
                                    Editar Venta #{String(venta.id).split('-')[0].toUpperCase()}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {venta.mesas?.numero ? `Mesa ${venta.mesas.numero}` : (venta.tipo_pedido === 'delivery' ? 'Delivery' : 'Para Llevar')}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-none transition-colors text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-slate-100 bg-slate-50">
                        <button
                            onClick={() => setActiveTab('pago')}
                            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all border-b-2 ${
                                activeTab === 'pago'
                                    ? 'border-slate-900 bg-white text-slate-900 shadow-sm'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <CreditCard size={15} /> Método de Pago
                        </button>
                        <button
                            onClick={() => setActiveTab('productos')}
                            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider italic flex items-center justify-center gap-2 transition-all border-b-2 ${
                                activeTab === 'productos'
                                    ? 'border-slate-900 bg-white text-slate-900 shadow-sm'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <ShoppingBag size={15} /> Editar Productos ({items.length})
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6">
                        {/* Total Display Header */}
                        <div className="mb-6 bg-slate-50 p-4 border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Venta</p>
                                <p className="text-3xl font-black text-slate-900 italic tracking-tight">
                                    S/ {totalVentaCalculado.toFixed(2)}
                                </p>
                            </div>
                            {items.length !== (venta.items?.length || 0) || totalVentaCalculado !== venta.total ? (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase tracking-widest italic">
                                    Modificado
                                </span>
                            ) : null}
                        </div>

                        {/* TAB 1: METODO DE PAGO */}
                        {activeTab === 'pago' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                                        Selecciona Método de Pago
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['efectivo', 'yape', 'plin', 'tarjeta', 'mixto'] as MetodoPago[]).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setMetodoPago(m)}
                                                className={`px-3 py-3 font-black text-xs uppercase tracking-wider border-2 transition-all italic ${
                                                    metodoPago === m
                                                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                                        : 'border-slate-100 bg-white hover:border-slate-300 text-slate-600'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {metodoPago === 'mixto' && (
                                    <div className="bg-slate-50 p-4 border border-slate-200 space-y-3 mt-4">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Desglose de Pago Mixto</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.keys(splitPago).map((key) => (
                                                <div key={key}>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">{key}</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">S/</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={splitPago[key as keyof typeof splitPago] || ''}
                                                            onChange={(e) => handleSplitChange(key as keyof typeof splitPago, e.target.value)}
                                                            className="w-full pl-8 pr-3 py-2 text-xs font-bold border border-slate-200 focus:border-slate-900 outline-none"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`mt-3 p-2.5 text-center text-xs font-black uppercase tracking-wider ${Math.abs(montoFaltante) < 0.1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            {Math.abs(montoFaltante) < 0.1 ? '✓ Cuadre Perfecto' : `Faltan: S/ ${montoFaltante.toFixed(2)}`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: EDITAR PRODUCTOS DE LA VENTA */}
                        {activeTab === 'productos' && (
                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Elimina o modifica la cantidad de los platos vendidos:
                                </p>
                                {items.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200">
                                        <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
                                        <p className="text-xs font-black text-slate-600 uppercase">Sin productos</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1">Has quitado todos los productos de este pedido.</p>
                                    </div>
                                ) : (
                                    items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 group hover:border-slate-400 transition-colors">
                                            <div className="flex-1 pr-3">
                                                <p className="text-xs font-black text-slate-900 uppercase italic leading-tight">{item.nombre}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                    S/ {item.precio.toFixed(2)} c/u &bull; Subtotal: <span className="text-slate-900 font-black">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                                                </p>
                                                {(item.notas || item.detalles?.notas) && (
                                                    <p className="text-[9px] font-bold text-amber-600 mt-0.5">Nota: {item.notas || item.detalles?.notas}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center border border-slate-300 bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateCantidad(idx, -1)}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
                                                    >
                                                        <Minus size={13} />
                                                    </button>
                                                    <span className="w-7 text-center text-xs font-black text-slate-900">{item.cantidad}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateCantidad(idx, 1)}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200 bg-white"
                                                    title="Eliminar este plato del pedido"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Actions Footer */}
                        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors italic"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading || deleting}
                                    className="flex-1 px-4 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-slate-200 disabled:opacity-50 flex justify-center items-center gap-2 italic"
                                >
                                    {loading ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
                                </button>
                            </div>

                            {/* Option to Delete Entire Sale */}
                            <button
                                type="button"
                                onClick={handleDeleteVenta}
                                disabled={deleting || loading}
                                className="w-full py-2 text-[10px] font-black text-red-500 hover:text-red-700 hover:bg-red-50 border border-dashed border-red-200 uppercase tracking-widest transition-all italic flex items-center justify-center gap-1.5"
                            >
                                <Trash2 size={13} /> Anular / Eliminar Venta Completa
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
