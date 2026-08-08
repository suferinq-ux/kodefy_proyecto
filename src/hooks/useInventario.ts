'use client';

import { useState, useEffect } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import type { StockActual, BebidasDetalle } from '@/lib/database.types';

interface UseInventarioResult {
    stock: StockActual | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Estructura por defecto - siempre se muestra, aunque todo sea 0
const DEFAULT_BEBIDAS: BebidasDetalle = {
    inca_kola: { personal: 0, personal_retornable: 0, '300ml': 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
    coca_cola: { personal: 0, personal_retornable: 0, '300ml': 0, descartable: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
    fanta: { personal: 0, '300ml': 0, descartable: 0 },
    piranita: { personal: 0 },
    cola_real: { '400ml': 0 },
    agua_angel: { personal: 0 },
    agua_san_luis: { personal: 0 },
    cerveza_trigo: { personal: 0 },
    cerveza_negra: { personal: 0 },
    frugos: { personal: 0 },
    sporade: { personal: 0 },
    chicha: { vaso: 0, medio_litro: 0, litro: 0 },
    cebada: { vaso: 0, medio_litro: 0, litro: 0 },
};

/** Resta las bebidas vendidas del stock inicial */
function calcularBebidasActuales(inicial: BebidasDetalle, ventasArray: BebidasDetalle[]): BebidasDetalle {
    // Clonar para no mutar
    const resultado: BebidasDetalle = JSON.parse(JSON.stringify(inicial));

    for (const venta of ventasArray) {
        if (!venta) continue;
        for (const marcaKey of Object.keys(venta)) {
            const marca = marcaKey as keyof BebidasDetalle;
            const tiposVenta = venta[marca];
            if (!tiposVenta || !resultado[marca]) continue;

            for (const tipoKey of Object.keys(tiposVenta)) {
                const cantidadVendida = (tiposVenta as Record<string, number>)[tipoKey] || 0;
                const actual = ((resultado[marca] as Record<string, number>)[tipoKey]) || 0;
                (resultado[marca] as Record<string, number>)[tipoKey] = Math.max(0, actual - cantidadVendida);
            }
        }
    }

    return resultado;
}

/**
 * Hook personalizado para obtener el stock actual del día
 * Obtiene datos DIRECTAMENTE de las tablas, sin depender de funciones RPC
 */
export const useInventario = (negocioId?: string): UseInventarioResult => {
    const [stock, setStock] = useState<StockActual | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStock = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!negocioId) {
                setStock(null);
                setError('Negocio no identificado');
                return;
            }

            const fechaHoy = obtenerFechaHoy();

            // 1. Obtener primero la jornada ABIERTA si existe (para no cortar a medianoche)
            let { data: inventario } = await supabase
                .from('inventario_diario')
                .select('*')
                .eq('negocio_id', negocioId)
                .eq('estado', 'abierto')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Si no hay jornada abierta, buscar por la fecha de hoy
            if (!inventario) {
                const { data: invHoy } = await supabase
                    .from('inventario_diario')
                    .select('*')
                    .eq('negocio_id', negocioId)
                    .eq('fecha', fechaHoy)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                inventario = invHoy;
            }

            // Si no hay inventario
            if (!inventario) {
                setStock(null);
                setError('No se ha realizado la apertura del día');
                return;
            }

            // Si el inventario está cerrado
            if (inventario.estado === 'cerrado') {
                setStock(null);
                setError('La jornada ha finalizado. Realiza una nueva apertura para el siguiente día.');
                return;
            }

            const fechaOperativa = inventario.fecha;

            // 2. Obtener TODAS las ventas de la jornada activa para calcular restas
            const { data: ventasDelDia, error: ventasError } = await supabase
                .from('ventas')
                .select('pollos_restados, gaseosas_restadas, chicha_restada, bebidas_detalle')
                .eq('negocio_id', negocioId)
                .eq('fecha', fechaOperativa);

            if (ventasError) {
                console.error('Error obteniendo ventas:', ventasError);
            }

            // 3. Calcular totales de pollos y gaseosas vendidos
            let pollosVendidos = 0;
            let gaseosasVendidas = 0;
            let chichaVendida = 0;
            const ventasBebidasArray: BebidasDetalle[] = [];

            if (ventasDelDia) {
                for (const v of ventasDelDia) {
                    pollosVendidos += v.pollos_restados || 0;
                    gaseosasVendidas += v.gaseosas_restadas || 0;
                    chichaVendida += v.chicha_restada || 0;
                    if (v.bebidas_detalle) {
                        ventasBebidasArray.push(v.bebidas_detalle as BebidasDetalle);
                    }
                }
            }

            // 4. Calcular bebidas actuales (inicial - vendidas)
            const bebidasInicial: BebidasDetalle = inventario.bebidas_detalle
                ? (inventario.bebidas_detalle as BebidasDetalle)
                : { ...JSON.parse(JSON.stringify(DEFAULT_BEBIDAS)) };

            const bebidasActuales = ventasBebidasArray.length > 0
                ? calcularBebidasActuales(bebidasInicial, ventasBebidasArray)
                : bebidasInicial;

            // Función auxiliar para sumar todas las unidades de bebidas
            const sumarTodo = (det: BebidasDetalle) => {
                let s = 0;
                Object.values(det).forEach(m => {
                    if (m) Object.values(m).forEach(c => s += (c || 0));
                });
                return s;
            };

            const totalInicialDetalle = sumarTodo(bebidasInicial);
            const totalActualDetalle = sumarTodo(bebidasActuales);

            // 5. Armar el stock completo
            const stockCalculado: StockActual = {
                id: inventario.id,
                negocio_id: inventario.negocio_id,
                fecha: inventario.fecha,
                pollos_enteros: inventario.pollos_enteros || 0,
                gaseosas: totalInicialDetalle || inventario.gaseosas || 0,
                pollos_disponibles: (inventario.pollos_enteros || 0) - pollosVendidos,
                gaseosas_disponibles: totalActualDetalle || (inventario.gaseosas || 0) - gaseosasVendidas,
                pollos_iniciales: inventario.pollos_enteros || 0,
                gaseosas_iniciales: totalInicialDetalle || inventario.gaseosas || 0,
                pollos_vendidos: pollosVendidos,
                gaseosas_vendidas: gaseosasVendidas,
                papas_iniciales: inventario.papas_iniciales || 0,
                dinero_inicial: inventario.dinero_inicial || 0,
                chicha_inicial: inventario.chicha_inicial || 0,
                chicha_vendida: chichaVendida,
                chicha_disponible: (inventario.chicha_inicial || 0) - chichaVendida,
                estado: inventario.estado || 'abierto',
                bebidas_detalle: bebidasActuales,
            };

            setStock(stockCalculado);

        } catch (err) {
            console.error('Error al obtener stock:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setStock(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();

        // Suscribirse a cambios en tiempo real
        const channel = supabase
            .channel('stock-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ventas',
                    filter: negocioId ? `negocio_id=eq.${negocioId}` : undefined,
                },
                () => {
                    fetchStock();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventario_diario',
                    filter: negocioId ? `negocio_id=eq.${negocioId}` : undefined,
                },
                () => {
                    fetchStock();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [negocioId]);

    return {
        stock,
        loading,
        error,
        refetch: fetchStock,
    };
};
