import { supabase } from './supabase';
import { dbInsert, dbDelete, dbUpdate } from './supabaseApi';
import type { Venta } from './database.types';

export const registrarAnulacion = async (
    ventaId: string,
    motivo: string,
    usuarioId: string,
    usuarioNombre: string,
    negocioId: string
): Promise<{ success: boolean; message: string }> => {
    try {
        // 1. Obtener la venta actual antes de eliminarla
        const { data: venta, error: fetchError } = await supabase
            .from('ventas')
            .select('*')
            .eq('id', ventaId)
            .single();

        if (fetchError || !venta) {
            console.error('Error al obtener la venta para anular:', fetchError);
            return { success: false, message: 'No se encontró el pedido a anular.' };
        }

        const ventaData = venta as Venta;

        // 2. Insertar registro en tabla anulaciones
        const { error: insertError } = await dbInsert('anulaciones', {
            negocio_id: negocioId,
            venta_id: ventaId,
            usuario_id: usuarioId,
            usuario_nombre: usuarioNombre,
            motivo: motivo,
            monto_original: ventaData.total,
            items: ventaData.items,
            tipo_pedido: ventaData.tipo_pedido,
            mesa_numero: ventaData.mesa_id, 
            fecha_venta: ventaData.fecha
        });

        if (insertError) {
            console.error('Error registrando la anulación:', insertError);
            return { success: false, message: 'No se pudo guardar la justificación de anulación.' };
        }

        // 3. Eliminar la venta
        await dbDelete('ventas', { id: ventaId });

        // 4. Liberar mesa si era de tipo mesa y tenía mesa asignada
        if (ventaData.mesa_id) {
            await dbUpdate('mesas', { estado: 'libre' }, { id: ventaData.mesa_id });
        }

        return { success: true, message: 'Pedido eliminado y stock restaurado correctamente.' };
    } catch (error: any) {
        console.error('Error inesperado en registrarAnulacion:', error);
        return { success: false, message: 'Ocurrió un error inesperado al anular el pedido.' };
    }
};
