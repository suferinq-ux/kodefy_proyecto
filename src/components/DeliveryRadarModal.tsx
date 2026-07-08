'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation2, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { getDeliveryOrders, updateDeliveryStatus } from '@/lib/ventas';
import { Venta, RepartidorUbicacion } from '@/lib/database.types';
import { useBusiness } from '@/contexts/BusinessContext';
import toast from 'react-hot-toast';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

const RODRIGOS_LOCATION: [number, number] = [-13.178950365235947, -74.22213214233665];

interface DeliveryRadarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DeliveryRadarModal({ isOpen, onClose }: DeliveryRadarModalProps) {
    const { business } = useBusiness();
    const [orders, setOrders] = useState<Venta[]>([]);
    const [repartidores, setRepartidores] = useState<{ [id: string]: RepartidorUbicacion }>({});
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const data = await getDeliveryOrders();
        setOrders(data);

        // Initial fetch of current positions
        const { data: ubicaciones } = await supabase.from('repartidores_ubicacion').select('*');
        if (ubicaciones) {
            const map: any = {};
            ubicaciones.forEach(u => map[u.id] = u);
            setRepartidores(map);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!isOpen) return;

        loadData();

        // Suscribirse a cambios en los pedidos (por si el repartidor acepta o entrega)
        const channelVentas = supabase.channel('radar-ventas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas', filter: 'tipo_pedido=eq.delivery' }, () => {
                loadData();
            })
            .subscribe();

        // Suscribirse al tracker en vivo de ubicación de motorizados
        const channelGPS = supabase.channel('radar-gps')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'repartidores_ubicacion' }, (payload) => {
                const newPos = payload.new as RepartidorUbicacion;
                setRepartidores(prev => ({
                    ...prev,
                    [newPos.id]: newPos
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelVentas);
            supabase.removeChannel(channelGPS);
        };
    }, [isOpen]);

    const handleAssignDummy = async (orderId: string) => {
        // En un futuro, aquí podrías abrir un dropdown para elegir "A qué repartidor asignar".
        // Por la lógica actual, el repartidor lo acepta desde su Celular directamente.
        toast("El motorizado lo tiene que aceptar desde su celular", { icon: "ℹ️" });
    };

    if (!isOpen) return null;

    const motoIcon = new L.Icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', // Icono de motito (ejemplo)
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [1, -34],
        shadowSize: [40, 40]
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-theme-secondary/20"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 flex items-center justify-between text-white shrink-0 shadow-md z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-theme-secondary/20 rounded-full flex items-center justify-center backdrop-blur-md text-theme-secondary ring-2 ring-theme-secondary/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.9 2.4A9.9 9.9 0 0 0 2.2 12c0 2.8 1.1 5.4 3.2 7.3a1 1 0 0 0 1.5-.2l1.6-2.5a.6.6 0 0 1 .8-.2c1.3.6 2.7 1 4.1 1a5 5 0 0 0 4.8 5h.4A9.9 9.9 0 0 0 22 12c0-5.5-4.5-10-10-10Z" /><path d="M16 12a4 4 0 1 0-8 0" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">Radar de Delivery (Live)</h2>
                                    <p className="text-white/60 text-xs font-medium tracking-wide flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Sincronizado vía WebSockets
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-white/10 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 p-4 gap-4">

                            {/* Panel Izquierdo: Lista de Pedidos */}
                            <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">Despacho de Pedidos</h3>
                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">
                                        {orders.length} activos
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {loading ? (
                                        <div className="flex justify-center py-10 text-slate-400">
                                            <Loader2 className="animate-spin" size={24} />
                                        </div>
                                    ) : orders.length === 0 ? (
                                        <p className="text-center text-sm text-slate-400 mt-10">No hay deliveries pendientes.</p>
                                    ) : (
                                        orders.map(order => (
                                            <div key={order.id} className="p-3 border border-slate-100 bg-slate-50 rounded-xl hover:border-theme-secondary/50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${order.estado_delivery === 'buscando_repartidor' ? 'bg-blue-100 text-blue-700' :
                                                                order.estado_delivery === 'asignado' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {order.estado_delivery?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">S/ {order.total.toFixed(2)}</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{order.direccion_envio}</p>

                                                <div className="mt-3">
                                                    {order.estado_delivery === 'buscando_repartidor' && (
                                                        <button disabled onClick={() => handleAssignDummy(order.id)} className="w-full text-xs font-bold text-slate-500 bg-slate-200 py-2 rounded-lg cursor-not-allowed">
                                                            Esperando aceptación...
                                                        </button>
                                                    )}
                                                    {order.estado_delivery === 'asignado' && (
                                                        <div className="text-xs font-bold text-yellow-700 bg-yellow-50 py-2 rounded-lg text-center flex items-center justify-center gap-1">
                                                            Aceptado por motorizado
                                                        </div>
                                                    )}
                                                    {order.estado_delivery === 'en_camino' && (
                                                        <div className="text-xs font-bold text-orange-700 bg-orange-50 py-2 rounded-lg text-center flex items-center justify-center gap-1 animate-pulse">
                                                            <Navigation2 size={12} /> Moto en camino al cliente...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Panel Derecho: Mapa en Vivo */}
                            <div className="flex-1 bg-slate-200 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-300 relative z-0">
                                <div className="absolute top-4 left-4 right-4 z-[1000] drop-shadow-lg pointer-events-none flex justify-end">
                                    <div className="bg-white/90 backdrop-blur pointer-events-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-3">
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-theme-secondary"></span> {business?.nombre}</div>
                                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Motos Activas ({Object.keys(repartidores).length})</div>
                                    </div>
                                </div>

                                <MapContainer
                                    center={RODRIGOS_LOCATION}
                                    zoom={14}
                                    style={{ width: '100%', height: '100%', zIndex: 0 }}
                                    zoomControl={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                    />

                                    {/* Local */}
                                    <Marker position={RODRIGOS_LOCATION} icon={new L.Icon({
                                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
                                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                        iconSize: [25, 41],
                                        iconAnchor: [12, 41]
                                    })}>
                                        <Popup className="font-bold text-slate-900">🍔 {business?.nombre} Local</Popup>
                                    </Marker>

                                    {/* Render Repartidores (Motos en Mapeo) */}
                                    {Object.values(repartidores).map(rep => (
                                        <Marker key={rep.id} position={[rep.lat, rep.lng]} icon={motoIcon}>
                                            <Popup>
                                                <div className="text-center font-bold">
                                                    <p className="text-orange-600">🛵 Motorizado</p>
                                                    <p className="text-[10px] text-slate-400">Ult actualización: {new Date(rep.updated_at).toLocaleTimeString()}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
