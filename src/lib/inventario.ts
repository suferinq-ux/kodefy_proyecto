import { supabase, obtenerFechaHoy } from './supabase';
import { dbUpdate } from './supabaseApi';

async function obtenerInventarioActivo(negocioId: string) {
    const fechaHoy = obtenerFechaHoy();
    let { data } = await supabase
        .from('inventario_diario')
        .select('*')
        .eq('negocio_id', negocioId)
        .eq('estado', 'abierto')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (data && data.fecha < fechaHoy) {
        // Auto-cerrar jornada anterior
        await dbUpdate('inventario_diario', {
            estado: 'cerrado',
            observaciones_cierre: 'Cierre automático por el sistema al iniciar un nuevo día operativo.',
            stock_pollos_real: 0,
            stock_gaseosas_real: 0,
            dinero_cierre_real: 0
        }, { id: data.id });
        data = null;
    }

    if (!data) {
        const { data: dataHoy } = await supabase
            .from('inventario_diario')
            .select('*')
            .eq('negocio_id', negocioId)
            .eq('fecha', fechaHoy)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        data = dataHoy;
    }
    return data;
}

/**
 * Ajusta el stock de pollos para la jornada activa sumando la cantidad proporcionada.
 */
export async function ajustarStockPollos(negocioId: string, cantidad: number): Promise<{ success: boolean; message: string }> {
    try {
        const data = await obtenerInventarioActivo(negocioId);
        if (!data) {
            return { success: false, message: 'No se encontró la apertura de jornada.' };
        }

        const nuevoTotal = (data.pollos_enteros || 0) + cantidad;

        await dbUpdate('inventario_diario', { pollos_enteros: nuevoTotal }, { id: data.id });

        return { success: true, message: `Se añadieron ${cantidad} pollos al stock.` };
    } catch (error: any) {
        console.error('Error al ajustar stock de pollos:', error);
        return { success: false, message: error.message || 'Error al actualizar el stock.' };
    }
}

/**
 * Ajusta el dinero inicial (Caja Chica) sumando el monto proporcionado.
 */
export async function ajustarCajaChica(negocioId: string, monto: number): Promise<{ success: boolean; message: string }> {
    try {
        const data = await obtenerInventarioActivo(negocioId);
        if (!data) {
            return { success: false, message: 'No se encontró la apertura de jornada.' };
        }

        const nuevoTotal = (data.dinero_inicial || 0) + monto;

        await dbUpdate('inventario_diario', { dinero_inicial: nuevoTotal }, { id: data.id });

        return { success: true, message: `Se añadieron S/ ${monto.toFixed(2)} a la caja chica.` };
    } catch (error: any) {
        console.error('Error al ajustar caja chica:', error);
        return { success: false, message: error.message || 'Error al actualizar la caja.' };
    }
}

/**
 * Ajusta el stock de chicha (litros) sumando la cantidad proporcionada.
 */
export async function ajustarStockChicha(negocioId: string, cantidad: number): Promise<{ success: boolean; message: string }> {
    try {
        const data = await obtenerInventarioActivo(negocioId);
        if (!data) {
            return { success: false, message: 'No se encontró la apertura de jornada.' };
        }

        const nuevoTotal = (data.chicha_inicial || 0) + cantidad;

        await dbUpdate('inventario_diario', { chicha_inicial: nuevoTotal }, { id: data.id });

        return { success: true, message: `Se añadieron ${cantidad.toFixed(2)}L de chicha al stock.` };
    } catch (error: any) {
        console.error('Error al ajustar stock de chicha:', error);
        return { success: false, message: error.message || 'Error al actualizar el stock.' };
    }
}

/**
 * Ajusta el stock de papas (Kg) sumando la cantidad proporcionada.
 */
export async function ajustarStockPapas(negocioId: string, cantidad: number): Promise<{ success: boolean; message: string }> {
    try {
        const data = await obtenerInventarioActivo(negocioId);
        if (!data) {
            return { success: false, message: 'No se encontró la apertura de jornada.' };
        }

        const nuevoTotal = (data.papas_iniciales || 0) + cantidad;

        await dbUpdate('inventario_diario', { papas_iniciales: nuevoTotal }, { id: data.id });

        return { success: true, message: `Se añadieron ${cantidad.toFixed(1)}Kg de papas al stock.` };
    } catch (error: any) {
        console.error('Error al ajustar stock de papas:', error);
        return { success: false, message: error.message || 'Error al actualizar el stock.' };
    }
}
