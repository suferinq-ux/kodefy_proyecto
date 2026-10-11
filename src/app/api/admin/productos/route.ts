import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function autenticar(request: NextRequest) {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return null;
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

async function puedeGestionar(userId: string, negocioId: string): Promise<boolean> {
    const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('negocio_id, rol, es_super_admin')
        .eq('id', userId)
        .maybeSingle();

    if (!profile) return false;
    if (profile.es_super_admin) return true;
    if (profile.rol !== 'admin' && profile.rol !== 'cajero') return false;
    if (profile.negocio_id === negocioId) return true;

    const { data: pivot } = await supabaseAdmin
        .from('usuarios_negocios')
        .select('id')
        .eq('user_id', userId)
        .eq('negocio_id', negocioId)
        .maybeSingle();

    return !!pivot;
}

// POST: Crear producto o categoría
export async function POST(request: NextRequest) {
    try {
        const user = await autenticar(request);
        if (!user) {
            return NextResponse.json({ error: 'No autorizado / Sesión no válida' }, { status: 401 });
        }

        const body = await request.json();

        // 1. Caso: Crear categoría rápida
        if (body.action === 'crear_categoria') {
            const { nombre, negocio_id } = body;
            if (!nombre || !negocio_id) {
                return NextResponse.json({ error: 'Nombre y negocio_id son obligatorios' }, { status: 400 });
            }

            if (!(await puedeGestionar(user.id, negocio_id))) {
                return NextResponse.json({ error: 'No tienes permisos para este negocio' }, { status: 403 });
            }

            const { data: catData, error: catError } = await supabaseAdmin
                .from('categorias')
                .insert([{
                    nombre: String(nombre).trim(),
                    negocio_id,
                    orden: 0
                }])
                .select()
                .single();

            if (catError) throw catError;
            return NextResponse.json({ success: true, categoria: catData });
        }

        // 2. Caso: Crear producto
        const { nombre, precio, tipo, categoria_id, imagen_url, fraccion_pollo, negocio_id } = body;

        if (!nombre || precio === undefined || !negocio_id) {
            return NextResponse.json({ error: 'Nombre, precio y negocio_id son obligatorios' }, { status: 400 });
        }

        if (!(await puedeGestionar(user.id, negocio_id))) {
            return NextResponse.json({ error: 'No tienes permisos para administrar este negocio' }, { status: 403 });
        }

        const dataToInsert = {
            nombre: String(nombre).trim(),
            precio: parseFloat(String(precio)),
            tipo: tipo || 'complemento',
            categoria_id: categoria_id && String(categoria_id).trim() !== '' ? String(categoria_id).trim() : null,
            imagen_url: imagen_url && String(imagen_url).trim() !== '' ? String(imagen_url).trim() : null,
            fraccion_pollo: tipo === 'pollo' ? (Number(fraccion_pollo) || 0) : 0,
            negocio_id,
            activo: true
        };

        const { data: newProd, error: insertError } = await supabaseAdmin
            .from('productos')
            .insert([dataToInsert])
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, producto: newProd });
    } catch (error: any) {
        console.error('[API admin/productos POST] Error:', error);
        return NextResponse.json({ error: error.message || 'Error al crear producto' }, { status: 500 });
    }
}

// PUT: Actualizar producto (nombre, precio, fraccion_pollo)
export async function PUT(request: NextRequest) {
    try {
        const user = await autenticar(request);
        if (!user) {
            return NextResponse.json({ error: 'No autorizado / Sesión no válida' }, { status: 401 });
        }

        const body = await request.json();
        const { id, nombre, precio, fraccion_pollo } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
        }

        const { data: prodExistente, error: prodErr } = await supabaseAdmin
            .from('productos')
            .select('id, negocio_id')
            .eq('id', id)
            .single();

        if (prodErr || !prodExistente) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        if (!(await puedeGestionar(user.id, prodExistente.negocio_id))) {
            return NextResponse.json({ error: 'No tienes permisos para editar en este negocio' }, { status: 403 });
        }

        const updates: any = {};
        if (nombre !== undefined) updates.nombre = String(nombre).trim();
        if (precio !== undefined) updates.precio = parseFloat(String(precio));
        if (fraccion_pollo !== undefined) updates.fraccion_pollo = Number(fraccion_pollo) || 0;

        const { data: updatedProd, error: updateError } = await supabaseAdmin
            .from('productos')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, producto: updatedProd });
    } catch (error: any) {
        console.error('[API admin/productos PUT] Error:', error);
        return NextResponse.json({ error: error.message || 'Error al actualizar producto' }, { status: 500 });
    }
}

// DELETE: Eliminar producto
export async function DELETE(request: NextRequest) {
    try {
        const user = await autenticar(request);
        if (!user) {
            return NextResponse.json({ error: 'No autorizado / Sesión no válida' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
        }

        const { data: prodExistente, error: prodErr } = await supabaseAdmin
            .from('productos')
            .select('id, negocio_id')
            .eq('id', id)
            .single();

        if (prodErr || !prodExistente) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        if (!(await puedeGestionar(user.id, prodExistente.negocio_id))) {
            return NextResponse.json({ error: 'No tienes permisos para eliminar en este negocio' }, { status: 403 });
        }

        const { error: deleteError } = await supabaseAdmin
            .from('productos')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, message: 'Producto eliminado' });
    } catch (error: any) {
        console.error('[API admin/productos DELETE] Error:', error);
        return NextResponse.json({ error: error.message || 'Error al eliminar producto' }, { status: 500 });
    }
}
