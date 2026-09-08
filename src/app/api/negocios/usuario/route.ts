import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/negocios/usuario
// Devuelve todos los negocios a los que el usuario logueado puede acceder.
// - Super admin: TODOS los negocios.
// - Normal: su negocio actual (user_profiles.negocio_id) + los otorgados (usuarios_negocios).
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi\u00f3n inv\u00e1lida' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('negocio_id, rol, es_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    const selectFields = 'id, nombre, slug, logo_url, color_primario, color_secundario, estado';

    if (profile.es_super_admin) {
      const { data: negocios } = await supabaseAdmin
        .from('negocios')
        .select(selectFields)
        .order('nombre', { ascending: true });

      return NextResponse.json({
        negocios: negocios || [],
        isSuperAdmin: true,
        rol: profile.rol,
        negocioActualId: profile.negocio_id,
      });
    }

    const ids = new Set<string>();
    if (profile.negocio_id) ids.add(profile.negocio_id);

    const { data: pivot } = await supabaseAdmin
      .from('usuarios_negocios')
      .select('negocio_id')
      .eq('user_id', user.id);

    (pivot || []).forEach((row) => {
      if (row.negocio_id) ids.add(row.negocio_id);
    });

    if (ids.size === 0) {
      return NextResponse.json({
        negocios: [],
        isSuperAdmin: false,
        rol: profile.rol,
        negocioActualId: profile.negocio_id,
      });
    }

    const { data: negocios } = await supabaseAdmin
      .from('negocios')
      .select(selectFields)
      .in('id', [...ids])
      .order('nombre', { ascending: true });

    return NextResponse.json({
      negocios: negocios || [],
      isSuperAdmin: false,
      rol: profile.rol,
      negocioActualId: profile.negocio_id,
    });
  } catch (error: any) {
    console.error('[API Negocios Usuario] Error:', error);
    const missingTable = error?.message?.includes('does not exist') || error?.code === '42P01';
    if (missingTable) {
      return NextResponse.json(
        { error: 'La función multi-negocio aún no está activa. Ejecuta sql/multi_negocios.sql en Supabase.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}