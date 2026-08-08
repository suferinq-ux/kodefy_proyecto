'use client';

import { useState, useEffect } from 'react';
import { obtenerVentasDelDia } from '@/lib/reportes';
import { supabase } from '@/lib/supabase';
import type { Venta } from '@/lib/database.types';

interface UseVentasResult {
    ventas: Venta[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook para obtener las ventas del día en tiempo real
 */
export const useVentas = (negocioId?: string): UseVentasResult => {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVentas = async () => {
        try {
            setLoading(true);
            setError(null);
            if (!negocioId) {
                setVentas([]);
                return;
            }
            const data = await obtenerVentasDelDia(negocioId);
            setVentas(data);
        } catch (err) {
            console.error('Error al obtener ventas:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVentas();

        // Suscribirse a cambios en tiempo real
        const channel = supabase
            .channel('ventas-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ventas',
                    filter: negocioId ? `negocio_id=eq.${negocioId}` : undefined,
                },
                () => {
                    fetchVentas();
                }
            )
            .subscribe();

        // Actualizar cada 30 segundos
        const interval = setInterval(fetchVentas, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [negocioId]);

    return {
        ventas,
        loading,
        error,
        refetch: fetchVentas,
    };
};
