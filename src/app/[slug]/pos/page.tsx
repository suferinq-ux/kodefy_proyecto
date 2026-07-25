'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UtensilsCrossed,
    ShoppingBag,
    Navigation2,
    ArrowRight,
    Search,
    X,
    Plus,
    Minus,
    Trash2,
    ClipboardList,
    RefreshCw,
    Activity,
    MapPin,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Clock,
    User,
    ChevronDown,
    Save,
    Store,
    Printer,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Producto, ItemCarrito, Mesa, Venta } from '@/lib/database.types';
import ProductOptionsModal from '@/components/ProductOptionsModal';
import toast from 'react-hot-toast';
import { useInventario } from '@/hooks/useInventario';
import { useMesas } from '@/hooks/useMesas';
import { useEstadisticasProductos } from '@/hooks/useEstadisticasProductos';
import { registrarVenta, actualizarVenta } from '@/lib/ventas';
import ReceiptModal from '@/components/ReceiptModal';
import { useAuth } from '@/contexts/AuthContext';
import { isReadOnly } from '@/lib/roles';
import dynamic from 'next/dynamic';
const DeliverySelector = dynamic(() => import('@/components/DeliverySelector'), {
    ssr: false,
});

export default function POSPage() {
    return (
        <ProtectedRoute>
            <POSContent />
        </ProtectedRoute>
    );
}

type Categoria = 'todos' | 'populares' | 'pollos' | 'combos' | 'promociones' | 'bebidas' | 'complementos' | 'especiales' | 'extras';

function POSContent() {
    const { user } = useAuth();
    const [view, setView] = useState<'start' | 'mesas' | 'pedido'>('start');
    const [filtroPisoPOS, setFiltroPisoPOS] = useState<number>(0);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const { stock, refetch } = useInventario();

    // Hook para estadísticas de productos más vendidos
    const { topProductos } = useEstadisticasProductos();

    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptTitle, setReceiptTitle] = useState('Comprobante');
    const [lastSaleItems, setLastSaleItems] = useState<ItemCarrito[]>([]);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);

    // Mobile specific
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

    // Table management
    const [selectedTable, setSelectedTable] = useState<Mesa | null>(null);
    const [isParaLlevar, setIsParaLlevar] = useState(false);
    const [isDelivery, setIsDelivery] = useState(false);
    const [deliveryInfo, setDeliveryInfo] = useState<{ 
        address: string; 
        distanceKm: number; 
        cost: number;
        reference?: string;
        phone?: string;
        estimatedTime?: string;
        lat?: number;
        lng?: number;
        geometry?: [number, number][];
    } | null>(null);
    const [showDeliveryMap, setShowDeliveryMap] = useState(false);
    const [showDeliveryRadar, setShowDeliveryRadar] = useState(false);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'yape' | 'plin'>('efectivo');

    const { mesas, loading: loadingMesas, ocuparMesa, cambiarMesa, refetch: refetchMesas } = useMesas();
    const [currentVentaId, setCurrentVentaId] = useState<string | null>(null);
    const [showCambiarMesaModal, setShowCambiarMesaModal] = useState(false);

    // Ventas pendientes (para llevar y delivery)
    const [ventasPendientes, setVentasPendientes] = useState<Venta[]>([]);
    const [tipoVistaPOS, setTipoVistaPOS] = useState<'salon' | 'llevar' | 'delivery'>('salon');

    // Order notes
    const [orderNotes, setOrderNotes] = useState('');

    // Custom item (producto libre)
    const [showCustomItem, setShowCustomItem] = useState(false);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');

    const cargarVentasPendientes = async () => {
        try {
            const negocioId = user?.negocio_id;
            let query = supabase
                .from('ventas')
                .select('*')
                .eq('estado_pago', 'pendiente')
                .eq('fecha', obtenerFechaHoy())
                .is('mesa_id', null)
                .order('created_at', { ascending: false });

            if (negocioId) {
                query = query.eq('negocio_id', negocioId);
            }

            const { data, error } = await query;
            if (!error && data) {
                setVentasPendientes(data);
            }
        } catch (e) {
            console.error('Error al cargar ventas pendientes en POS:', e);
        }
    };

    useEffect(() => {
        cargarVentasPendientes();

        const channel = supabase
            .channel('ventas-pendientes-pos')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ventas' },
                () => {
                    cargarVentasPendientes();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.negocio_id]);

    const handlePendingSaleClick = (venta: Venta) => {
        setSelectedTable(null);
        setCurrentVentaId(venta.id);
        setIsParaLlevar(venta.tipo_pedido === 'llevar');
        setIsDelivery(venta.tipo_pedido === 'delivery');
        setOrderNotes(venta.notas || '');

        if (venta.tipo_pedido === 'delivery' && venta.direccion_envio) {
            setDeliveryInfo({
                address: venta.direccion_envio,
                distanceKm: venta.distancia_km || 0,
                cost: venta.costo_envio || 0,
                reference: venta.referencia_envio || undefined,
                phone: venta.telefono_envio || undefined,
                estimatedTime: venta.tiempo_estimado_envio || undefined,
                lat: venta.latitud_envio || undefined,
                lng: venta.longitud_envio || undefined,
                geometry: venta.geometria_envio || undefined,
            });
        } else {
            setDeliveryInfo(null);
        }

        const itemsPrevios: ItemCarrito[] = (venta.items || []).map((it: any) => ({
            ...it,
            subtotal: it.cantidad * it.precio,
            printed: true
        }));

        setCarrito(itemsPrevios);
        setView('pedido');
        toast.success(`Cargando pedido #${venta.id.slice(0, 6)} (${venta.tipo_pedido === 'delivery' ? 'Delivery' : 'Para Llevar'})`);
    };

    const ventasParaLlevarPendientes = ventasPendientes.filter(v => v.tipo_pedido === 'llevar');
    const ventasDeliveryPendientes = ventasPendientes.filter(v => v.tipo_pedido === 'delivery');

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('activo', true)
                .order('nombre', { ascending: true });

            if (error) throw error;
            setProductos(data || []);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarProductos();

        // Suscripción en tiempo real para actualizar precios al instante
        const channel = supabase
            .channel('productos-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'productos' },
                () => { cargarProductos(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Suscripción a cambios en la venta actual (Prevención de conflictos)
    useEffect(() => {
        if (!currentVentaId) return;

        const channel = supabase
            .channel(`venta-${currentVentaId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ventas', filter: `id=eq.${currentVentaId}` },
                (payload) => {
                    toast((t) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-sm">⚠️ La orden ha sido modificada</span>
                            <span className="text-xs">Alguien más actualizó este pedido.</span>
                            <button
                                onClick={() => {
                                    if (selectedTable) handleTableClick(selectedTable);
                                    toast.dismiss(t.id);
                                }}
                                className="bg-rodrigo-terracotta text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                                🔄 Recargar Datos
                            </button>
                        </div>
                    ), { duration: 10000, position: 'top-right', id: 'update-conflict' });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentVentaId, selectedTable]);

    const handleTableClick = async (mesa: Mesa | null) => {
        if (!mesa) {
            // Pedido para llevar
            setSelectedTable(null);
            setIsParaLlevar(true);
            setIsDelivery(false);
            setDeliveryInfo(null);
            setCurrentVentaId(null);
            setCarrito([]);
            setOrderNotes('');
            setView('pedido');
            return;
        }

        setSelectedTable(mesa);
        setIsParaLlevar(false);
        setIsDelivery(false);
        setDeliveryInfo(null);

        if (mesa.estado === 'ocupada') {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .eq('mesa_id', mesa.id)
                    .eq('estado_pago', 'pendiente')
                    .eq('fecha', obtenerFechaHoy())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && !error) {
                    setCurrentVentaId(data.id);
                    const itemsPrevios: ItemCarrito[] = data.items.map((it: any) => ({
                        ...it,
                        subtotal: it.cantidad * it.precio,
                        printed: true
                    }));
                    setCarrito(itemsPrevios);
                    setOrderNotes(data.notes || '');
                    toast.success(`Cargando pedido actual de Mesa ${mesa.numero}`);
                } else {
                    setCurrentVentaId(null);
                    setCarrito([]);
                }
            } catch (err) {
                console.error('Error al cargar venta de mesa ocupada:', err);
                setCarrito([]);
            } finally {
                setLoading(false);
            }
        } else {
            setCurrentVentaId(null);
            if (view === 'mesas') {
                setCarrito([]);
                setOrderNotes('');
            }
        }
        setView('pedido');
    };

    const handleProductClick = (producto: Producto) => {
        if (isReadOnly(user?.rol)) {
            toast('Modo de solo lectura activado', { icon: '👁️' });
            return;
        }
        setSelectedProduct(producto);
        setIsModalOpen(true);
    };

    const agregarAlCarrito = (producto: Producto, opciones: { parte?: string, trozado?: string, notas: string, detalle_bebida?: { marca: string, tipo: string }, cantidad?: number }) => {
        const itemKey = `${producto.id}-${opciones.parte || ''}-${opciones.notas || ''}`;
        const itemExistenteIndex = carrito.findIndex((item) => {
            const currentItemKey = `${item.producto_id}-${item.detalles?.parte || ''}-${item.detalles?.notas || ''}`;
            return currentItemKey === itemKey;
        });

        if (itemExistenteIndex >= 0 && !carrito[itemExistenteIndex].printed) {
            const nuevoCarrito = [...carrito];
            nuevoCarrito[itemExistenteIndex].cantidad += (opciones.cantidad || 1);
            nuevoCarrito[itemExistenteIndex].subtotal = nuevoCarrito[itemExistenteIndex].cantidad * nuevoCarrito[itemExistenteIndex].precio;
            setCarrito(nuevoCarrito);
        } else {
            let detalleBebida = opciones.detalle_bebida;
            const nuevoItem: ItemCarrito = {
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: opciones.cantidad || 1,
                precio: producto.precio,
                fraccion_pollo: producto.fraccion_pollo,
                subtotal: producto.precio * (opciones.cantidad || 1),
                detalles: { parte: opciones.parte, trozado: opciones.trozado, notas: opciones.notas },
                detalle_bebida: opciones.detalle_bebida as any,
                tipo: producto.tipo
            };
            setCarrito([...carrito, nuevoItem]);
        }
    };

    const modificarCantidad = (index: number, delta: number) => {
        const nuevoCarrito = [...carrito];
        const item = nuevoCarrito[index];
        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad <= 0) {
            eliminarDelCarrito(index);
            return;
        }
        item.cantidad = nuevaCantidad;
        item.subtotal = nuevaCantidad * item.precio;
        setCarrito(nuevoCarrito);
    };

    const eliminarDelCarrito = (index: number) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
    };

    const vaciarCarrito = () => {
        if (isReadOnly(user?.rol)) {
            setView('mesas');
            return;
        }
        setCarrito([]);
        setSelectedTable(null);
        setIsParaLlevar(false);
        setIsDelivery(false);
        setDeliveryInfo(null);
        setView('mesas');
    };

    const calcularSubtotal = () => carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const calcularTotal = () => {
        const subtotal = calcularSubtotal();
        return isDelivery && deliveryInfo ? subtotal + deliveryInfo.cost : subtotal;
    };

    const handleConfirmarPedido = async () => {
        if (isReadOnly(user?.rol)) {
            toast.error('No tienes permisos para registrar pedidos');
            return;
        }
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }
        setProcesando(true);
        try {
            const tipo_pedido = isDelivery ? 'delivery' : (isParaLlevar ? 'llevar' : 'mesa');
            const deliveryData = isDelivery && deliveryInfo ? {
                tipo_pedido: 'delivery' as const,
                costo_envio: deliveryInfo.cost,
                direccion_envio: deliveryInfo.address,
                distancia_km: deliveryInfo.distanceKm,
                metodo_pago: metodoPago,
                referencia_envio: deliveryInfo.reference,
                telefono_envio: deliveryInfo.phone,
                tiempo_estimado_envio: deliveryInfo.estimatedTime,
                latitud_envio: deliveryInfo.lat,
                longitud_envio: deliveryInfo.lng,
                geometria_envio: deliveryInfo.geometry
            } : { tipo_pedido: tipo_pedido as any, metodo_pago: metodoPago };

            let resultado;
            if (currentVentaId) {
                resultado = await actualizarVenta(currentVentaId, carrito, user?.nombre || undefined);
            } else {
                resultado = await registrarVenta(carrito, selectedTable?.id, orderNotes, deliveryData, user?.nombre || undefined, user?.negocio_id || undefined);
                if (resultado.success && selectedTable) {
                    await ocuparMesa(selectedTable.id);
                }
            }

            if (resultado.success) {
                const itemsParaCocina = carrito.filter(item => !item.printed);
                if (itemsParaCocina.length > 0) {
                    try {
                        const { data: config } = await supabase.from('configuracion_negocio').select('ip_impresora_cocina, ip_impresora_caja, modo_impresion, nombre_negocio, telefono').eq('id', 1).single();

                        if (config?.modo_impresion === 'bridge') {
                            console.log('Modo Bridge detectado: El servidor local imprimirá automáticamente.');
                            toast.success('Pedido enviado a cola de impresión 🚀');
                        } else {
                            try {
                                const printServerUrl = `http://localhost:3001`;
                                await fetch(`${printServerUrl}/print-kitchen`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ip: config?.ip_impresora_cocina || '192.168.1.100', mesa: selectedTable ? selectedTable.numero : 'LLEVAR', items: itemsParaCocina, notas: orderNotes })
                                });
                                toast.success('Impresión enviada correctamente 🖨️');
                            } catch (e) {
                                console.warn('Error en print-server legacy:', e);
                            }
                        }

                        const printedKeys = new Set(itemsParaCocina.map(p => `${p.producto_id}||${p.detalles?.parte || ''}||${p.detalles?.notas || ''}`));
                        setCarrito(prev => prev.map(item => {
                            const itemKey = `${item.producto_id}||${item.detalles?.parte || ''}||${item.detalles?.notas || ''}`;
                            if (printedKeys.has(itemKey)) {
                                return { ...item, printed: true };
                            }
                            return item;
                        }));
                    } catch (err) {
                        console.error('Error general de impresión:', err);
                    }
                }
                const audio = new Audio('/kitchen-bell.mp3');
                audio.play().catch(() => { });
                toast.success(resultado.message);
                if (!currentVentaId) {
                    setView('mesas');
                    setCarrito([]);
                    setOrderNotes('');
                }
                refetch();
                refetchMesas();
                cargarVentasPendientes();
            } else {
                toast.error(resultado.message);
            }
        } catch (error) {
            console.error('Error al confirmar pedido:', error);
            toast.error('Ocurrió un error inesperado');
        } finally {
            setProcesando(false);
        }
    };

    const handleEstadoCuenta = () => {
        setLastSaleItems(carrito);
        setLastSaleTotal(calcularTotal());
        setReceiptTitle('ESTADO DE CUENTA');
        setShowReceipt(true);
    };

    const categorias: { id: Categoria; nombre: string; emoji: string }[] = [
        { id: 'todos', nombre: 'Todos', emoji: '🍽️' },
        { id: 'populares', nombre: 'Populares', emoji: '🔥' },
        { id: 'promociones', nombre: 'Promos', emoji: '🎉' },
        { id: 'pollos', nombre: 'Pollos', emoji: '🍗' },
        { id: 'especiales', nombre: 'Especiales', emoji: '⭐' },
        { id: 'extras', nombre: 'Extras', emoji: '🍟' },
        { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤' },
    ];

    const productosFiltrados = productos.filter(producto => {
        const matchSearch = searchTerm === '' ||
            producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchSearch) return false;
        if (categoriaActiva === 'todos') return true;
        if (categoriaActiva === 'populares') {
            const productosPopularesIds = topProductos.map((tp: any) => tp.producto_id);
            return productosPopularesIds.includes(producto.id);
        }
        if (categoriaActiva === 'pollos') return producto.tipo === 'pollo' && producto.fraccion_pollo > 0;
        if (categoriaActiva === 'especiales') {
            const nombresEspeciales = ['mostrito', 'mostrazo', 'chori', 'salchi', 'chaufa', 'anticucho', 'trilogía', 'cuarto'];
            return nombresEspeciales.some(nombre => producto.nombre.toLowerCase().includes(nombre));
        }
        if (categoriaActiva === 'promociones') return producto.tipo === 'promocion';
        if (categoriaActiva === 'extras') return producto.tipo === 'complemento';
        if (categoriaActiva === 'bebidas') return producto.tipo === 'bebida';
        return true;
    });

    // --- VISTAS ---

    if (view === 'start') {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setTipoVistaPOS('salon'); setView('mesas'); }}
                        className="group relative bg-white p-6 md:p-10 rounded-none border-2 border-slate-100 shadow-xl flex flex-row md:flex-col items-center text-left md:text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-none -mr-12 -mt-12 md:-mr-16 md:-mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-none flex items-center justify-center mb-0 md:mb-8 mr-6 md:mr-0 rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500 shrink-0">
                            <UtensilsCrossed size={32} className="md:w-12 md:h-12 text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 md:mb-4">Salón</h2>
                            <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none md:leading-relaxed">Pedidos en mesa</p>
                        </div>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableClick(null)}
                        className="group relative bg-white p-6 md:p-10 rounded-none border-2 border-slate-100 shadow-xl flex flex-row md:flex-col items-center text-left md:text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        {ventasParaLlevarPendientes.length > 0 && (
                            <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md z-20 animate-pulse">
                                🥡 {ventasParaLlevarPendientes.length} Pendiente{ventasParaLlevarPendientes.length > 1 ? 's' : ''}
                            </span>
                        )}
                        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-none -mr-12 -mt-12 md:-mr-16 md:-mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-none flex items-center justify-center mb-0 md:mb-8 mr-6 md:mr-0 -rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500 shrink-0">
                            <ShoppingBag size={32} className="md:w-12 md:h-12 text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 md:mb-4">Llevar</h2>
                            <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none md:leading-relaxed">Recojo en local</p>
                        </div>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setIsDelivery(true);
                            setIsParaLlevar(false);
                            setSelectedTable(null);
                            setCarrito([]);
                            setOrderNotes('');
                            setView('pedido');
                            setShowDeliveryMap(true);
                        }}
                        className="group relative bg-white p-6 md:p-10 rounded-none border-2 border-slate-100 shadow-xl flex flex-row md:flex-col items-center text-left md:text-center transition-all hover:border-rodrigo-mustard/30 hover:shadow-2xl overflow-hidden"
                    >
                        {ventasDeliveryPendientes.length > 0 && (
                            <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md z-20 animate-pulse">
                                🛵 {ventasDeliveryPendientes.length} Pendiente{ventasDeliveryPendientes.length > 1 ? 's' : ''}
                            </span>
                        )}
                        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-none -mr-12 -mt-12 md:-mr-16 md:-mt-16 group-hover:bg-rodrigo-mustard/5 transition-colors duration-500"></div>
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-none flex items-center justify-center mb-0 md:mb-8 mr-6 md:mr-0 rotate-3 shadow-sm border border-slate-100 group-hover:bg-white group-hover:rotate-0 transition-transform duration-500 shrink-0">
                            <Navigation2 size={32} className="md:w-12 md:h-12 text-slate-400 group-hover:text-rodrigo-terracotta transition-colors" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-1 md:mb-4">Delivery</h2>
                            <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none md:leading-relaxed">Envíos a casa</p>
                        </div>
                    </motion.button>
                </div>

                {ventasPendientes.length > 0 && (
                    <div className="mt-12 max-w-5xl w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                                <ClipboardList className="text-amber-500" size={22} />
                                Pedidos Activos sin Mesa ({ventasPendientes.length})
                            </h3>
                            <button
                                onClick={() => { setTipoVistaPOS('llevar'); setView('mesas'); }}
                                className="text-xs font-black uppercase text-amber-600 hover:text-amber-700 underline"
                            >
                                Ver todos en panel ➔
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {ventasPendientes.map((v) => (
                                <motion.div
                                    key={v.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => handlePendingSaleClick(v)}
                                    className="bg-white p-5 rounded-none border-2 border-slate-100 shadow-md hover:border-amber-400 cursor-pointer flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-none ${
                                                v.tipo_pedido === 'delivery' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {v.tipo_pedido === 'delivery' ? '🛵 DELIVERY' : '🥡 LLEVAR'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                                                #{v.id.slice(0, 6)}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-slate-800 line-clamp-2 mb-2">
                                            {(v.items || []).map((it: any) => `${it.cantidad}x ${it.nombre}`).join(', ')}
                                        </p>
                                        {v.notas && <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded mb-2">"{v.notas}"</p>}
                                        {v.direccion_envio && <p className="text-[11px] text-indigo-600 font-bold truncate">📍 {v.direccion_envio}</p>}
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                        <span className="text-base font-black text-slate-900">S/ {v.total.toFixed(2)}</span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-none border border-amber-200">✏️ Ver / Editar</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'mesas') {
        const pisosExistentes = Array.from(new Set(mesas.map(m => m.piso || 1))).sort((a, b) => a - b);
        const mesasFiltradas = mesas.filter(m => filtroPisoPOS === 0 || (m.piso || 1) === filtroPisoPOS);
        const totalLibres = mesasFiltradas.filter(m => m.estado === 'libre').length;
        const totalOcupadas = mesasFiltradas.filter(m => m.estado === 'ocupada').length;

        return (
            <div className="space-y-6 md:space-y-8 pb-32">
                {/* Header con pestañas principal (Salón / Llevar / Delivery) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={() => setView('start')} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-500 shadow-sm hover:bg-slate-50 transition-all">
                            <ArrowRight className="rotate-180" size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                                {tipoVistaPOS === 'salon' ? 'Salón Principal' : tipoVistaPOS === 'llevar' ? 'Pedidos Para Llevar' : 'Pedidos Delivery'}
                            </h1>
                            <p className="text-slate-400 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] mt-1 md:mt-2">
                                {tipoVistaPOS === 'salon' ? 'Selecciona una mesa por piso o ambiente' : 'Visualiza y modifica pedidos activos'}
                            </p>
                        </div>
                    </div>

                    {/* Pestañas de Vista */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setTipoVistaPOS('salon')}
                            className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all ${
                                tipoVistaPOS === 'salon'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <UtensilsCrossed size={16} />
                            Salón ({totalOcupadas}/{mesas.length})
                        </button>

                        <button
                            onClick={() => setTipoVistaPOS('llevar')}
                            className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all ${
                                tipoVistaPOS === 'llevar'
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <ShoppingBag size={16} />
                            Para Llevar ({ventasParaLlevarPendientes.length})
                        </button>

                        <button
                            onClick={() => setTipoVistaPOS('delivery')}
                            className={`px-4 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all ${
                                tipoVistaPOS === 'delivery'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <Navigation2 size={16} />
                            Delivery ({ventasDeliveryPendientes.length})
                        </button>
                    </div>
                </div>

                {tipoVistaPOS === 'salon' && (
                    <>
                        {/* Filtro por PISO / AMBIENTE */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setFiltroPisoPOS(0)}
                                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all italic shrink-0 rounded-lg border ${
                                    filtroPisoPOS === 0
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Todos ({mesas.length})
                            </button>
                            {pisosExistentes.map(pisoNum => {
                                const mesasPiso = mesas.filter(m => (m.piso || 1) === pisoNum);
                                const libresPiso = mesasPiso.filter(m => m.estado === 'libre').length;
                                const label = pisoNum === 5 ? 'Terraza' : `${pisoNum}° Piso`;
                                return (
                                    <button
                                        key={pisoNum}
                                        type="button"
                                        onClick={() => setFiltroPisoPOS(pisoNum)}
                                        className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all italic shrink-0 rounded-lg border ${
                                            filtroPisoPOS === pisoNum
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {label} ({libresPiso}/{mesasPiso.length} libres)
                                    </button>
                                );
                            })}
                        </div>

                        {/* Grid de Mesas */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                            {mesasFiltradas.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm bg-white border border-slate-100 p-8 rounded-2xl">
                                    No hay mesas en este piso.
                                </div>
                            ) : (
                                mesasFiltradas.map((mesa) => (
                                    <motion.button
                                        key={mesa.id}
                                        onClick={() => handleTableClick(mesa)}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all duration-300 group shadow-sm border ${
                                            mesa.estado === 'libre'
                                                ? 'bg-white border-slate-200 text-slate-900 hover:border-slate-400 hover:shadow-md'
                                                : 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                                        }`}
                                    >
                                        <span className={`absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                            mesa.estado === 'libre' ? 'bg-slate-100 text-slate-500' : 'bg-black/20 text-white'
                                        }`}>
                                            {(mesa.piso || 1) === 5 ? 'Terraza' : `${mesa.piso || 1}° P.`}
                                        </span>

                                        <span className="text-2xl md:text-4xl font-black italic tracking-tighter">Mesa {mesa.numero}</span>
                                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] mt-1 ${
                                            mesa.estado === 'libre' ? 'text-emerald-600' : 'text-white/90'
                                        }`}>
                                            {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
                                        </span>
                                    </motion.button>
                                ))
                            )}
                        </div>
                    </>
                )}

                {tipoVistaPOS === 'llevar' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-amber-50/50 p-4 border border-amber-200/60 rounded-2xl">
                            <div>
                                <h2 className="text-lg font-black text-amber-900 uppercase italic">Pedidos Para Llevar Activos</h2>
                                <p className="text-xs text-amber-700 font-medium">Haz clic en cualquier pedido para ver detalles o agregar más productos.</p>
                            </div>
                            <button
                                onClick={() => handleTableClick(null)}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
                            >
                                <Plus size={16} /> + Nuevo Pedido Para Llevar
                            </button>
                        </div>

                        {ventasParaLlevarPendientes.length === 0 ? (
                            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-8">
                                <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-black text-slate-700 uppercase italic mb-1">Sin pedidos para llevar pendientes</h3>
                                <p className="text-xs text-slate-400 font-bold mb-6">Todos los pedidos para llevar han sido cobrados o no hay nuevos registrados.</p>
                                <button
                                    onClick={() => handleTableClick(null)}
                                    className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-600 transition-all"
                                >
                                    + Crear Nuevo Pedido Para Llevar
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {ventasParaLlevarPendientes.map((v) => (
                                    <motion.div
                                        key={v.id}
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-md hover:border-amber-400 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase">
                                                    🥡 LLEVAR #{v.id.slice(0, 6)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="space-y-1 mb-3">
                                                {(v.items || []).map((it: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs font-bold text-slate-800">
                                                        <span>{it.cantidad}x {it.nombre}</span>
                                                        <span className="text-slate-400">S/ {(it.precio * it.cantidad).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {v.notas && (
                                                <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 italic border border-slate-100 mb-3">
                                                    <span className="font-bold text-slate-400 not-italic uppercase text-[9px]">Nota:</span> {v.notas}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total acumulado</p>
                                                <p className="text-lg font-black text-slate-900">S/ {v.total.toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => handlePendingSaleClick(v)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase px-3.5 py-2 rounded-xl shadow-md transition-colors"
                                            >
                                                ✏️ Ver / Modificar
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tipoVistaPOS === 'delivery' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-indigo-50/50 p-4 border border-indigo-200/60 rounded-2xl">
                            <div>
                                <h2 className="text-lg font-black text-indigo-900 uppercase italic">Pedidos Delivery Activos</h2>
                                <p className="text-xs text-indigo-700 font-medium">Haz clic en cualquier pedido para ver detalles o agregar más productos.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsDelivery(true);
                                    setIsParaLlevar(false);
                                    setSelectedTable(null);
                                    setCarrito([]);
                                    setOrderNotes('');
                                    setView('pedido');
                                    setShowDeliveryMap(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
                            >
                                <Plus size={16} /> + Nuevo Pedido Delivery
                            </button>
                        </div>

                        {ventasDeliveryPendientes.length === 0 ? (
                            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-8">
                                <Navigation2 size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-black text-slate-700 uppercase italic mb-1">Sin pedidos de delivery pendientes</h3>
                                <p className="text-xs text-slate-400 font-bold mb-6">No hay pedidos pendientes de entrega o cobro.</p>
                                <button
                                    onClick={() => {
                                        setIsDelivery(true);
                                        setIsParaLlevar(false);
                                        setSelectedTable(null);
                                        setCarrito([]);
                                        setOrderNotes('');
                                        setView('pedido');
                                        setShowDeliveryMap(true);
                                    }}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all"
                                >
                                    + Crear Nuevo Pedido Delivery
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {ventasDeliveryPendientes.map((v) => (
                                    <motion.div
                                        key={v.id}
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-md hover:border-indigo-400 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase">
                                                    🛵 DELIVERY #{v.id.slice(0, 6)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {v.direccion_envio && (
                                                <p className="text-xs font-black text-indigo-700 mb-2 truncate">
                                                    📍 {v.direccion_envio}
                                                </p>
                                            )}
                                            {v.telefono_envio && (
                                                <p className="text-[11px] text-slate-500 font-bold mb-2">
                                                    📞 {v.telefono_envio}
                                                </p>
                                            )}
                                            <div className="space-y-1 mb-3">
                                                {(v.items || []).map((it: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs font-bold text-slate-800">
                                                        <span>{it.cantidad}x {it.nombre}</span>
                                                        <span className="text-slate-400">S/ {(it.precio * it.cantidad).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {v.notas && (
                                                <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 italic border border-slate-100 mb-3">
                                                    <span className="font-bold text-slate-400 not-italic uppercase text-[9px]">Nota:</span> {v.notas}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total inc. Envío</p>
                                                <p className="text-lg font-black text-slate-900">S/ {v.total.toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => handlePendingSaleClick(v)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase px-3.5 py-2 rounded-xl shadow-md transition-colors"
                                            >
                                                ✏️ Ver / Modificar
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => {
                        setCarrito([]);
                        setOrderNotes('');
                        setCurrentVentaId(null);
                        setSelectedTable(null);
                        setIsParaLlevar(false);
                        setIsDelivery(false);
                        setView('mesas');
                    }} className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 shadow-sm hover:bg-slate-50 transition-all">
                        <ArrowRight className="rotate-180" size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 italic tracking-tight uppercase flex items-center gap-2">
                            {isDelivery
                                ? (currentVentaId ? `🛵 Delivery #${currentVentaId.slice(0, 6)} (Modificando)` : "🛵 Nuevo Delivery")
                                : isParaLlevar
                                    ? (currentVentaId ? `🥡 Para Llevar #${currentVentaId.slice(0, 6)} (Modificando)` : "🥡 Nuevo Pedido Para Llevar")
                                    : `Mesa ${selectedTable?.numero}`}
                        </h1>
                        {isDelivery && deliveryInfo && (
                            <button
                                onClick={() => setShowDeliveryMap(true)}
                                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mt-1"
                            >
                                <MapPin size={12} />
                                {deliveryInfo.address}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Categorías y Acciones Rápidas */}
            <div className="flex flex-col gap-4 mb-6 sticky top-20 lg:top-0 z-30 bg-[#f8fafc]/90 backdrop-blur-md py-3 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x flex-1 mr-4">
                        {categorias.map((cat) => (
                            <button 
                                key={cat.id} 
                                onClick={() => setCategoriaActiva(cat.id)} 
                                className={`whitespace-nowrap px-4 py-2.5 rounded-none font-black uppercase tracking-widest text-[9px] border transition-all active:scale-95 ${categoriaActiva === cat.id ? 'bg-rodrigo-terracotta text-white border-rodrigo-terracotta shadow-md shadow-rodrigo-terracotta/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 invisible">
                        {/* Botones de vinculación eliminados por solicitud del usuario */}
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text" 
                        placeholder="BUSCAR PRODUCTO..." 
                        className="w-full bg-white border-2 border-slate-100 rounded-none py-4 pl-14 pr-8 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all outline-none focus:border-rodrigo-terracotta/20 shadow-sm" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative px-1">
                <div className="md:col-span-8">
                    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {productosFiltrados.map((producto) => (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                key={producto.id}
                                onClick={() => handleProductClick(producto)}
                                className="group bg-white p-4 rounded-none border border-slate-100 shadow-sm hover:border-rodrigo-terracotta/30 hover:shadow-lg transition-all text-center flex flex-col items-center justify-center min-h-[100px]"
                            >
                                <h3 className="text-[10px] font-black text-slate-900 uppercase italic tracking-tight leading-tight line-clamp-2 mb-2 group-hover:text-rodrigo-terracotta transition-colors">{producto.nombre}</h3>
                                <p className="text-sm font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-none italic">S/ {producto.precio.toFixed(2)}</p>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Carrito (Desktop Sidebar) */}
                <div className="hidden md:block md:col-span-4 sticky top-6">
                    <CartPanel
                        carrito={carrito}
                        vaciarCarrito={vaciarCarrito}
                        modificarCantidad={modificarCantidad}
                        calcularSubtotal={calcularSubtotal}
                        calcularTotal={calcularTotal}
                        isDelivery={isDelivery}
                        deliveryInfo={deliveryInfo}
                        handleConfirmarPedido={handleConfirmarPedido}
                        procesando={procesando}
                        currentVentaId={currentVentaId}
                    />
                </div>
            </div>

            {/* Mobile Bottom Cart Bar */}
            <AnimatePresence>
                {carrito.length > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="md:hidden fixed bottom-24 left-4 right-4 z-50 overflow-hidden"
                    >
                        <button
                            onClick={() => setIsCartDrawerOpen(true)}
                            className="w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between p-4 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rodrigo-terracotta rounded-xl flex items-center justify-center shadow-lg shadow-rodrigo-terracotta/20 relative">
                                    <ShoppingBag size={20} />
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rodrigo-mustard text-rodrigo-brown text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                                        {carrito.reduce((acc, it) => acc + it.cantidad, 0)}
                                    </span>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-none mb-1">Revisar Pedido</p>
                                    <p className="text-lg font-black italic tracking-tighter leading-none">Ver Carrito</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Total a Pagar</p>
                                <p className="text-2xl font-black italic tracking-tighter text-theme-primary leading-none">S/ {calcularTotal().toFixed(2)}</p>
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Cart Drawer */}
            <AnimatePresence>
                {isCartDrawerOpen && (
                    <div className="md:hidden fixed inset-0 z-[60] flex flex-col">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartDrawerOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="mt-auto bg-slate-900 rounded-t-[3rem] p-8 border-t border-white/10 relative z-10 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Revisar Pedido</h2>
                                <button onClick={() => setIsCartDrawerOpen(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/50"><X size={24} /></button>
                            </div>

                            <CartPanel
                                carrito={carrito}
                                vaciarCarrito={vaciarCarrito}
                                modificarCantidad={modificarCantidad}
                                calcularSubtotal={calcularSubtotal}
                                calcularTotal={calcularTotal}
                                isDelivery={isDelivery}
                                deliveryInfo={deliveryInfo}
                                handleConfirmarPedido={() => {
                                    handleConfirmarPedido();
                                    setIsCartDrawerOpen(false);
                                }}
                                procesando={procesando}
                                currentVentaId={currentVentaId}
                                isMobileDrawer
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ProductOptionsModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
                producto={selectedProduct}
                onConfirm={(producto, opciones) => { agregarAlCarrito(producto, opciones); setIsModalOpen(false); setSelectedProduct(null); }}
            />

            <AnimatePresence>
                {showReceipt && (
                    <ReceiptModal
                        isOpen={showReceipt}
                        onClose={() => setShowReceipt(false)}
                        items={lastSaleItems}
                        total={lastSaleTotal}
                        mesaNumero={selectedTable ? selectedTable.numero : undefined}
                        title={receiptTitle}
                        isNewSale={currentVentaId === null}
                        usuarioNombre={user?.nombre || undefined}
                        deliveryInfo={isDelivery && deliveryInfo ? { 
                            address: deliveryInfo.address, 
                            reference: deliveryInfo.reference, 
                            phone: deliveryInfo.phone,
                            estimatedTime: deliveryInfo.estimatedTime 
                        } : undefined}
                    />
                )}
            </AnimatePresence>

            <DeliverySelector
                isOpen={showDeliveryMap}
                onClose={() => setShowDeliveryMap(false)}
                onConfirm={(address, distanceKm, cost, reference, phone, estimatedTime, lat, lng, geometry) => {
                    setDeliveryInfo({ address, distanceKm, cost, reference, phone, estimatedTime, lat, lng, geometry });
                    setIsDelivery(true);
                    setIsParaLlevar(false);
                    setSelectedTable(null);
                    setShowDeliveryMap(false);
                    setView('pedido');
                }}
            />
        </div>
    );
}

type CartPanelProps = {
    carrito: ItemCarrito[];
    vaciarCarrito: () => void;
    modificarCantidad: (index: number, delta: number) => void;
    calcularSubtotal: () => number;
    calcularTotal: () => number;
    isDelivery: boolean;
    deliveryInfo: { 
        address: string; 
        distanceKm: number; 
        cost: number;
        reference?: string;
        phone?: string;
        estimatedTime?: string;
        lat?: number;
        lng?: number;
        geometry?: [number, number][];
    } | null;
    handleConfirmarPedido: () => void;
    procesando: boolean;
    currentVentaId: string | null;
    isMobileDrawer?: boolean;
};

function CartPanel({
    carrito,
    vaciarCarrito,
    modificarCantidad,
    calcularSubtotal,
    calcularTotal,
    isDelivery,
    deliveryInfo,
    handleConfirmarPedido,
    procesando,
    currentVentaId,
    isMobileDrawer = false
}: CartPanelProps) {
    const subtotal = calcularSubtotal();
    const total = calcularTotal();
    const costoEnvio = deliveryInfo?.cost || 0;

    return (
        <div className={`bg-white rounded-none border border-slate-100 shadow-xl overflow-hidden ${isMobileDrawer ? '' : ''}`}>
            <div className="p-6 border-b border-slate-50">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Tu Pedido</h2>
                    {carrito.length > 0 && (
                        <button
                            onClick={vaciarCarrito}
                            className="text-[10px] font-bold text-slate-400 hover:text-rodrigo-terracotta uppercase tracking-widest transition-colors"
                        >
                            Vaciar
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {carrito.length} {carrito.length === 1 ? 'item' : 'items'}
                </p>
            </div>

            {carrito.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag size={24} className="text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Carrito vacío</p>
                </div>
            ) : (
                <>
                    <div className={`${isMobileDrawer ? '' : 'max-h-[400px] overflow-y-auto'} p-4 space-y-3 custom-scrollbar`}>
                        {carrito.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-none">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 uppercase italic whitespace-normal">{item.nombre}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {item.detalles?.parte && (
                                            <span className="text-[11px] bg-rodrigo-terracotta text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm">
                                                {item.detalles.parte}
                                            </span>
                                        )}
                                        {item.detalles?.trozado && item.detalles.trozado !== 'entero' && (
                                            <span className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-black uppercase">
                                                {item.detalles.trozado}
                                            </span>
                                        )}
                                    </div>
                                    {item.detalles?.notas && (
                                        <p className="text-[11px] text-slate-500 mt-2 p-2 bg-white rounded-lg border border-slate-100 italic leading-tight shadow-sm">
                                            <span className="font-bold text-slate-400 not-italic uppercase text-[9px]">Nota:</span> {item.detalles.notas}
                                        </p>
                                    )}
                                    <p className="text-xs font-mono text-rodrigo-terracotta mt-1">S/ {item.precio.toFixed(2)} c/u</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => modificarCantidad(index, -1)}
                                        className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-rodrigo-terracotta hover:border-rodrigo-terracotta transition-colors"
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <span className="w-6 text-center font-black text-slate-900 text-sm">{item.cantidad}</span>
                                    <button
                                        onClick={() => modificarCantidad(index, 1)}
                                        className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-rodrigo-terracotta hover:border-rodrigo-terracotta transition-colors"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <span className="text-sm font-black text-slate-900 w-16 text-right">S/ {item.subtotal.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-bold uppercase tracking-widest">Subtotal</span>
                            <span className="text-slate-900 font-black">S/ {subtotal.toFixed(2)}</span>
                        </div>
                        {isDelivery && costoEnvio > 0 && (
                            <div className="space-y-2 mb-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-indigo-500 font-bold uppercase tracking-widest">Costo Envío</span>
                                    <span className="text-indigo-500 font-black">S/ {costoEnvio.toFixed(2)}</span>
                                </div>
                                {deliveryInfo && (
                                    <div className="bg-indigo-50/50 p-2 border-l-2 border-indigo-200 text-[10px] space-y-1">
                                        <p className="text-indigo-700 font-bold uppercase truncate">
                                            <MapPin size={10} className="inline mr-1" /> {deliveryInfo.address}
                                        </p>
                                        {(deliveryInfo.reference || deliveryInfo.phone) && (
                                            <p className="text-slate-500 font-medium italic">
                                                {deliveryInfo.reference && `Ref: ${deliveryInfo.reference} `}
                                                {deliveryInfo.phone && `| Tel: ${deliveryInfo.phone}`}
                                            </p>
                                        )}
                                        {deliveryInfo.estimatedTime && (
                                            <p className="text-indigo-600 font-black flex items-center gap-1">
                                                <Clock size={10} /> ESTIMADO: {deliveryInfo.estimatedTime}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-between pt-3 border-t border-slate-100">
                            <span className="text-slate-900 font-black uppercase tracking-widest">Total</span>
                            <span className="text-xl font-black text-rodrigo-terracotta">S/ {total.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handleConfirmarPedido}
                            disabled={procesando}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${procesando ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:brightness-110 active:scale-[0.98]'}`}
                        >
                            {procesando ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    {currentVentaId ? 'Actualizar Pedido' : 'Confirmar Pedido'}
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
