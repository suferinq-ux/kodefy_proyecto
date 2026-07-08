'use client';

import { useState, useEffect } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import { Venta, ItemVenta, Producto } from '@/lib/database.types';
import PedidoCard from '@/components/PedidoCard';
import KitchenTicketModal from '@/components/KitchenTicketModal';
import { ChefHat, Loader2, RefreshCw, X, Save, Trash2, Plus, Minus, AlertTriangle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CocinaPage() {
    return (
        <ProtectedRoute>
            <CocinaContent />
        </ProtectedRoute>
    );
}

function CocinaContent() {
    const [pedidos, setPedidos] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<Venta | null>(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPedido, setEditingPedido] = useState<Venta | null>(null);
    const [editedItems, setEditedItems] = useState<ItemVenta[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [productos, setProductos] = useState<Producto[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newProductNotes, setNewProductNotes] = useState('');

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const cargarPedidos = async () => {
        try {
            const hoy = obtenerFechaHoy();

            const { data, error } = await supabase
                .from('ventas')
                .select(`
                    *,
                    mesas:mesa_id (
                        numero
                    )
                `)
                .eq('estado_pedido', 'pendiente')
                .eq('fecha', hoy)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPedidos(data || []);
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('activo', true)
                .order('nombre');

            if (error) throw error;
            setProductos(data || []);
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    };

    useEffect(() => {
        cargarPedidos();
        cargarProductos();
        const interval = setInterval(cargarPedidos, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleComplete = async (id: string) => {
        try {
            setPedidos(prev => prev.filter(p => p.id !== id));
            toast.success('Pedido completado', { icon: '✓' });

            const { error } = await supabase
                .from('ventas')
                .update({ estado_pedido: 'listo' })
                .eq('id', id);

            if (error) {
                toast.error('Error al actualizar');
                cargarPedidos();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handlePrint = (venta: Venta) => {
        setSelectedPedido(venta);
        setShowTicketModal(true);
    };

    const handleCancelClick = (id: string) => {
        setCancellingId(id);
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!cancellingId) return;
        try {
            const { data: pedido } = await supabase
                .from('ventas')
                .select('estado_pago, mesa_id')
                .eq('id', cancellingId)
                .single();

            if (pedido?.estado_pago === 'pagado') {
                toast.error('No se puede eliminar un pedido ya pagado');
                setShowCancelModal(false);
                setCancellingId(null);
                return;
            }

            const { error } = await supabase
                .from('ventas')
                .delete()
                .eq('id', cancellingId);

            if (error) throw error;

            // Liberar la mesa si tenía una asignada
            if (pedido?.mesa_id) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', pedido.mesa_id);
            }

            setPedidos(prev => prev.filter(p => p.id !== cancellingId));
            toast.success('Pedido cancelado — stock restaurado', { icon: '🗑️' });
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cancelar');
        } finally {
            setShowCancelModal(false);
            setCancellingId(null);
        }
    };

    const handleEditClick = (venta: Venta) => {
        setEditingPedido(venta);
        setEditedItems([...venta.items]);
        setShowEditModal(true);
        setShowProductSearch(false);
        setSearchTerm('');
    };

    const updateItemQuantity = (index: number, delta: number) => {
        setEditedItems(prev => {
            const newItems = [...prev];
            const newQuantity = newItems[index].cantidad + delta;
            if (newQuantity <= 0) {
                newItems.splice(index, 1);
            } else {
                newItems[index] = { ...newItems[index], cantidad: newQuantity };
            }
            return newItems;
        });
    };

    const removeItem = (index: number) => {
        setEditedItems(prev => prev.filter((_, i) => i !== index));
    };

    const selectProductToAdd = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewProductNotes('');
        setShowProductSearch(false);
    };

    const confirmAddProduct = () => {
        if (!selectedProduct) return;
        const existingIndex = editedItems.findIndex(item => item.producto_id === selectedProduct.id);
        if (existingIndex >= 0 && !newProductNotes) {
            updateItemQuantity(existingIndex, 1);
        } else {
            const newItem: any = {
                producto_id: selectedProduct.id,
                nombre: selectedProduct.nombre,
                cantidad: 1,
                precio: selectedProduct.precio,
                fraccion_pollo: selectedProduct.fraccion_pollo
            };
            if (newProductNotes.trim()) {
                newItem.detalles = { notas: newProductNotes.trim() };
            }
            setEditedItems(prev => [...prev, newItem]);
        }
        setSelectedProduct(null);
        setNewProductNotes('');
        setSearchTerm('');
        toast.success(`${selectedProduct.nombre} agregado`);
    };

    const cancelAddProduct = () => {
        setSelectedProduct(null);
        setNewProductNotes('');
    };

    const filteredProducts = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const saveEditedPedido = async () => {
        if (!editingPedido || editedItems.length === 0) {
            toast.error('El pedido debe tener al menos un item');
            return;
        }
        setIsSaving(true);
        try {
            const nuevoTotal = editedItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            const nuevosPollosRestados = editedItems.reduce((sum, item) => {
                return sum + ((item.fraccion_pollo || 0) * item.cantidad);
            }, 0);

            const { error } = await supabase
                .from('ventas')
                .update({
                    items: editedItems,
                    total: nuevoTotal,
                    pollos_restados: nuevosPollosRestados
                })
                .eq('id', editingPedido.id);

            if (error) throw error;
            toast.success('Pedido actualizado');
            setShowEditModal(false);
            setEditingPedido(null);
            cargarPedidos();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al actualizar');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {/* ESTILOS DE EMERGENCIA PARA IMPRESIÓN */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    #ticket-print-container { 
                        display: block !important; 
                        visibility: visible !important; 
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                    }
                    /* Forzar que el modal de ticket sea lo único visible */
                    div[role="dialog"] { 
                        position: static !important;
                        background: white !important;
                        box-shadow: none !important;
                    }
                }
            ` }} />

            <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-10 pb-32 md:pb-8 print:hidden">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                    {/* Premium Header */}
                    <header className="relative p-6 bg-white border border-slate-100 rounded-none overflow-hidden group shadow-sm">
                        <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-rodrigo-mustard rounded-none shadow-sm group-hover:scale-110 transition-transform duration-500">
                                    <ChefHat className="text-slate-900" size={32} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Cocina</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 px-3 py-0.5 bg-rodrigo-terracotta/10 border border-rodrigo-terracotta/20 rounded-none">
                                            <span className="w-2 h-2 rounded-none bg-rodrigo-terracotta animate-pulse"></span>
                                            <span className="text-[10px] font-black text-rodrigo-terracotta uppercase tracking-widest leading-none">
                                                {pedidos.length} Pedido{pedidos.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={cargarPedidos}
                                className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-none transition-all hover:rotate-180 duration-700 shadow-sm"
                                title="Actualizar"
                            >
                                <RefreshCw size={24} className={loading ? 'animate-spin text-slate-400' : 'text-slate-400'} />
                            </button>
                        </div>
                    </header>

                    {loading && pedidos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-rodrigo-terracotta/5 blur-3xl rounded-none scale-150"></div>
                                <Loader2 className="animate-spin text-rodrigo-terracotta relative z-10" size={60} />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm italic">Sincronizando Órdenes...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <AnimatePresence mode="popLayout">
                                {pedidos.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="col-span-full text-center py-24 bg-white rounded-none border-2 border-dashed border-slate-100 shadow-sm"
                                    >
                                        <div className="w-24 h-24 bg-slate-50 rounded-none flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                            <ChefHat size={48} className="text-slate-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider italic">Sin pedidos pendientes</h3>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">Las nuevas órdenes aparecerán aquí automáticamente.</p>
                                    </motion.div>
                                ) : (
                                    pedidos.map((pedido, index) => (
                                        <PedidoCard
                                            key={pedido.id}
                                            index={index}
                                            venta={pedido}
                                            onComplete={handleComplete}
                                            onPrint={handlePrint}
                                            onEdit={handleEditClick}
                                            onCancel={handleCancelClick}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENEDOR DE TICKET FUERA DE PRINT:HIDDEN */}
            <div id="ticket-print-container">
                <KitchenTicketModal
                    isOpen={showTicketModal}
                    onClose={() => {
                        setShowTicketModal(false);
                        setSelectedPedido(null);
                    }}
                    venta={selectedPedido}
                />
            </div>

            {/* Modales de Interfaz (Edit/Cancel) */}
            <AnimatePresence>
                {showCancelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-none w-full max-w-sm p-8 text-center relative overflow-hidden shadow-2xl border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rodrigo-terracotta/5 blur-3xl -mr-16 -mt-16"></div>

                            <div className="w-20 h-20 bg-red-50 rounded-none flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm">
                                <AlertTriangle size={32} className="text-red-600" />
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic">¿Cancelar Pedido?</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 leading-relaxed">
                                Esta acción eliminará el pedido permanentemente de la lista de producción.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setShowCancelModal(false); setCancellingId(null); }}
                                    className="flex-1 py-4 px-4 rounded-none font-black text-[10px] text-slate-400 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all uppercase tracking-widest"
                                >
                                    No, mantener
                                </button>
                                <button
                                    onClick={confirmCancel}
                                    className="flex-1 py-4 px-4 rounded-none font-black text-[10px] text-white bg-red-600 shadow-lg hover:brightness-110 transition-all uppercase tracking-widest"
                                >
                                    Sí, cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showEditModal && editingPedido && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="bg-white border border-slate-100 rounded-none w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-slate-50 p-8 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-none flex items-center justify-center border border-slate-100 shadow-sm">
                                            <Save size={24} className="text-rodrigo-terracotta" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Editar Pedido</h2>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                Mesa {(editingPedido as any).mesas?.numero || editingPedido.mesa_id || 'Mostrador'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowEditModal(false); setEditingPedido(null); setShowProductSearch(false); }}
                                        className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-100 rounded-none text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                                <div className="mb-8">
                                    {!showProductSearch && !selectedProduct && (
                                        <button
                                            onClick={() => setShowProductSearch(true)}
                                            className="w-full py-6 border-2 border-dashed border-slate-100 rounded-none text-slate-300 hover:border-rodrigo-terracotta/30 hover:text-rodrigo-terracotta hover:bg-slate-50 transition-all flex items-center justify-center gap-3 group"
                                        >
                                            <div className="p-2 bg-slate-50 rounded-none group-hover:bg-rodrigo-terracotta/10 transition-colors">
                                                <Plus size={20} />
                                            </div>
                                            <span className="font-black text-[10px] uppercase tracking-[0.2em]">Agregar producto al pedido</span>
                                        </button>
                                    )}

                                    {showProductSearch && !selectedProduct && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4"
                                        >
                                            <div className="relative group">
                                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rodrigo-terracotta transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="BUSCAR PRODUCTO..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-none outline-none text-slate-900 font-black text-xs uppercase tracking-widest focus:border-rodrigo-terracotta/30 focus:bg-white transition-all placeholder:text-slate-200"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {filteredProducts.slice(0, 15).map(producto => (
                                                    <button
                                                        key={producto.id}
                                                        onClick={() => selectProductToAdd(producto)}
                                                        className="w-full p-4 bg-slate-50 border border-slate-50 hover:border-rodrigo-terracotta/20 hover:bg-white hover:shadow-sm rounded-none flex justify-between items-center transition-all group/prod"
                                                    >
                                                        <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest group-hover/prod:text-rodrigo-terracotta transition-colors italic">{producto.nombre}</span>
                                                        <span className="text-slate-400 font-black text-[10px]">S/ {producto.precio.toFixed(2)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => { setShowProductSearch(false); setSearchTerm(''); }}
                                                className="w-full py-3 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                            >
                                                Cancelar búsqueda
                                            </button>
                                        </motion.div>
                                    )}

                                    {selectedProduct && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-4 p-6 bg-slate-50 border border-slate-100 rounded-none"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-black text-slate-900 uppercase tracking-tighter text-lg italic">{selectedProduct.nombre}</span>
                                                <span className="font-black text-rodrigo-terracotta italic">S/ {selectedProduct.precio.toFixed(2)}</span>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="NOTAS ESPECIALES..."
                                                value={newProductNotes}
                                                onChange={(e) => setNewProductNotes(e.target.value)}
                                                className="w-full px-4 py-4 bg-white border border-slate-200 rounded-none outline-none text-slate-900 font-black text-[10px] uppercase tracking-widest focus:border-rodrigo-terracotta/30 transition-all placeholder:text-slate-200 shadow-sm"
                                                autoFocus
                                            />
                                            <div className="flex gap-3">
                                                <button onClick={cancelAddProduct} className="flex-1 py-3 px-4 rounded-none font-black text-[9px] text-slate-400 bg-white border border-slate-100 uppercase tracking-widest shadow-sm">Atrás</button>
                                                <button onClick={confirmAddProduct} className="flex-1 py-3 px-4 rounded-none font-black text-[9px] text-white bg-rodrigo-terracotta uppercase tracking-widest shadow-lg">Confirmar</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] pl-2">Ítems Actuales</p>
                                    <div className="space-y-2">
                                        {editedItems.map((item, index) => (
                                            <motion.div
                                                layout
                                                key={index}
                                                className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-none group/item"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-slate-900 uppercase tracking-wider text-xs whitespace-normal group-hover/item:text-theme-primary transition-colors">{item.nombre}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">S/ {item.precio.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white p-1 rounded-none border border-slate-100 shadow-sm">
                                                    <button
                                                        onClick={() => updateItemQuantity(index, -1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-none bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-10 text-center font-black text-slate-900 text-sm">{item.cantidad}</span>
                                                    <button
                                                        onClick={() => updateItemQuantity(index, 1)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-none bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-none text-slate-300 hover:text-theme-primary hover:bg-theme-primary/10 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/80 p-8 border-t border-slate-100 backdrop-blur-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Actualizado</span>
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter italic">
                                        S/ {editedItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => { setShowEditModal(false); setEditingPedido(null); setShowProductSearch(false); }}
                                        className="py-4 rounded-none font-black text-[10px] text-slate-400 bg-white border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest shadow-sm"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        onClick={saveEditedPedido}
                                        disabled={isSaving}
                                        className="py-4 rounded-none font-black text-[10px] text-white bg-slate-900 shadow-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
