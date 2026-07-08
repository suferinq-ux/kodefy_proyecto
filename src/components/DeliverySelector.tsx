'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Info, Search, Loader2, Check } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Leaflet
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Coordenadas por defecto (Ayacucho) si el negocio no ha configurado
const DEFAULT_LOCATION: [number, number] = [-13.1587, -74.2239];
const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || '';

interface DeliverySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (address: string, distanceKm: number, cost: number, reference?: string, phone?: string, estimatedTime?: string, lat?: number, lng?: number, geometry?: [number, number][]) => void;
}

// Componente helper para manejar eventos del mapa
const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Autopan helper
const RecenterMap = ({ position }: { position: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(position, map.getZoom());
    }, [position, map]);
    return null;
};

export default function DeliverySelector({ isOpen, onClose, onConfirm }: DeliverySelectorProps) {
    const { business } = useBusiness();
    
    const originLat = business?.latitud || DEFAULT_LOCATION[0];
    const originLng = business?.longitud || DEFAULT_LOCATION[1];
    const initialOrigin: [number, number] = [originLat, originLng];

    const [currentOrigin, setCurrentOrigin] = useState<[number, number]>(initialOrigin);
    const [currentCosts, setCurrentCosts] = useState({ 
        base: business?.costo_base_delivery || 3, 
        perKm: business?.costo_por_km || 1 
    });

    const [markerPosition, setMarkerPosition] = useState<[number, number]>(initialOrigin);
    const [address, setAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [distance, setDistance] = useState<number | null>(null);
    const [calculatedCost, setCalculatedCost] = useState<number>(0);
    const [manualCost, setManualCost] = useState<string>('');
    const [calculating, setCalculating] = useState(false);
    const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
    
    // Nuevos campos
    const [reference, setReference] = useState('');
    const [phone, setPhone] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');

    // Función para manejar el clic en el mapa y hacer geocodificación inversa
    const handleMapClick = async (lat: number, lng: number) => {
        setMarkerPosition([lat, lng]);
        
        // Reverse Geocoding
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.display_name) {
                // Tomar la parte más relevante de la dirección (las primeras 2 partes separadas por coma)
                const parts = data.display_name.split(',');
                const shortAddress = parts.slice(0, 2).join(',').trim();
                setAddress(shortAddress);
            } else {
                setAddress('Ubicación seleccionada');
            }
        } catch (error) {
            console.error("Error en geocodificación inversa:", error);
            setAddress('Ubicación seleccionada');
        }
    };

    // Resetear el mapa y obtener coordenadas frescas cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            // Fetch fresh coordinates in case Realtime is disabled or delayed
            const fetchFreshCoords = async () => {
                if (business?.id) {
                    const { data } = await supabase.from('configuracion_negocio').select('nombre_negocio').eq('negocio_id', business.id).maybeSingle();
                    if (data && data.nombre_negocio) {
                        try {
                            const parsed = JSON.parse(data.nombre_negocio);
                            setCurrentCosts({
                                base: parsed.costo_base_delivery !== undefined ? Number(parsed.costo_base_delivery) : 3,
                                perKm: parsed.costo_por_km !== undefined ? Number(parsed.costo_por_km) : 1
                            });
                            
                            if (parsed.latitud && parsed.longitud) {
                                const newOrigin: [number, number] = [Number(parsed.latitud), Number(parsed.longitud)];
                                setCurrentOrigin(newOrigin);
                                setMarkerPosition(newOrigin);
                            } else {
                                setCurrentOrigin(initialOrigin);
                                setMarkerPosition(initialOrigin);
                            }
                        } catch(e) {
                            setCurrentOrigin(initialOrigin);
                            setMarkerPosition(initialOrigin);
                        }
                    } else {
                        setCurrentOrigin(initialOrigin);
                        setMarkerPosition(initialOrigin);
                    }
                } else {
                    setCurrentOrigin(initialOrigin);
                    setMarkerPosition(initialOrigin);
                }
            };
            
            fetchFreshCoords();
            setAddress('');
            setCalculatedCost(0);
            setManualCost('');
            setDistance(null);
            setRouteGeometry(null);
            setReference('');
            setPhone('');
            setEstimatedTime('');
        }
    }, [isOpen, business?.id]);

    const calculateShipping = (distanceInKm: number): number => {
        return currentCosts.base + (distanceInKm * currentCosts.perKm);
    };

    // Búsqueda con Photon (Auto-sugerencias con debounce)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const fetchPlaces = async () => {
            setIsSearching(true);
            try {
                // Aumentamos el límite de resultados y usamos una búsqueda más amplia
                // Priorizamos Ayacucho (Huamanga) pero sin bloquear otros resultados por si acaso
                const viewbox = "-74.25,-13.10,-74.15,-13.20";
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Ayacucho Peru")}&viewbox=${viewbox}&bounded=0&countrycodes=pe&limit=10&addressdetails=1`);
                const data = await response.json();

                if (data && data.length > 0) {
                    setSearchResults(data);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Error searching places:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchPlaces, 800); // Aumentamos a 800ms para evitar bloqueos por rate-limit
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        setMarkerPosition([lat, lon]);
        setAddress(result.display_name.split(',')[0] || result.display_name);
        setSearchResults([]);
        // Pausar búsqueda temporalmente para no re-disparar el fetch
        setSearchQuery("");
    };

    // Calcular Ruta con OpenRouteService
    useEffect(() => {
        if (!isOpen) return;
        
        if (markerPosition[0] === currentOrigin[0] && markerPosition[1] === currentOrigin[1]) {
            setDistance(0);
            setCalculatedCost(0);
            setManualCost('');
            setRouteGeometry(null);
            setEstimatedTime('');
            return;
        }

        const fetchRoute = async () => {
            if (!ORS_API_KEY) {
                // Fallback a línea recta si no hay API Key (haversine)
                const lat1 = currentOrigin[0];
                const lon1 = currentOrigin[1];
                const lat2 = markerPosition[0];
                const lon2 = markerPosition[1];
                const p = 0.017453292519943295;
                const c = Math.cos;
                const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
                const km = 12742 * Math.asin(Math.sqrt(a));
                setDistance(km);
                const suggested = calculateShipping(km);
                setCalculatedCost(suggested);
                setManualCost(suggested.toFixed(2));
                
                // Estimación simple: 15 min base + 4 min por km
                const mins = Math.round(15 + (km * 4));
                setEstimatedTime(`${mins}-${mins + 10} min`);
                return;
            }

            setCalculating(true);
            try {
                // ORS Usa [lng, lat]
                const startParams = `${currentOrigin[1]},${currentOrigin[0]}`;
                const endParams = `${markerPosition[1]},${markerPosition[0]}`;
                const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startParams}&end=${endParams}`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.features && data.features.length > 0) {
                    const feature = data.features[0];
                    const distKm = feature.properties.segments[0].distance / 1000;
                    setDistance(distKm);
                    const suggested = calculateShipping(distKm);
                    setCalculatedCost(suggested);
                    // Actualizar manualCost solo si está vacío o si lo quiere auto-actulizar, 
                    // para mayor fluidez lo sobreescribimos cada vez que cambia el punto en el mapa:
                    setManualCost(suggested.toFixed(2));

                    // Decode geometry (está en [lng, lat], react-leaflet usa [lat, lng])
                    const flipped = feature.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                    setRouteGeometry(flipped);

                    // Estimación basada en tiempo de ruta ORS (segundos) + 15 min de preparación
                    const travelTimeMins = Math.round(feature.properties.segments[0].duration / 60);
                    const totalTime = 15 + travelTimeMins;
                    setEstimatedTime(`${totalTime}-${totalTime + 10} min`);
                } else {
                    toast.error("No se pudo calcular la ruta para esta ubicación.");
                    setDistance(null);
                    setCalculatedCost(0);
                }
            } catch (error) {
                console.error("ORS Error:", error);
                toast.error("Fallo al conectar con servicio de rutas.");
                setDistance(null);
            } finally {
                setCalculating(false);
            }
        };

        const debounce = setTimeout(fetchRoute, 800);
        return () => clearTimeout(debounce);
    }, [markerPosition, currentOrigin, isOpen]);

    const handleConfirm = () => {
        const finalCost = parseFloat(manualCost);
        if (!address || isNaN(finalCost) || finalCost < 0) {
            toast.error('Verifica la dirección y el costo antes de agregar.');
            return;
        }
        onConfirm(address, distance || 0, finalCost, reference, phone, estimatedTime, markerPosition[0], markerPosition[1], routeGeometry || undefined);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-none shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-theme-secondary/20"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-theme-primary to-red-600 p-5 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-none flex items-center justify-center backdrop-blur-md">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Ubicación de Delivery</h2>
                            <p className="text-white/80 text-xs font-medium tracking-wide">Huamanga, Ayacucho</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-none flex items-center justify-center transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 lg:p-6 flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px] overflow-hidden">

                    {/* Panel Izquierdo: Mapa */}
                    <div className="flex-1 rounded-none overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50 relative flex flex-col z-0">
                        {/* Search Bar (Fuera del Canvas de Leaflet pero dentro del panel) */}
                        <div className="absolute top-4 left-4 right-4 z-[1000] drop-shadow-xl">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Escribe la calle, barrio o lugar en Ayacucho..."
                                    className="w-full pl-10 pr-10 py-3 bg-white rounded-none border-2 border-transparent focus:border-theme-secondary focus:outline-none text-sm text-slate-700 font-medium"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-primary animate-spin" size={18} />
                                )}
                            </div>

                            {/* Resultados de búsqueda (Autocompletado) */}
                            {searchResults.length > 0 && searchQuery.length > 0 && (
                                <div className="absolute top-full mt-2 w-full bg-white rounded-none shadow-2xl overflow-hidden border border-slate-100 max-h-60 overflow-y-auto">
                                    {searchResults.map((res: any, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectResult(res)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors text-sm text-slate-700 font-medium flex items-center gap-2"
                                        >
                                            <MapPin size={16} className="text-theme-secondary shrink-0" />
                                            <span className="truncate">{res.display_name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <MapContainer
                            center={currentOrigin}
                            zoom={15}
                            style={{ width: '100%', height: '100%', zIndex: 0 }}
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            />

                            <MapEvents onMapClick={handleMapClick} />
                            <RecenterMap position={markerPosition} />

                            {/* Local de Negocio (Origen) */}
                            <Marker position={currentOrigin} icon={new L.Icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41]
                            })} />

                            {/* Destino */}
                            {(markerPosition[0] !== currentOrigin[0] || markerPosition[1] !== currentOrigin[1]) && (
                                <Marker position={markerPosition} icon={new L.Icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                    iconSize: [25, 41],
                                    iconAnchor: [12, 41],
                                    popupAnchor: [1, -34],
                                    shadowSize: [41, 41]
                                })} />
                            )}

                            {/* Ruta */}
                            {routeGeometry && (
                                <Polyline positions={routeGeometry} color="#D35400" weight={6} opacity={0.7} dashArray="1, 10" lineCap="round" />
                            )}
                        </MapContainer>
                    </div>

                    {/* Panel Derecho: Info y Cobro */}
                    <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <Navigation size={16} className="text-theme-primary" />
                                Detalle del Envío
                            </h3>

                            <div className="bg-slate-50 rounded-none p-3 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Dirección exacta:</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Nombre de calle y número..."
                                    className="w-full bg-white px-3 py-2 rounded-none text-sm border border-slate-200 focus:outline-none focus:border-theme-secondary text-slate-700 font-medium"
                                />
                            </div>

                            <div className="bg-slate-50 rounded-none p-3 border border-slate-200 mt-2">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Referencia / Dpto (Opcional):</label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Ej: Puerta verde, 2do piso..."
                                    className="w-full bg-white px-3 py-2 rounded-none text-sm border border-slate-200 focus:outline-none focus:border-theme-secondary text-slate-700 font-medium"
                                />
                            </div>

                            <div className="bg-slate-50 rounded-none p-3 border border-slate-200 mt-2">
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Teléfono (Opcional):</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="987 654 321"
                                    className="w-full bg-white px-3 py-2 rounded-none text-sm border border-slate-200 focus:outline-none focus:border-theme-secondary text-slate-700 font-medium"
                                />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-rodrigo-cream to-white border border-theme-secondary/30 rounded-none p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-theme-secondary/10 rounded-none -mr-8 -mt-8 pointer-events-none"></div>

                            <div className="flex justify-between items-end mb-4 border-b border-slate-900/10 pb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-900/60 uppercase tracking-wider mb-1">Distancia y Tiempo</p>
                                    <div className="flex items-baseline gap-3">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-slate-900">
                                                {distance !== null ? distance.toFixed(1) : '--'}
                                            </span>
                                            <span className="text-sm font-bold text-slate-900/60">km</span>
                                        </div>
                                        {estimatedTime && (
                                            <div className="bg-slate-900 text-white px-2 py-0.5 text-[10px] font-black uppercase italic rounded-none mb-1">
                                                {estimatedTime}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {calculating && <Loader2 className="animate-spin text-theme-primary" size={24} />}
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-900/60 uppercase tracking-wider mb-2 flex justify-between items-center">
                                    <span>Flete (Editable)</span>
                                    {calculatedCost > 0 && (
                                        <span className="text-[10px] bg-theme-secondary/20 text-slate-900 px-2 py-0.5 rounded-none border border-theme-secondary/30">
                                            Sug: S/ {calculatedCost.toFixed(2)}
                                        </span>
                                    )}
                                </p>
                                <div className="flex items-center gap-2 bg-white rounded-none border border-slate-200 px-3 py-2 shadow-inner focus-within:border-theme-secondary transition-colors">
                                    <span className="text-xl font-bold text-slate-400">S/</span>
                                    <input
                                        type="number"
                                        step="0.10"
                                        min="0"
                                        value={manualCost}
                                        onChange={(e) => setManualCost(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full text-3xl font-black text-theme-primary bg-transparent focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Regla de negocio helper */}
                            <div className="mt-4 pt-3 border-t border-slate-900/10">
                                <p className="text-[10px] text-slate-900/60 leading-tight">
                                    <strong>Tarifario base:</strong> S/ {currentCosts.base.toFixed(2)} + S/ {currentCosts.perKm.toFixed(2)} por cada km de distancia.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={!address || manualCost === ''}
                            className="w-full py-4 bg-black text-white font-black text-lg rounded-none shadow-lg mt-auto hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            AGREGAR ENVÍO <Check size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
