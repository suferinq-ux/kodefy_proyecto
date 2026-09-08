import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// POST /api/negocios/usuario/seleccionar
// El usuario elige en cuál de sus negocios trabajar. Actualiza
// user_profiles.negocio_id (el negocio "actual"), lo que hace que el
// RLS siga al usuario a ese local.
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi\u00f3n inv\u00e1lida' }, { status: 401 });
    }

    const { negocio_id } = await request.json();
    if (!negocio_id) {
      return NextResponse.json({ error: 'Falta el id del negocio a seleccionar.' }, { status: 400 });
    }

    const { data: negocio, error: negocioError } = await supabaseAdmin
      .from('negocios')
      .select('id, slug, estado')
      .eq('id', negocio_id)
      .single();

    if (negocioError || !negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado.' }, { status: 404 });
    }

    if (negocio.estado === 'suspendido') {
      return NextResponse.json({ error: 'Este negocio est\u00e1 suspendido.' }, { status: 403 });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('negocio_id, es_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Verificar que tenga acceso a este negocio
    let tieneAcceso = profile.es_super_admin;

    if (!tieneAcceso) {
      tieneAcceso = profile.negocio_id === negocio_id;
      if (!tieneAcceso) {
        const { data: pivot } = await supabaseAdmin
          .from('usuarios_negocios')
          .select('id')
          .eq('user_id', user.id)
          .eq('negocio_id', negocio_id)
          .maybeSingle();
        tieneAcceso = !!pivot;
      }
    }

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes acceso a este negocio.' }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ negocio_id })
      .eq('id', user.id);

    if (updateError) {
      console.error('[API Seleccionar Negocio] update error:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar el negocio.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug: negocio.slug });
  } catch (error: any) {
    console.error('[API Seleccionar Negocio] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}