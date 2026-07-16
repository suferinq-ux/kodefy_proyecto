'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { getDeliveryOrders } from '@/lib/ventas';
import { Venta } from '@/lib/database.types';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Navigation, Navigation2, Clock, Loader2, Check, Users, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });

const destIcon = typeof window !== 'undefined' ? new (require('leaflet')).Icon({
    iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
}) : null;

const motoIcon = typeof window !== 'undefined' ? new (require('leaflet')).Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
}) : null;

const localIcon = typeof window !== 'undefined' ? new (require('leaflet')).Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
}) : null;

const RecenterMap = ({ position }: { position: [number, number] }) => {
    const { useMap } = require('react-leaflet');
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

export default function RadarPage() {
    const { user } = useAuth();
    const { business } = useBusiness();
    const [orders, setOrders] = useState<Venta[]>([]);
    const [repartidores, setRepartidores] = useState<{ [id: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [businessLocation, setBusinessLocation] = useState<[number, number]>([-13.1587, -74.2239]);
    const [selectedOrder, setSelectedOrder] = useState<Venta | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Cargar Pedidos Delivery
            const data = await getDeliveryOrders();
            setOrders(data);

            // 2. Cargar Origen del Negocio
            if (business?.id || user?.negocio_id) {
                const negocioId = business?.id || user?.negocio_id;
                const { data: configData } = await supabase
                    .from('configuracion_negocio')
                    .select('nombre_negocio')
                    .eq('negocio_id', negocioId)
                    .maybeSingle();

                let locationSet = false;
                if (configData && configData.nombre_negocio) {
                    try {
                        const parsed = JSON.parse(configData.nombre_negocio);
                        if (parsed.latitud && parsed.longitud) {
                            setBusinessLocation([Number(parsed.latitud), Number(parsed.longitud)]);
                            locationSet = true;
                        }
                    } catch(e) {}
                }
                if (!locationSet) {
                    setBusinessLocation([business?.latitud || -13.1587, business?.longitud || -74.2239]);
                }
            }

            // 3. Cargar Repartidores y Perfiles
            const { data: profiles } = await supabase.from('user_profiles').select('id, nombre');
            const { data: ubicaciones } = await supabase.from('repartidor_ubicacion').select('*');
            
            if (ubicaciones && profiles) {
                const profileMap = new Map(profiles.map(p => [p.id, p.nombre]));
                const mapUbicaciones: any = {};
                ubicaciones.forEach(u => {
                    mapUbicaciones[u.id] = {
                        ...u,
                        nombre: profileMap.get(u.id) || 'Motorizado'
                    };
                });
                setRepartidores(mapUbicaciones);
            }
        } catch (error) {
            console.error('Error cargando datos del radar:', error);
            toast.error('Error al cargar datos en vivo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Suscribirse a cambios en ventas de delivery
        const channelVentas = supabase.channel('radar-live-ventas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas', filter: 'tipo_pedido=eq.delivery' }, () => {
                loadData();
            })
            .subscribe();

        // Suscribirse al tracker en vivo de ubicación de motorizados
        const channelGPS = supabase.channel('radar-live-gps')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'repartidor_ubicacion' }, async (payload) => {
                const newPos = payload.new as any;
                
                // Intentar obtener el nombre del repartidor si no lo tenemos en cache
                let nombre = 'Motorizado';
                if (repartidores[newPos.id]) {
                    nombre = repartidores[newPos.id].nombre;
                } else {
                    const { data: profile } = await supabase.from('user_profiles').select('nombre').eq('id', newPos.id).single();
                    if (profile) nombre = profile.nombre;
                }

                setRepartidores(prev => ({
                    ...prev,
                    [newPos.id]: {
                        ...newPos,
                        nombre
                    }
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelVentas);
            supabase.removeChannel(channelGPS);
        };
    }, [business?.id]);

    const handleFocusOrder = (order: Venta) => {
        setSelectedOrder(order);
        if (order.latitud_envio && order.longitud_envio) {
            setBusinessLocation([order.latitud_envio, order.longitud_envio]);
        }
    };

    const getStatusStyle = (status?: string) => {
        switch (status) {
            case 'buscando_repartidor':
                return 'bg-blue-50 text-blue-600 border border-blue-100';
            case 'asignado':
                return 'bg-yellow-50 text-yellow-700 border border-yellow-100';
            case 'en_camino':
                return 'bg-orange-50 text-orange-700 border border-orange-100 animate-pulse';
            case 'entregado':
                return 'bg-green-50 text-green-600 border border-green-100';
            default:
                return 'bg-slate-50 text-slate-600 border border-slate-100';
        }
    };

    return (
        <ProtectedRoute requiredPermission="pos">
            <div className="h-[calc(100vh-80px)] lg:h-[calc(100vh-40px)] flex flex-col lg:flex-row overflow-hidden bg-slate-50">
                {/* Panel Izquierdo: Pedidos de Despacho */}
                <div className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                                Despacho Radar
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Seguimiento en Vivo</p>
                        </div>
                        <button
                            onClick={loadData}
                            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin text-slate-400' : 'text-slate-500'} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading && orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                                <Loader2 className="animate-spin text-slate-400" size={32} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-20">
                                <Navigation size={32} className="text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-black text-slate-800 uppercase italic">Sin entregas activas</h3>
                                <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 uppercase">No hay pedidos delivery pendientes.</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => handleFocusOrder(order)}
                                    className={`p-4 border rounded-2xl cursor-pointer transition-all hover:shadow-md ${
                                        selectedOrder?.id === order.id
                                            ? 'border-slate-900 bg-slate-50/50 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${getStatusStyle(order.estado_delivery)}`}>
                                            {order.estado_delivery?.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs font-black text-slate-900 italic">S/ {order.total.toFixed(2)}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-2">{order.direccion_envio}</p>
                                    
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-50">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {order.tiempo_estimado_envio || 'Pronto'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Navigation2 size={12} /> {(order.distancia_km || 0).toFixed(1)} km
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Mapa en Vivo */}
                <div className="flex-1 relative z-0 bg-slate-100 flex flex-col h-full">
                    {/* Floating Info Overlay */}
                    <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none flex justify-between items-start">
                        <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/50 shadow-lg pointer-events-auto flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                                <span className="text-xs font-black uppercase italic text-slate-800">{business?.nombre}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-sm" />
                                <span className="text-xs font-black uppercase italic text-slate-800">Motos Activas ({Object.keys(repartidores).length})</span>
                            </div>
                        </div>

                        {selectedOrder && (
                            <button
                                onClick={() => {
                                    setSelectedOrder(null);
                                    setBusinessLocation([business?.latitud || -13.1587, business?.longitud || -74.2239]);
                                }}
                                className="bg-slate-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-md pointer-events-auto"
                            >
                                Mostrar Todo
                            </button>
                        )}
                    </div>

                    <MapContainer
                        center={businessLocation}
                        zoom={14}
                        style={{ width: '100%', height: '100%', zIndex: 0 }}
                        zoomControl={true}
                    >
                        <RecenterMap position={businessLocation} />
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Local del Negocio */}
                        {businessLocation && (
                            <Marker position={businessLocation} icon={localIcon}>
                                <Popup className="font-bold text-slate-900">🏢 {business?.nombre || 'Local'}</Popup>
                            </Marker>
                        )}

                        {/* Clientes / Entregas Activas */}
                        {orders.map(order => {
                            if (!order.latitud_envio || !order.longitud_envio) return null;
                            return (
                                <React.Fragment key={order.id}>
                                    <Marker
                                        position={[order.latitud_envio, order.longitud_envio]}
                                        icon={destIcon}
                                    >
                                        <Popup>
                                            <div className="font-bold text-slate-800 space-y-1">
                                                <p className="text-sm border-b pb-1">📍 Cliente: {order.direccion_envio}</p>
                                                <p className="text-xs text-slate-500">Monto: S/ {order.total.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">Estado: <span className="font-black uppercase tracking-wider">{order.estado_delivery?.replace('_', ' ')}</span></p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    {order.geometria_envio && (
                                        <Polyline
                                            positions={order.geometria_envio}
                                            color={selectedOrder?.id === order.id ? '#D35400' : '#3498DB'}
                                            weight={selectedOrder?.id === order.id ? 6 : 4}
                                            opacity={0.7}
                                            dashArray="5, 10"
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {/* Repartidores (Motos GPS en Vivo) */}
                        {Object.values(repartidores).map(rep => {
                            if (!rep.lat || !rep.lng) return null;
                            return (
                                <Marker
                                    key={rep.id}
                                    position={[rep.lat, rep.lng]}
                                    icon={motoIcon}
                                >
                                    <Popup>
                                        <div className="text-center font-bold space-y-1">
                                            <p className="text-orange-600">🛵 {rep.nombre}</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                                                Ubicación actualizada: {new Date(rep.updated_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </ProtectedRoute>
    );
}
