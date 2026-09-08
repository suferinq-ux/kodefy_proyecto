import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function autenticar(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Un usuario puede gestionar los accesos de un negocio si:
// - es super admin, o
// - es admin (rol='admin') Y es miembro de ese negocio (actual u otorgado).
async function puedeGestionar(userId: string, negocioId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('negocio_id, rol, es_super_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return false;
  if (profile.es_super_admin) return true;
  if (profile.rol !== 'admin') return false;
  if (profile.negocio_id === negocioId) return true;

  const { data: pivot } = await supabaseAdmin
    .from('usuarios_negocios')
    .select('id')
    .eq('user_id', userId)
    .eq('negocio_id', negocioId)
    .maybeSingle();

  return !!pivot;
}

interface UsuarioAcceso {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  esSuperAdmin: boolean;
  esAccesoExtra: boolean; // true si solo tiene acceso via usuarios_negocios
}

// GET /api/business-access?negocio_id=...  → lista usuarios con acceso
export async function GET(request: NextRequest) {
  try {
    const user = await autenticar(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = request.nextUrl.searchParams.get('negocio_id');
    if (!negocioId) return NextResponse.json({ error: 'Falta el negocio_id' }, { status: 400 });

    if (!(await puedeGestionar(user.id, negocioId))) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar este negocio.' }, { status: 403 });
    }

    // Usuarios cuyo negocio actual es este (negocio "original")
    const { data: homeUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('id, nombre, rol, activo, es_super_admin')
      .eq('negocio_id', negocioId);

    // Usuarios otorgados via pivote
    const { data: pivotRows } = await supabaseAdmin
      .from('usuarios_negocios')
      .select('user_id')
      .eq('negocio_id', negocioId);

    const homeIds = new Set((homeUsers || []).map((u) => u.id));
    const extraIds = [...new Set((pivotRows || []).map((r) => r.user_id as string).filter((id) => !homeIds.has(id)))];

    const perfiles = [...(homeUsers || []).map((u) => ({ ...u, esAccesoExtra: false }))];

    if (extraIds.length > 0) {
      const { data: extraProfiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, nombre, rol, activo, es_super_admin')
        .in('id', extraIds);

      for (const p of extraProfiles || []) {
        perfiles.push({ ...p, esAccesoExtra: true });
      }
    }

    // Enriquecer con email
    const usuarios: UsuarioAcceso[] = [];
    for (const p of perfiles) {
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(p.id);
      usuarios.push({
        id: p.id,
        nombre: p.nombre || 'Sin nombre',
        email: authUser?.email || 'Sin email',
        rol: p.rol,
        activo: p.activo,
        esSuperAdmin: p.es_super_admin,
        esAccesoExtra: p.esAccesoExtra,
      });
    }

    usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return NextResponse.json({ usuarios });
  } catch (error: any) {
    console.error('[API Business Access GET] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// POST /api/business-access → { negocio_id, email } otorga acceso
export async function POST(request: NextRequest) {
  try {
    const user = await autenticar(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { negocio_id, email } = await request.json();
    if (!negocio_id || !email) {
      return NextResponse.json({ error: 'Faltan campos: negocio_id y email son obligatorios.' }, { status: 400 });
    }

    if (!(await puedeGestionar(user.id, negocio_id))) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar este negocio.' }, { status: 403 });
    }

    const { data: listRes, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error('[API Business Access POST] list users error:', listError);
      return NextResponse.json({ error: 'No se pudo verificar el correo.' }, { status: 500 });
    }

    const target = (listRes?.users || []).find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (!target) {
      return NextResponse.json({ error: 'No existe un usuario con ese correo.' }, { status: 404 });
    }

    const targetId = target.id;

    const { data: perfil } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', targetId)
      .maybeSingle();

    if (!perfil) {
      return NextResponse.json({ error: 'El usuario no tiene perfil asignado.' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('usuarios_negocios')
      .upsert({ user_id: targetId, negocio_id }, { onConflict: 'user_id,negocio_id' });

    if (insertError) {
      console.error('[API Business Access POST] insert error:', insertError);
      return NextResponse.json({ error: 'No se pudo otorgar el acceso.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[API Business Access POST] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// DELETE /api/business-access?negocio_id=...&user_id=...  → revoca acceso
export async function DELETE(request: NextRequest) {
  try {
    const user = await autenticar(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = request.nextUrl.searchParams.get('negocio_id');
    const targetId = request.nextUrl.searchParams.get('user_id');
    if (!negocioId || !targetId) {
      return NextResponse.json({ error: 'Faltan negocio_id y user_id' }, { status: 400 });
    }

    if (!(await puedeGestionar(user.id, negocioId))) {
      return NextResponse.json({ error: 'No tienes permisos para gestionar este negocio.' }, { status: 403 });
    }

    if (targetId === user.id) {
      return NextResponse.json({ error: 'No puedes quitarte acceso a este negocio desde aquí.' }, { status: 400 });
    }

    // 1. Eliminar fila del pivote (si existe)
    const { error: delError } = await supabaseAdmin
      .from('usuarios_negocios')
      .delete()
      .eq('user_id', targetId)
      .eq('negocio_id', negocioId);

    if (delError) {
      console.error('[API Business Access DELETE] pivote:', delError);
      return NextResponse.json({ error: 'No se pudo revocar el acceso.' }, { status: 500 });
    }

    // 2. Si el negocio que se revoca era el "actual" del usuario,
    //    moverlo a otro de sus negocios o dejarlo en NULL.
    const { data: perfil } = await supabaseAdmin
      .from('user_profiles')
      .select('negocio_id, es_super_admin')
      .eq('id', targetId)
      .maybeSingle();

    if (perfil && perfil.negocio_id === negocioId && !perfil.es_super_admin) {
      const { data: otros } = await supabaseAdmin
        .from('usuarios_negocios')
        .select('negocio_id')
        .eq('user_id', targetId)
        .limit(1);

      await supabaseAdmin
        .from('user_profiles')
        .update({ negocio_id: otros && otros.length > 0 ? otros[0].negocio_id : null })
        .eq('id', targetId);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[API Business Access DELETE] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}