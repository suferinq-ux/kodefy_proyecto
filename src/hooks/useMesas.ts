'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { dbUpdate } from '@/lib/supabaseApi';
import type { Mesa } from '@/lib/database.types';
import { useBusiness } from '@/contexts/BusinessContext';

export function useMesas() {
    const { business } = useBusiness();
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch mesas
    const fetchMesas = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('mesas')
                .select('*')
                .eq('negocio_id', business?.id)
                .order('numero', { ascending: true });

            if (fetchError) throw fetchError;
            setMesas(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching mesas:', err);
            setError('Error al cargar las mesas');
        } finally {
            setLoading(false);
        }
    };

    // Ocupar mesa
    const ocuparMesa = async (mesaId: number): Promise<boolean> => {
        try {
            await dbUpdate('mesas', { estado: 'ocupada' }, { id: mesaId });

            // Actualizar estado local
            setMesas(prev => prev.map(mesa =>
                mesa.id === mesaId ? { ...mesa, estado: 'ocupada' } : mesa
            ));

            return true;
        } catch (err) {
            console.error('Error ocupando mesa:', err);
            return false;
        }
    };

    // Liberar mesa
    const liberarMesa = async (mesaId: number): Promise<boolean> => {
        try {
            await dbUpdate('mesas', { estado: 'libre' }, { id: mesaId });

            // Actualizar estado local
            setMesas(prev => prev.map(mesa =>
                mesa.id === mesaId ? { ...mesa, estado: 'libre' } : mesa
            ));

            return true;
        } catch (err) {
            console.error('Error liberando mesa:', err);
            return false;
        }
    };

    // Cambiar mesa (transferir pedido de una mesa a otra)
    const cambiarMesa = async (mesaOrigenId: number, mesaDestinoId: number): Promise<boolean> => {
        try {
            // 1. Actualizar la venta pendiente para que apunte a la nueva mesa
            await dbUpdate('ventas', { mesa_id: mesaDestinoId }, { mesa_id: mesaOrigenId, estado_pago: 'pendiente' });

            // 2. Liberar la mesa de origen
            await dbUpdate('mesas', { estado: 'libre' }, { id: mesaOrigenId });

            // 3. Ocupar la mesa de destino
            await dbUpdate('mesas', { estado: 'ocupada' }, { id: mesaDestinoId });

            // Actualizar estado local
            setMesas(prev => prev.map(mesa => {
                if (mesa.id === mesaOrigenId) return { ...mesa, estado: 'libre' };
                if (mesa.id === mesaDestinoId) return { ...mesa, estado: 'ocupada' };
                return mesa;
            }));

            return true;
        } catch (err) {
            console.error('Error cambiando mesa:', err);
            return false;
        }
    };

    // Suscripción en tiempo real a cambios en mesas
    useEffect(() => {
        fetchMesas();

        // Suscribirse a cambios en tiempo real
        const channel = supabase
            .channel('mesas-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mesas',
                    filter: `negocio_id=eq.${business?.id}`
                },
                (payload) => {
                    console.log('Mesa actualizada:', payload);
                    fetchMesas(); // Refrescar todas las mesas
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [business?.id]);

    return {
        mesas,
        loading,
        error,
        refetch: fetchMesas,
        ocuparMesa,
        liberarMesa,
        cambiarMesa
    };
}
