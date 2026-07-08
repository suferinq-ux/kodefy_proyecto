'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Search, Loader2, MapPin } from 'lucide-react';

interface LocationPickerMapProps {
    initialPosition: [number, number] | null;
    onLocationSelect: (lat: number, lng: number) => void;
}

// Centro por defecto: Ayacucho, Huamanga si no hay inicial
const DEFAULT_CENTER: [number, number] = [-13.1587, -74.2239];

const MapEvents = ({ setPosition, onSelect }: { setPosition: (p: [number, number]) => void, onSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            onSelect(lat, lng);
        },
    });
    return null;
};

const RecenterMap = ({ position }: { position: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

export default function LocationPickerMap({ initialPosition, onLocationSelect }: LocationPickerMapProps) {
    const [position, setPosition] = useState<[number, number]>(initialPosition || DEFAULT_CENTER);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Actualiza el marcador si initialPosition cambia externamente (ej: al cargar datos)
    useEffect(() => {
        if (initialPosition) {
            setPosition(initialPosition);
        }
    }, [initialPosition]);

    // Búsqueda con Photon (soporta autocompletado parcial)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const fetchPlaces = async () => {
            setIsSearching(true);
            try {
                // Priorizamos Ayacucho (Huamanga) pero sin bloquear otros resultados por si acaso
                const viewbox = "-74.25,-13.10,-74.15,-13.20";
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Ayacucho Peru")}&viewbox=${viewbox}&bounded=0&countrycodes=pe&limit=10`);
                const data = await response.json();
                
                if (data && data.length > 0) {
                    setSearchResults(data);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Error searching:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchPlaces, 800);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
        setSearchResults([]);
        setSearchQuery("");
    };

    return (
        <div className="relative w-full h-[400px] border-2 border-slate-100 bg-slate-50 flex flex-col rounded-none shadow-inner z-0">
            {/* Buscador Integrado */}
            <div className="absolute top-4 left-4 right-4 z-[1000] drop-shadow-lg">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar dirección en Ayacucho..."
                        className="w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-200 focus:border-theme-secondary focus:outline-none text-sm text-slate-700 font-medium rounded-none shadow-sm"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-primary animate-spin" size={18} />
                    )}
                </div>

                {searchResults.length > 0 && searchQuery.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-none shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-[1000]">
                        {searchResults.map((res: any, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelectResult(res);
                                }}
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
                center={position}
                zoom={16}
                style={{ width: '100%', height: '100%', zIndex: 0 }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapEvents setPosition={setPosition} onSelect={onLocationSelect} />
                <RecenterMap position={position} />

                {position && (
                    <Marker position={position} icon={new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })} />
                )}
            </MapContainer>
            
            <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm border border-slate-200 p-2 text-[10px] text-center font-bold text-slate-600 uppercase tracking-widest shadow-lg mx-auto max-w-sm rounded-none pointer-events-auto">
                    Haz clic en el mapa para marcar el punto A (Local)
                </div>
            </div>
        </div>
    );
}
