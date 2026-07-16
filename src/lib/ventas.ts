import { supabase, obtenerFechaHoy } from './supabase';
import type { ItemCarrito, VentaResponse, ItemVenta, BebidasDetalle, Venta } from './database.types';

/**
 * Calcula el total de pollos restados y el detalle de bebidas
 */
export const calcularStockRestado = (items: ItemCarrito[]) => {
    let pollosRestados = 0;
    let gaseosasRestadas = 0;
    let chichaRestada = 0;
    const bebidasDetalle: BebidasDetalle = {};

    items.forEach((item) => {
        if (item.fraccion_pollo > 0) {
            // Es un producto de pollo
            pollosRestados += item.fraccion_pollo * item.cantidad;
        } else if (item.detalle_bebida) {
            // Es una bebida con detalle específico
            const { marca, tipo } = item.detalle_bebida;

            if (marca === 'chicha') {
                // Descuento en litros según requerimiento
                // vaso: 250ml (0.25L), litro: 1L, medio_litro: 0.5L
                let litros = 0;
                if (tipo === 'vaso') litros = 0.25;
                else if (tipo === 'litro') litros = 1.0;
                else if (tipo === 'medio_litro') litros = 0.5;

                chichaRestada += litros * item.cantidad;

                // También sumar al detalle para visibilidad en el desglose
                if (!bebidasDetalle.chicha) bebidasDetalle.chicha = {};
                bebidasDetalle.chicha[tipo] = ((bebidasDetalle.chicha[tipo] as number) || 0) + item.cantidad;
            } else {
                gaseosasRestadas += item.cantidad;
                // Inicializar objeto de marca si no existe
                if (!bebidasDetalle[marca]) {
                    bebidasDetalle[marca] = {};
                }

                // Sumar cantidad 
                const brandObj = bebidasDetalle[marca]!;
                brandObj[tipo] = ((brandObj[tipo] as number) || 0) + item.cantidad;
            }
        } else {
            // Retrocompatibilidad
            if (item.fraccion_pollo === 0 && item.precio > 0) {
                gaseosasRestadas += item.cantidad;
            }
        }
    });

    return { pollosRestados, gaseosasRestadas, chichaRestada, bebidasDetalle };
};

/**
 * Valida que haya stock suficiente para realizar la venta
 */
export const validarStockDisponible = async (
    items: ItemCarrito[]
): Promise<{ valido: boolean; mensaje: string; advertenciaGaseosas?: string; gaseosasDisponibles?: number }> => {
    const { pollosRestados, gaseosasRestadas, bebidasDetalle } = calcularStockRestado(items);

    const fechaHoy = obtenerFechaHoy();

    // 1. Obtener inventario del día directamente
    const { data: inventario, error: invError } = await supabase
        .from('inventario_diario')
        .select('*')
        .eq('fecha', fechaHoy)
        .single();

    if (invError || !inventario) {
        return {
            valido: false,
            mensaje: 'No se ha realizado la apertura del día. Por favor, registra el inventario inicial.',
        };
    }

    if (inventario.estado === 'cerrado') {
        return {
            valido: false,
            mensaje: 'La jornada ha finalizado. Realiza una nueva apertura para continuar.',
        };
    }

    // 2. Obtener TODAS las ventas del día para calcular el stock ya consumido
    const { data: ventasDelDia, error: ventasError } = await supabase
        .from('ventas')
        .select('pollos_restados, gaseosas_restadas, bebidas_detalle')
        .eq('fecha', fechaHoy);

    if (ventasError) {
        console.error('Error obteniendo ventas para validación:', ventasError);
    }

    // 3. Calcular totales consumidos
    let totalPollosConsumidos = 0;
    let totalGaseosasConsumidas = 0;
    const bebidasConsumidasArray: BebidasDetalle[] = [];

    if (ventasDelDia) {
        for (const v of ventasDelDia) {
            totalPollosConsumidos += v.pollos_restados || 0;
            totalGaseosasConsumidas += v.gaseosas_restadas || 0;
            if (v.bebidas_detalle) {
                bebidasConsumidasArray.push(v.bebidas_detalle as BebidasDetalle);
            }
        }
    }

    // 4. Calcular stock disponible (Inicial - Consumido)
    const pollosDisponibles = (inventario.pollos_enteros || 0) - totalPollosConsumidos;
    const gaseosasDisponibles = (inventario.gaseosas || 0) - totalGaseosasConsumidas;

    // 5. Calcular detalle de bebidas disponibles
    const bebidasInicial = inventario.bebidas_detalle as BebidasDetalle || {};

    // Función auxiliar para restar bebidas (similar a la de useInventario)
    const calcularBebidasRestantes = (inicial: BebidasDetalle, ventas: BebidasDetalle[]): BebidasDetalle => {
        const resultado: BebidasDetalle = JSON.parse(JSON.stringify(inicial));
        for (const venta of ventas) {
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
    };

    const stockBebidasActual = bebidasConsumidasArray.length > 0
        ? calcularBebidasRestantes(bebidasInicial, bebidasConsumidasArray)
        : bebidasInicial;

    // Validar pollos (esta validación SÍ bloquea la venta)
    if (pollosRestados > pollosDisponibles) {
        return {
            valido: false,
            mensaje: `Stock insuficiente de pollos. Disponible: ${pollosDisponibles.toFixed(2)}, Necesario: ${pollosRestados.toFixed(2)}`,
        };
    }

    // Validar Gaseosas Detalladas
    let advertenciaGaseosas: string | undefined;

    if (stockBebidasActual) {
        for (const [marca, tipos] of Object.entries(bebidasDetalle)) {
            if (!tipos) continue;
            for (const [tipo, cantidadNecesaria] of Object.entries(tipos)) {
                // @ts-ignore
                const stockDisponible = stockBebidasActual[marca]?.[tipo] || 0;
                // @ts-ignore
                if (cantidadNecesaria > stockDisponible) {
                    // @ts-ignore
                    advertenciaGaseosas = `⚠️ Stock insuficiente de ${marca} ${tipo} (Disp: ${stockDisponible}).`;
                }
            }
        }
    }

    // Validación genérica si falla la detallada o como respaldo
    if (!advertenciaGaseosas && gaseosasRestadas > gaseosasDisponibles) {
        advertenciaGaseosas = `⚠️ Sin stock general de gaseosas (Disponible: ${gaseosasDisponibles}).`;
    }

    return {
        valido: true,
        mensaje: 'Stock suficiente',
        advertenciaGaseosas,
        gaseosasDisponibles: gaseosasDisponibles
    };
};

/**
 * Registra una nueva venta en Supabase
 */
export const registrarVenta = async (
    items: ItemCarrito[],
    mesaId?: number,
    notas?: string,
    deliveryData?: {
        tipo_pedido: 'mesa' | 'llevar' | 'delivery';
        costo_envio?: number;
        direccion_envio?: string;
        distancia_km?: number;
        metodo_pago?: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'mixto';
        referencia_envio?: string;
        telefono_envio?: string;
        tiempo_estimado_envio?: string;
        latitud_envio?: number;
        longitud_envio?: number;
        geometria_envio?: [number, number][];
    },
    usuarioNombre?: string,
    negocioId?: string
): Promise<VentaResponse> => {
    try {
        // Validar stock disponible
        const validacion = await validarStockDisponible(items);
        if (!validacion.valido) {
            return {
                success: false,
                message: validacion.mensaje,
            };
        }

        // Calcular totales
        const totalProductos = items.reduce((sum, item) => sum + item.subtotal, 0);
        const totalConEnvio = totalProductos + (deliveryData?.costo_envio || 0);
        const { pollosRestados, gaseosasRestadas, chichaRestada, bebidasDetalle } = calcularStockRestado(items);

        // Preparar items para guardar (sin el campo subtotal)
        const itemsParaGuardar: ItemVenta[] = items.map(({ subtotal, ...item }) => item);

        // Insertar venta
        const { data, error } = await supabase
            .from('ventas')
            .insert({
                fecha: obtenerFechaHoy(),
                items: itemsParaGuardar,
                total: totalConEnvio,
                pollos_restados: pollosRestados,
                gaseosas_restadas: gaseosasRestadas,
                chicha_restada: chichaRestada,
                bebidas_detalle: bebidasDetalle, // Guardar detalle
                mesa_id: mesaId,
                estado_pedido: 'pendiente',
                estado_pago: 'pendiente',
                notas: notas || null,
                tipo_pedido: deliveryData?.tipo_pedido || (mesaId ? 'mesa' : 'llevar'),
                costo_envio: deliveryData?.costo_envio || 0,
                direccion_envio: deliveryData?.direccion_envio || null,
                distancia_km: deliveryData?.distancia_km || 0,
                estado_delivery: deliveryData?.tipo_pedido === 'delivery' ? 'buscando_repartidor' : null,
                referencia_envio: deliveryData?.referencia_envio || null,
                telefono_envio: deliveryData?.telefono_envio || null,
                tiempo_estimado_envio: deliveryData?.tiempo_estimado_envio || null,
                latitud_envio: deliveryData?.latitud_envio || null,
                longitud_envio: deliveryData?.longitud_envio || null,
                geometria_envio: deliveryData?.geometria_envio || null,
                metodo_pago: deliveryData?.metodo_pago || 'efectivo',
                usuario_nombre: usuarioNombre || null,
                negocio_id: negocioId
            })
            .select()
            .single();

        if (error) {
            console.error('Error al registrar venta:', error);
            return {
                success: false,
                message: `Error al registrar la venta: ${error.message}`,
            };
        }

        let mensaje = `Pedido registrado. Total: S/ ${totalConEnvio.toFixed(2)}.`;
        if (validacion.advertenciaGaseosas) {
            mensaje += ` ${validacion.advertenciaGaseosas}`;
        }

        return {
            success: true,
            message: mensaje,
            data,
        };
    } catch (error) {
        console.error('Error inesperado:', error);
        return {
            success: false,
            message: 'Error inesperado al procesar la venta',
        };
    }
};

/**
 * Actualiza una venta existente
 */
export const actualizarVenta = async (
    ventaId: string,
    itemsActualizados: ItemCarrito[],
    usuarioNombre?: string
): Promise<VentaResponse> => {
    try {
        // 1. Obtener la venta actual
        const { data: ventaActual, error: errorFetch } = await supabase
            .from('ventas')
            .select('*')
            .eq('id', ventaId)
            .single();

        if (errorFetch || !ventaActual) {
            return { success: false, message: 'No se encontró la venta a actualizar' };
        }

        // 2. Preparar la lista final de items (REEMPLAZO TOTAL para permitir eliminaciones)
        // IMPORTANTE: Esto permite borrar items y que el stock retorne.
        // La concurrencia se manejará via Realtime en el frontend.
        const listaFinalItems: ItemVenta[] = itemsActualizados.map(({ subtotal, ...item }) => item);

        // 3. Calcular nuevos valores
        // Reconstruimos ItemCarrito para cálculo correcto
        const itemsParaCalculo: ItemCarrito[] = listaFinalItems.map(it => ({
            ...it,
            subtotal: it.precio * it.cantidad
        }));

        const { pollosRestados: nuevoPollos, gaseosasRestadas: nuevoGaseosas, chichaRestada: nuevoChicha, bebidasDetalle: nuevoDetalle } = calcularStockRestado(itemsParaCalculo);

        // 5. Recalcular total monetario (preservando costo de envío si existía)
        const totalProductos = itemsParaCalculo.reduce((sum, item) => sum + item.subtotal, 0);
        const totalFinal = totalProductos + (ventaActual.costo_envio || 0);

        // 6. Actualizar en BD
        const { data, error: errorUpdate } = await supabase
            .from('ventas')
            .update({
                items: listaFinalItems,
                total: totalFinal,
                pollos_restados: nuevoPollos,
                gaseosas_restadas: nuevoGaseosas,
                chicha_restada: nuevoChicha,
                bebidas_detalle: nuevoDetalle,
                usuario_nombre: usuarioNombre || undefined
            })
            .eq('id', ventaId)
            .select()
            .single();

        if (errorUpdate) {
            return { success: false, message: `Error al actualizar: ${errorUpdate.message}` };
        }

        return {
            success: true,
            message: 'Pedido actualizado correctamente',
            data
        };
    } catch (error) {
        return { success: false, message: 'Error inesperado al actualizar' };
    }
};

// ---------------- DELIVERY FUNCTIONS -----------------

export const getDeliveryOrders = async (): Promise<Venta[]> => {
    try {
        const { data, error } = await supabase
            .from('ventas')
            .select(`
                *,
                mesas (numero)
            `)
            .eq('tipo_pedido', 'delivery')
            .eq('fecha', obtenerFechaHoy())
            .neq('estado_delivery', 'entregado')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error al obtener pedidos de delivery:", error);
            return [];
        }

        return (data || []) as Venta[];
    } catch (err) {
        console.error("Error:", err);
        return [];
    }
};

export const updateDeliveryStatus = async (
    ventaId: string,
    status: 'buscando_repartidor' | 'asignado' | 'en_camino' | 'entregado',
    repartidorId?: string,
    metodoPago?: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'mixto'
) => {
    try {
        const updates: any = { estado_delivery: status };
        if (repartidorId !== undefined) {
            updates.repartidor_id = repartidorId;
        }

        if (metodoPago) {
            updates.metodo_pago = metodoPago;
        }

        if (status === 'entregado') {
            updates.estado_pedido = 'entregado';
            // Eliminamos updates.estado_pago = 'pagado' para que el cobro se gestione en caja
        }

        const { error } = await supabase
            .from('ventas')
            .update(updates)
            .eq('id', ventaId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error actualizando estado del delivery:', error);
        return false;
    }
};

export const upsertRepartidorUbicacion = async (repartidorId: string, lat: number, lng: number, negocioId?: string) => {
    try {
        const payload: any = {
            id: repartidorId,
            lat,
            lng,
            updated_at: new Date().toISOString()
        };
        if (negocioId) {
            payload.negocio_id = negocioId;
        }
        const { error } = await supabase
            .from('repartidores_ubicacion')
            .upsert(payload);
        if (error) throw error;
    } catch (error) {
        console.error('Error enviando ubicación GPS:', error);
    }
};
