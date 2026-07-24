import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.delete({ name, ...options }); } catch {}
        },
      },
    }
  );
}

async function checkSuperAdmin(supabase: any, request: Request) {
  try {
    const loginToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    let user: any = null;
    if (loginToken) {
      const { data: { user: u } } = await supabase.auth.getUser(loginToken);
      user = u;
    } else {
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    }
    if (!user) return { success: false, error: 'No hay sesión activa' };

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('es_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.es_super_admin) return { success: false, error: 'Acceso solo para Super Admin' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// GET: Listar usuarios de un negocio específico
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseClient();
  const check = await checkSuperAdmin(supabase, request);
  if (!check.success) return NextResponse.json({ error: check.error }, { status: 403 });

  const { id: negocioId } = await params;

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('negocio_id', negocioId)
      .order('nombre', { ascending: true });

    if (error) throw error;

    const enriched = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        return { ...profile, email: authUser?.email || 'Sin email' };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear usuario en un negocio específico
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseClient();
  const check = await checkSuperAdmin(supabase, request);
  if (!check.success) return NextResponse.json({ error: check.error }, { status: 403 });

  const { id: negocioId } = await params;

  try {
    const { email, password, nombre, rol } = await request.json();

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });

    if (authError || !authData.user) throw authError || new Error('Error al crear usuario');

    const { error: profileError } = await supabaseAdmin.from('user_profiles').upsert({
      id: authData.user.id,
      negocio_id: negocioId,
      nombre,
      rol,
      activo: true,
      es_super_admin: false,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({ message: 'Usuario creado correctamente', user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Actualizar usuario (nombre, rol, password, activo)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseClient();
  const check = await checkSuperAdmin(supabase, request);
  if (!check.success) return NextResponse.json({ error: check.error }, { status: 403 });

  try {
    const { id, email, password, nombre, rol, activo } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });

    // Actualizar Auth
    const updateData: any = {};
    if (password) updateData.password = password;
    if (email) updateData.email = email;
    if (nombre) updateData.user_metadata = { nombre };

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
      if (authError) throw authError;
    }

    // Actualizar Perfil
    const profileUpdate: any = {};
    if (nombre) profileUpdate.nombre = nombre;
    if (rol) profileUpdate.rol = rol;
    if (activo !== undefined) profileUpdate.activo = activo;

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update(profileUpdate)
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ message: 'Usuario actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar usuario
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseClient();
  const check = await checkSuperAdmin(supabase, request);
  if (!check.success) return NextResponse.json({ error: check.error }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    await supabaseAdmin.from('user_profiles').delete().eq('id', userId);

    return NextResponse.json({ message: 'Usuario eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
