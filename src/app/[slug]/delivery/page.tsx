'use client';
// Forzado de actualización de despliegue - v3 (Final Fix)

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { getDeliveryOrders, updateDeliveryStatus, upsertRepartidorUbicacion } from '@/lib/ventas';
import { Venta } from '@/lib/database.types';
import { MapPin, Navigation, Navigation2, Clock, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });

// Icono personalizado para el destino
const destIcon = typeof window !== 'undefined' ? new (require('leaflet')).Icon({
    iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
}) : null;

// Icono personalizado para el motorizado (repartidor)
const bikeIcon = typeof window !== 'undefined' ? new (require('leaflet')).Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
}) : null;

const MapRecenter = ({ myLocation, targetLocation }: { myLocation: [number, number] | null, targetLocation: [number, number] }) => {
    const { useMap } = require('react-leaflet');
    const map = useMap();
    useEffect(() => {
        if (myLocation) {
            const L = require('leaflet');
            const bounds = L.latLngBounds([myLocation, targetLocation]);
            map.fitBounds(bounds, { padding: [30, 30] });
        } else {
            map.setView(targetLocation, map.getZoom());
        }
    }, [myLocation, targetLocation, map]);
    return null;
};

export default function DeliveryDashboard() {
    const { user } = useAuth();
    const { business } = useBusiness();
    const [orders, setOrders] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);
    const [businessOrigin, setBusinessOrigin] = useState<[number, number] | null>(null);
    const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await getDeliveryOrders();
            setOrders(data);

            // Cargar origen del negocio (una sola vez)
            if (!businessOrigin && (business?.id || user?.negocio_id)) {
                const negocioId = business?.id || user?.negocio_id;
                const { data: config } = await supabase
                    .from('configuracion_negocio')
                    .select('nombre_negocio')
                    .eq('negocio_id', negocioId)
                    .maybeSingle();

                let loaded = false;
                if (config?.nombre_negocio) {
                    try {
                        const extra = JSON.parse(config.nombre_negocio);
                        if (extra.latitud && extra.longitud) {
                            setBusinessOrigin([Number(extra.latitud), Number(extra.longitud)]);
                            loaded = true;
                        }
                    } catch (e) { }
                }
                if (!loaded) {
                    setBusinessOrigin([business?.latitud || -13.1587, business?.longitud || -74.2239]);
                }
            }
        } catch (err) {
            console.error("[DeliveryDashboard] Error loading orders:", err);
            toast.error("Error al cargar pedidos");
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (orderId: string) => {
        const success = await updateDeliveryStatus(orderId, 'entregado');
        if (success) {
            toast.success("Pedido completado");
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
            toast.error("No se pudo completar el pedido");
        }
    };

    // Tracking GPS del repartidor
    useEffect(() => {
        if (!user) return;

        if (typeof window === 'undefined' || !navigator.geolocation) {
            toast.error("Tu dispositivo no soporta geolocalización o no está activada");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setMyLocation([latitude, longitude]);
                
                // Enviar coordenadas a Supabase si el rol es repartidor
                if (user?.id && user.rol === 'repartidor') {
                    await upsertRepartidorUbicacion(user.id, latitude, longitude, business?.id || user.negocio_id);
                }
            },
            (error) => {
                console.error("[GPS Tracking Error]", error);
                toast.error("Por favor, permite el acceso al GPS para que la tienda rastree tu entrega en vivo.");
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 10000
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [user, business?.id]);

    useEffect(() => {
        loadOrders();

        const channel = supabase
            .channel('public:ventas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas', filter: 'tipo_pedido=eq.delivery' }, () => {
                loadOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [business?.id]);

    const getGoogleMapsLink = (address: string, lat?: number, lng?: number) => {
        if (lat && lng) {
            return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ", Ayacucho")}`;
    };

    return (
        <ProtectedRoute requiredPermission="delivery">
            <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-12 pb-32 md:pb-8">
                <div className="max-w-xl mx-auto space-y-8">
                    {/* Header */}
                    <header className="relative p-6 bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden group shadow-sm">
                        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Lista de Entregas 🛵</h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Solo consulta de pedidos</p>
                            </div>
                            <button
                                onClick={loadOrders}
                                className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all shadow-sm"
                            >
                                <Clock size={24} className={loading ? 'animate-spin text-slate-400' : 'text-slate-400'} />
                            </button>
                        </div>
                    </header>

                    {loading && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader2 className="animate-spin text-rodrigo-terracotta" size={60} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Buscando rutas...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                <Navigation size={48} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Sin pedidos por ahora</h3>
                            <p className="text-slate-400 text-xs max-w-[200px] mx-auto uppercase font-bold tracking-widest">No hay entregas pendientes en el sistema.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl">
                                <p className="text-[10px] text-blue-600 font-bold uppercase text-center tracking-widest">
                                    💡 Desliza un pedido hacia la derecha para completarlo
                                </p>
                            </div>
                            <AnimatePresence mode="popLayout">
                                {orders.map((order, idx) => {
                                    const items = order.items || [];
                                    const totalItems = items.reduce((s, i) => s + (i.cantidad || 0), 0);

                                    return (
                                        <div key={order.id} className="relative group">
                                            {/* Fondo de Swipe (Acción) */}
                                            <div className="absolute inset-0 bg-green-500 rounded-[2rem] flex items-center pl-8 text-white">
                                                <div className="flex flex-col items-center">
                                                    <Check size={32} strokeWidth={3} className="animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest mt-1">Completar</span>
                                                </div>
                                            </div>

                                            <motion.div
                                                drag="x"
                                                dragConstraints={{ left: 0, right: 300 }}
                                                dragElastic={0.7}
                                                onDragEnd={(e, info) => {
                                                    if (info.offset.x > 200) {
                                                        handleComplete(order.id);
                                                    }
                                                }}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: 500 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="relative bg-white rounded-[2rem] border border-slate-100 overflow-hidden transition-shadow duration-300 shadow-sm hover:shadow-md touch-pan-y"
                                            >
                                                {/* Status Header */}
                                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`
                                                            px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                                            ${order.estado_pago === 'pagado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                                order.estado_delivery === 'buscando_repartidor' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                                                order.estado_delivery === 'asignado' ? 'bg-rodrigo-mustard border border-rodrigo-mustard/20 text-slate-900' :
                                                                    'bg-rodrigo-terracotta/10 text-rodrigo-terracotta border border-rodrigo-terracotta/20'}
                                                        `}>
                                                            {order.estado_pago === 'pagado' ? 'COMPLETADO' :
                                                                order.estado_delivery === 'buscando_repartidor' ? 'ESPERANDO' :
                                                                order.estado_delivery === 'asignado' ? 'EN PREPARACIÓN' : 'EN CAMINO'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-slate-300">#{order.id.slice(0, 8).toUpperCase()}</span>
                                                </div>

                                                <div className="p-6">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex-1">
                                                            <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight mb-1 italic">
                                                                {order.direccion_envio || 'VÍA PÚBLICA'}
                                                            </h3>
                                                            <div className="flex gap-4">
                                                                <div className="flex items-center gap-1 text-rodrigo-terracotta font-black text-sm italic">
                                                                    <Navigation2 size={14} />
                                                                    {(order.distancia_km || 0).toFixed(1)}KM
                                                                </div>
                                                                <div className="flex items-center gap-1 text-slate-400 font-bold text-sm italic">
                                                                    <Clock size={14} />
                                                                    {order.tiempo_estimado_envio ? `ESTIMADO: ${order.tiempo_estimado_envio}` : 'PEDIDO DE HOY'}
                                                                </div>
                                                            </div>

                                                            {(order.referencia_envio || order.telefono_envio) && (
                                                                <div className="mt-3 p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-xl">
                                                                    {order.referencia_envio && (
                                                                        <p className="text-xs text-indigo-900 font-bold mb-1">
                                                                            📍 REF: <span className="font-black italic">{order.referencia_envio}</span>
                                                                        </p>
                                                                    )}
                                                                    {order.telefono_envio && (
                                                                        <p className="text-xs text-indigo-900 font-bold">
                                                                            📞 TEL: <span className="font-black italic">{order.telefono_envio}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Mini Mapa de Ruta */}
                                                            {order.latitud_envio && order.longitud_envio && (
                                                                <div className="mt-4 h-56 w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                                                                    <MapContainer
                                                                        center={[order.latitud_envio, order.longitud_envio]}
                                                                        zoom={14}
                                                                        scrollWheelZoom={true}
                                                                        dragging={true}
                                                                        zoomControl={true}
                                                                        style={{ height: '100%', width: '100%' }}
                                                                    >
                                                                        <MapRecenter myLocation={myLocation} targetLocation={[order.latitud_envio, order.longitud_envio]} />
                                                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                                        <Marker position={[order.latitud_envio, order.longitud_envio]} icon={destIcon} />
                                                                        {order.geometria_envio && (
                                                                            <Polyline positions={order.geometria_envio} color="#4F46E5" weight={4} opacity={0.6} dashArray="5, 10" />
                                                                        )}
                                                                        {businessOrigin && (
                                                                            <Marker position={businessOrigin} icon={typeof window !== 'undefined' ? new (require('leaflet')).Icon({
                                                                                iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619153.png',
                                                                                iconSize: [24, 24],
                                                                                iconAnchor: [12, 24]
                                                                            }) : undefined} />
                                                                        )}
                                                                        {myLocation && (
                                                                            <Marker position={myLocation} icon={bikeIcon} />
                                                                        )}
                                                                    </MapContainer>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
                                                            <p className="text-3xl font-black text-slate-900 tracking-tighter shadow-sm italic">
                                                                S/{(order.total || 0).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Items Summary */}
                                                    <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenido ({totalItems} items)</span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {items.map((item, id) => (
                                                                <div key={id} className="space-y-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[11px] font-black text-slate-900 shadow-sm">
                                                                            {item.cantidad}
                                                                        </div>
                                                                        <span className="text-sm font-bold text-slate-700 uppercase italic whitespace-normal">{item.nombre}</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                                                                        {item.detalles?.parte && (
                                                                            <span className="text-[10px] bg-rodrigo-terracotta text-white px-2 py-0.5 rounded-md font-black uppercase shadow-sm">
                                                                                {item.detalles.parte}
                                                                            </span>
                                                                        )}
                                                                        {item.detalles?.trozado && item.detalles.trozado !== 'entero' && (
                                                                            <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-black uppercase">
                                                                                {item.detalles.trozado}
                                                                            </span>
                                                                        )}
                                                                        {item.detalles?.notas && (
                                                                            <p className="w-full text-[11px] text-slate-500 italic mt-1 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                                                <span className="text-[9px] font-black text-slate-400 not-italic uppercase block mb-0.5">Nota:</span>
                                                                                {item.detalles.notas}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <a
                                                            href={getGoogleMapsLink(order.direccion_envio || '', order.latitud_envio || undefined, order.longitud_envio || undefined)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 py-4 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-xl hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 italic"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MapPin size={18} /> Ver Mapa
                                                        </a>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
