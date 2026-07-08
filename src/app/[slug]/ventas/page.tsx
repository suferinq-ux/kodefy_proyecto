'use client';

import { useState, useEffect } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import type { Venta, Mesa, ItemCarrito, ItemVenta, Producto } from '@/lib/database.types';
import { Users, DollarSign, Clock, ShoppingBag, Trash2, AlertTriangle, Printer, ChevronRight, CreditCard, Navigation, Edit3, X, Plus, Minus, Save, Search, Loader2, Wifi, WifiOff } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ReceiptModal from '@/components/ReceiptModal';
import SplitPaymentModal from '@/components/SplitPaymentModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { isReadOnly } from '@/lib/roles';
import { supabase as supabaseClient } from '@/lib/supabase';

interface MesaConVenta extends Mesa {
    venta?: Venta;
}

export default function MesasActivasPage() {
    return (
        <ProtectedRoute>
            <MesasActivasContent />
        </ProtectedRoute>
    );
}

function MesasActivasContent() {
    const { user } = useAuth();
    const [mesasActivas, setMesasActivas] = useState<MesaConVenta[]>([]);
    const [ventasParaLlevar, setVentasParaLlevar] = useState<Venta[]>([]);
    const [ventasDelivery, setVentasDelivery] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<{
        items: (ItemCarrito | ItemVenta)[];
        total: number;
        orderId: string;
        mesaNumero?: number;
        title?: string;
        isNewSale?: boolean;
        costoEnvio?: number;
        metodoPago?: string;
        pagoDividido?: { efectivo?: number; yape?: number; plin?: number; tarjeta?: number };
    } | null>(null);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelData, setCancelData] = useState<{ ventaId: string; mesaId: number | null; label: string } | null>(null);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payModalData, setPayModalData] = useState<{
        ventaId: string;
        mesaId: number | null;
        mesaNumero?: number;
        items: ItemVenta[];
        total: number;
    } | null>(null);

    // --- Estado para edición de pedidos delivery ---
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
    const [editedItems, setEditedItems] = useState<ItemVenta[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadProductos = async () => {
            const { data } = await supabaseClient.from('productos').select('*').eq('activo', true).order('nombre');
            setProductos(data || []);
        };
        loadProductos();
    }, []);

    const abrirModalCobro = (ventaId: string, mesaId: number | null, mesaNumero: number | undefined, items: ItemVenta[], total: number) => {
        setPayModalData({ ventaId, mesaId, mesaNumero, items, total });
        setShowPayModal(true);
    };

    useEffect(() => {
        cargarPedidosPendientes();

        const channel = supabase
            .channel('mesas-ventas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
                cargarPedidosPendientes();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => {
                cargarPedidosPendientes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const cargarPedidosPendientes = async () => {
        try {
            setLoading(true);
            const hoy = obtenerFechaHoy();

            const { data: ventasPendientes, error: ventasError } = await supabase
                .from('ventas')
                .select(`
                    *,
                    mesas:mesa_id (
                        id,
                        numero
                    )
                `)
                .eq('estado_pago', 'pendiente')
                .eq('fecha', hoy)
                .order('created_at', { ascending: false });

            if (ventasError) throw ventasError;

            const paraLlevar: Venta[] = [];
            const delivery: Venta[] = [];
            const mesasConVentas: MesaConVenta[] = [];

            (ventasPendientes || []).forEach(venta => {
                if (!venta.mesa_id) {
                    if (venta.tipo_pedido === 'delivery') {
                        delivery.push(venta);
                    } else {
                        paraLlevar.push(venta);
                    }
                } else {
                    mesasConVentas.push({
                        id: venta.mesa_id!,
                        numero: venta.mesas?.numero || 0,
                        estado: 'ocupada',
                        created_at: venta.created_at,
                        venta: venta
                    } as MesaConVenta);
                }
            });

            setVentasParaLlevar(paraLlevar);
            setVentasDelivery(delivery);
            setMesasActivas(mesasConVentas);
        } catch (error) {
            console.error('Error al cargar pedidos pendientes:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintPreCuenta = (widthMesa: boolean, items: (ItemCarrito | ItemVenta)[], total: number, orderId: string, mesaNumero?: number, costoEnvio?: number) => {
        setReceiptData({
            items,
            total,
            orderId,
            mesaNumero,
            title: 'ESTADO DE CUENTA',
            costoEnvio
        });
        setShowReceipt(true);
    };

    const marcarComoPagado = async (
        metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto',
        pagoDividido?: { efectivo?: number; yape?: number; plin?: number; tarjeta?: number }
    ) => {
        if (!payModalData) return;
        const { ventaId, mesaId, mesaNumero, items, total } = payModalData;

        try {
            const updateData: any = {
                estado_pago: 'pagado',
                metodo_pago: metodoPago
            };
            if (pagoDividido) {
                updateData.pago_dividido = pagoDividido;
            }

            const { error } = await supabase
                .from('ventas')
                .update(updateData)
                .eq('id', ventaId);

            if (error) throw error;

            if (mesaId) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', mesaId);
            }

            setShowPayModal(false);
            setPayModalData(null);

            setReceiptData({
                items,
                total,
                orderId: ventaId,
                mesaNumero: mesaNumero,
                isNewSale: true,
                metodoPago,
                pagoDividido
            });

            setShowReceipt(true);

            if (metodoPago === 'mixto' && pagoDividido) {
                const desglose = Object.entries(pagoDividido)
                    .filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${k}: S/${v?.toFixed(2)}`)
                    .join(' + ');
                toast.success(`Pago mixto: ${desglose}`, { icon: '💰', duration: 4000 });
            } else {
                toast.success(`Pago registrado (${metodoPago.toUpperCase()})`, { icon: '💰', duration: 3000 });
            }

            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al marcar como pagado:', error);
            toast.error('Error al procesar el pago');
        }
    };

    const handleCancelClick = (ventaId: string, mesaId: number | null, label: string) => {
        setCancelData({ ventaId, mesaId, label });
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!cancelData) return;
        try {
            const { error } = await supabase
                .from('ventas')
                .delete()
                .eq('id', cancelData.ventaId);

            if (error) throw error;

            if (cancelData.mesaId) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', cancelData.mesaId);
            }

            toast.success('Pedido eliminado — stock restaurado', { icon: '🗑️' });
            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al cancelar:', error);
            toast.error('Error al eliminar el pedido');
        } finally {
            setShowCancelModal(false);
            setCancelData(null);
        }
    };

    const totalPedidos = mesasActivas.length + ventasParaLlevar.length + ventasDelivery.length;

    // --- Funciones de edición de pedidos ---
    const handleEditClick = (venta: Venta) => {
        setEditingVenta(venta);
        setEditedItems([...venta.items]);
        setShowEditModal(true);
        setShowProductSearch(false);
        setSearchTerm('');
    };

    const updateItemQty = (index: number, delta: number) => {
        setEditedItems(prev => {
            const items = [...prev];
            const newQty = items[index].cantidad + delta;
            if (newQty <= 0) { items.splice(index, 1); } else { items[index] = { ...items[index], cantidad: newQty }; }
            return items;
        });
    };

    const addProductToEdit = (producto: Producto) => {
        const existing = editedItems.findIndex(i => i.producto_id === producto.id);
        if (existing >= 0) {
            updateItemQty(existing, 1);
        } else {
            setEditedItems(prev => [...prev, {
                producto_id: producto.id, nombre: producto.nombre, cantidad: 1,
                precio: producto.precio, fraccion_pollo: producto.fraccion_pollo
            }]);
        }
        setShowProductSearch(false);
        setSearchTerm('');
        toast.success(`${producto.nombre} agregado`);
    };

    const saveEditedVenta = async () => {
        if (!editingVenta || editedItems.length === 0) { toast.error('El pedido debe tener al menos un item'); return; }
        setIsSaving(true);
        try {
            const nuevoTotal = editedItems.reduce((s, i) => s + i.precio * i.cantidad, 0) + (editingVenta.costo_envio || 0);
            const pollosRestados = editedItems.reduce((s, i) => s + (i.fraccion_pollo || 0) * i.cantidad, 0);
            const { error } = await supabaseClient.from('ventas').update({ items: editedItems, total: nuevoTotal, pollos_restados: pollosRestados }).eq('id', editingVenta.id);
            if (error) throw error;
            toast.success('Pedido actualizado');
            setShowEditModal(false);
            setEditingVenta(null);
            cargarPedidosPendientes();
        } catch { toast.error('Error al actualizar'); }
        finally { setIsSaving(false); }
    };

    const filteredProducts = productos.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic"
                        >
                            Caja y Cobros
                        </motion.h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center gap-2 italic">
                            <span className="w-2 h-2 rounded-none bg-theme-primary animate-pulse"></span>
                            {totalPedidos} Comprobantes Pendientes
                        </p>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-100 border-t-rodrigo-mustard rounded-none animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-rodrigo-mustard font-black text-xl animate-pulse">S/</span>
                            </div>
                        </div>
                        <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Sincronizando caja...</p>
                    </div>
                ) : totalPedidos === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-32 bg-white rounded-none border-2 border-dashed border-slate-100 shadow-sm"
                    >
                        <div className="w-24 h-24 bg-slate-50 rounded-none flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                            <Users size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">¡Caja al día!</h3>
                        <p className="text-slate-400 text-xs max-w-[250px] mx-auto font-bold uppercase tracking-widest">No hay cuentas pendientes por cobrar en este momento.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-10">
                        {ventasParaLlevar.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-none bg-amber-100 flex items-center justify-center">
                                        <ShoppingBag size={16} className="text-amber-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Para Llevar</h2>
                                    <span className="text-xs font-bold text-slate-400">({ventasParaLlevar.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <AnimatePresence mode="popLayout">
                                        {ventasParaLlevar.map((venta, idx) => (
                                            <VentaCard
                                                key={venta.id}
                                                venta={venta}
                                                label="LLEVAR"
                                                idx={idx}
                                                onPay={() => abrirModalCobro(venta.id, null, undefined, venta.items, venta.total)}
                                                onPrint={() => handlePrintPreCuenta(false, venta.items, venta.total, venta.id)}
                                                onCancel={() => handleCancelClick(venta.id, null, 'Para Llevar')}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}

                        {ventasDelivery.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-none bg-indigo-100 flex items-center justify-center">
                                        <Navigation size={16} className="text-indigo-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Delivery</h2>
                                    <span className="text-xs font-bold text-slate-400">({ventasDelivery.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <AnimatePresence mode="popLayout">
                                        {ventasDelivery.map((venta, idx) => (
                                            <VentaCard
                                                key={venta.id}
                                                venta={venta}
                                                label="DELIVERY"
                                                idx={idx}
                                                onPay={() => abrirModalCobro(venta.id, null, undefined, venta.items, venta.total)}
                                                onPrint={() => handlePrintPreCuenta(false, venta.items, venta.total, venta.id)}
                                                onCancel={() => handleCancelClick(venta.id, null, 'Delivery')}
                                                onEdit={() => handleEditClick(venta)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}

                        {mesasActivas.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-none bg-sky-100 flex items-center justify-center">
                                        <Users size={16} className="text-sky-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mesas</h2>
                                    <span className="text-xs font-bold text-slate-400">({mesasActivas.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <AnimatePresence mode="popLayout">
                                        {mesasActivas.map((mesa, idx) => (
                                            <VentaCard
                                                key={mesa.id}
                                                venta={mesa.venta!}
                                                label={`MESA ${mesa.numero}`}
                                                idx={idx}
                                                onPay={() => abrirModalCobro(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total)}
                                                onPrint={() => handlePrintPreCuenta(true, mesa.venta!.items, mesa.venta!.total, mesa.venta!.id, mesa.numero, mesa.venta!.costo_envio)}
                                                onCancel={() => handleCancelClick(mesa.venta!.id, mesa.id, `Mesa ${mesa.numero}`)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Modals */}
                <AnimatePresence>
                    {payModalData && (
                        <SplitPaymentModal
                            isOpen={showPayModal}
                            onClose={() => { setShowPayModal(false); setPayModalData(null); }}
                            total={payModalData.total}
                            onConfirm={marcarComoPagado}
                        />
                    )}
                </AnimatePresence>

                {receiptData && (
                    <ReceiptModal
                        isOpen={showReceipt}
                        onClose={() => setShowReceipt(false)}
                        items={receiptData.items}
                        total={receiptData.total}
                        orderId={receiptData.orderId}
                        mesaNumero={receiptData.mesaNumero}
                        title={receiptData.title}
                        isNewSale={receiptData.isNewSale}
                        costoEnvio={receiptData.costoEnvio}
                        metodoPago={receiptData.metodoPago}
                        pagoDividido={receiptData.pagoDividido}
                    />
                )}

                <AnimatePresence>
                    {showCancelModal && cancelData && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-white border border-slate-100 rounded-none p-8 w-full max-w-sm text-center shadow-2xl"
                            >
                                <div className="w-16 h-16 bg-red-50 rounded-none flex items-center justify-center mx-auto mb-6 border border-red-100">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase italic">Eliminar Pedido</h3>
                                <p className="text-slate-400 text-sm mb-8 font-bold uppercase tracking-widest italic">¿Está seguro de eliminar el pedido de <span className="text-slate-900">{cancelData.label}</span>? El stock será restaurado.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowCancelModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 font-black rounded-none hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest italic">Atrás</button>
                                    <button onClick={confirmCancel} className="flex-1 py-4 bg-rodrigo-terracotta text-white font-black rounded-none shadow-lg hover:brightness-110 active:scale-95 transition-all uppercase text-[10px] tracking-widest italic">Eliminar</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de Edición de Pedido */}
            <AnimatePresence>
                {showEditModal && editingVenta && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-none w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
                        >
                            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-none flex items-center justify-center">
                                        <Edit3 size={20} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Editar Pedido</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {editingVenta.tipo_pedido === 'delivery' ? `Delivery - ${editingVenta.direccion_envio || ''}` : 'Para Llevar'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="w-10 h-10 bg-white border border-slate-100 rounded-none flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {!showProductSearch ? (
                                    <button onClick={() => setShowProductSearch(true)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-none text-slate-400 hover:border-rodrigo-terracotta/30 hover:text-rodrigo-terracotta transition-all flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                        <Plus size={16} /> Agregar Producto
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <input type="text" placeholder="BUSCAR PRODUCTO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-none text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-rodrigo-terracotta/30" />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {filteredProducts.slice(0, 12).map(p => (
                                                <button key={p.id} onClick={() => addProductToEdit(p)}
                                                    className="w-full p-3 bg-slate-50 hover:bg-white hover:shadow-sm rounded-none flex justify-between items-center transition-all text-left">
                                                    <span className="font-bold text-[11px] text-slate-900 uppercase italic">{p.nombre}</span>
                                                    <span className="text-[11px] text-slate-400 font-bold">S/ {p.precio.toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => { setShowProductSearch(false); setSearchTerm(''); }} className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900">Cancelar</button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {editedItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-none">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 uppercase italic whitespace-normal">{item.nombre}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">S/ {item.precio.toFixed(2)} c/u</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => updateItemQty(index, -1)} className="w-7 h-7 bg-white border border-slate-200 rounded-none flex items-center justify-center text-slate-400 hover:text-red-500">
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-7 text-center font-black text-sm">{item.cantidad}</span>
                                                <button onClick={() => updateItemQty(index, 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-none flex items-center justify-center text-slate-400 hover:text-rodrigo-terracotta">
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <span className="text-sm font-black text-slate-900 w-16 text-right">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/80">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Actualizado</span>
                                    <span className="text-2xl font-black text-slate-900 italic">S/ {(editedItems.reduce((s, i) => s + i.precio * i.cantidad, 0) + (editingVenta.costo_envio || 0)).toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setShowEditModal(false)} className="py-3 rounded-none font-black text-[10px] text-slate-400 bg-white border border-slate-200 uppercase tracking-widest">Descartar</button>
                                    <button onClick={saveEditedVenta} disabled={isSaving}
                                        className="py-3 rounded-none font-black text-[10px] text-white bg-slate-900 shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function VentaCard({ venta, label, idx, onPay, onPrint, onCancel, onEdit }: { venta: Venta, label: string, idx: number, onPay: () => void, onPrint: () => void, onCancel: () => void, onEdit?: () => void }) {
    const { user } = useAuth();
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="bg-white rounded-none border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
        >
            <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-none text-[10px] font-black uppercase tracking-wider ${label.includes('MESA') ? 'bg-sky-100 text-sky-600' : label === 'DELIVERY' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                    {label}
                </span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {/* Estado de Impresión */}
                <div className="flex items-center gap-1.5 ml-auto">
                    {venta.estado_impresion === 'pendiente' && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                            <WifiOff size={10} /> Esperando Worker
                        </div>
                    )}
                    {venta.estado_impresion === 'impreso' && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                            <Wifi size={10} /> Impreso
                        </div>
                    )}
                    {venta.estado_impresion === 'error' && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase tracking-widest">
                            <AlertTriangle size={10} /> Error de Impresión
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-end mb-4">
                <div>
                     {venta.tipo_pedido === 'delivery' && (venta.costo_envio || 0) > 0 && (
                        <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-none inline-block mb-1">
                            FLETE: S/ {(venta.costo_envio || 0).toFixed(2)}
                        </p>
                     )}
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">S/{(venta.total || 0).toFixed(2)}</p>
                </div>
                {venta.estado_pago === 'pagado' && (
                    <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pagado con</span>
                        {venta.metodo_pago === 'mixto' && venta.pago_dividido ? (
                            <div className="flex gap-1 justify-end flex-wrap">
                                {Object.entries(venta.pago_dividido).map(([metodo, monto]) => monto ? (
                                    <span key={metodo} className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-none border border-slate-200">
                                        {metodo} S/ {monto.toFixed(2)}
                                    </span>
                                ) : null)}
                            </div>
                        ) : (
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-none border ${
                                venta.metodo_pago === 'efectivo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                venta.metodo_pago === 'yape' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                venta.metodo_pago === 'plin' ? 'bg-cyan-50 text-cyan-600 border-cyan-200' :
                                'bg-blue-50 text-blue-600 border-blue-200'
                            }`}>
                                {venta.metodo_pago || 'EFECTIVO'}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2 bg-slate-50/50 p-2 rounded-none border border-slate-50">
                {venta.items.map((item, id) => (
                    <div key={id} className="flex items-center gap-3 text-sm border-b border-slate-100/50 last:border-0 pb-1.5 last:pb-0">
                        <span className="w-7 h-7 flex items-center justify-center rounded-none bg-white shadow-sm border border-slate-100 text-[12px] font-black text-slate-900">{item.cantidad}</span>
                        <div className="flex-1 min-w-0">
                            <span className="text-slate-900 font-bold block italic uppercase tracking-tight">{item.nombre}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {item.detalles?.parte && (
                                    <span className="text-[10px] bg-rodrigo-terracotta text-white px-2 py-0.5 rounded-none font-black uppercase shadow-sm">
                                        {item.detalles.parte}
                                    </span>
                                )}
                                {item.detalles?.trozado && item.detalles.trozado !== 'entero' && (
                                    <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-none font-black uppercase">
                                        {item.detalles.trozado}
                                    </span>
                                )}
                            </div>
                            {item.detalles?.notas && (
                                <span className="text-[11px] text-slate-500 font-bold uppercase italic block mt-2 p-2 bg-slate-50 rounded-none border border-slate-100 uppercase">
                                    <span className="text-[9px] text-slate-400 not-italic font-black block mb-0.5">NOTA:</span>
                                    {item.detalles.notas}
                                </span>
                            )}
                        </div>
                        <span className="text-slate-500 font-black text-xs whitespace-nowrap">S/{(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-3">
                {(user?.rol === 'admin' || user?.rol === 'cajero') && !isReadOnly(user?.rol) && (
                    <button onClick={onPay} className="flex-1 py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-none hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                        <CreditCard size={14} /> COBRAR
                    </button>
                )}
                <button onClick={onPrint} className={`py-4 px-4 bg-white border-2 border-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest rounded-none hover:bg-slate-50 transition-all shadow-sm ${user?.rol === 'mozo' ? 'flex-1' : ''}`}>
                    <Printer size={16} /> {(user?.rol === 'mozo' || !onPay) && ' IMPRIMIR'}
                </button>
                {onEdit && !isReadOnly(user?.rol) && (
                    <button onClick={onEdit} className="py-4 px-4 bg-white border-2 border-slate-100 text-blue-500 font-black text-[11px] uppercase tracking-widest rounded-none hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm">
                        <Edit3 size={16} />
                    </button>
                )}
                {(user?.rol === 'admin' || user?.rol === 'cajero') && !isReadOnly(user?.rol) && (
                    <button onClick={onCancel} className="py-4 px-4 bg-white border-2 border-slate-100 text-red-500 font-black text-[11px] uppercase tracking-widest rounded-none hover:bg-red-50 hover:border-red-100 transition-all shadow-sm">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
