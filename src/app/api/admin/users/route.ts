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
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Ignorado en API Routes / Server Components
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch (error) {
                        // Ignorado en API Routes / Server Components
                    }
                },
            },
        }
    );
}

// Verificar si el usuario es administrador
async function checkAdmin(supabase: any, request: Request) {
    try {
        let user: any = null;
        let authError: any = null;
        
        const loginToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        
        if (loginToken) {
            const { data: { user: authUser }, error: err } = await supabase.auth.getUser(loginToken);
            user = authUser;
            authError = err;
        } else {
            const { data: { user: authUser }, error: err } = await supabase.auth.getUser();
            user = authUser;
            authError = err;
        }

        if (authError) return { success: false, error: `Error de Auth: ${authError.message}` };
        if (!user) return { success: false, error: 'No se encontr\u00f3 sesi\u00f3n de usuario (Auth session missing)' };

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('rol, negocio_id, es_super_admin')
            .eq('id', user.id)
            .single();

        if (profileError) return { success: false, error: `Error de Perfil: ${profileError.message}` };
        if (!profile) return { success: false, error: 'No se encontr\u00f3 perfil de usuario' };
        if (profile.rol !== 'admin' && !profile.es_super_admin) return { success: false, error: `Rol insuficiente: ${profile.rol}` };

        return { success: true, negocio_id: profile.negocio_id, es_super_admin: profile.es_super_admin };
    } catch (err: any) {
        return { success: false, error: `Error interno: ${err.message}` };
    }
}

// GET: Listar usuarios del negocio (con email de auth.users)
export async function GET(request: Request) {
    const supabase = await getSupabaseClient();

    const adminCheck = await checkAdmin(supabase, request);
    if (!adminCheck.success) {
        return NextResponse.json({ error: `Acceso denegado: ${adminCheck.error}` }, { status: 403 });
    }

    try {
        // Traer perfiles del mismo negocio
        let query = supabaseAdmin
            .from('user_profiles')
            .select('*')
            .order('rol', { ascending: true })
            .order('nombre', { ascending: true });

        if (adminCheck.negocio_id) {
            query = query.eq('negocio_id', adminCheck.negocio_id);
        }

        const { data: profiles, error } = await query;
        if (error) throw error;

        // Enriquecer con emails de auth.users
        const enriched = await Promise.all(
            (profiles || []).map(async (profile) => {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
                return {
                    ...profile,
                    email: authUser?.email || 'Sin email',
                };
            })
        );

        return NextResponse.json(enriched);
    } catch (error: any) {
        console.error('Error in GET /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Crear nuevo usuario
export async function POST(request: Request) {
    const supabase = await getSupabaseClient();

    const adminCheck = await checkAdmin(supabase, request);
    if (!adminCheck.success) {
        return NextResponse.json({ error: `Acceso denegado: ${adminCheck.error}` }, { status: 403 });
    }

    try {
        const { email, password, nombre, rol } = await request.json();

        if (!email || !password || !nombre || !rol) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
        }

        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nombre }
        });

        if (authError || !authData.user) {
            throw authError || new Error('Error al crear usuario en Auth');
        }

        // 2. Crear perfil en user_profiles con el negocio_id del admin que lo crea
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: authData.user.id,
                negocio_id: adminCheck.negocio_id || null,
                nombre,
                rol,
                activo: true,
                es_super_admin: false
            });

        if (profileError) {
            // Si falla el perfil, intentamos limpiar el auth para no dejar huérfanos
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return NextResponse.json({ message: 'Usuario creado correctamente', user: authData.user });
    } catch (error: any) {
        console.error('Error in POST /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Actualizar usuario (nombre, rol, contraseña)
export async function PUT(request: Request) {
    const supabase = await getSupabaseClient();

    const adminCheck = await checkAdmin(supabase, request);
    if (!adminCheck.success) {
        return NextResponse.json({ error: `Acceso denegado: ${adminCheck.error}` }, { status: 403 });
    }

    try {
        const { id, email, password, nombre, rol } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        // 1. Actualizar Auth (si hay nueva contraseña o email)
        const updateData: any = {};
        if (password) updateData.password = password;
        if (email) updateData.email = email;
        if (nombre) updateData.user_metadata = { nombre };

        if (Object.keys(updateData).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
            if (authError) throw authError;
        }

        // 2. Actualizar Perfil (no email, vive solo en auth.users)
        const profileUpdate: any = {};
        if (nombre) profileUpdate.nombre = nombre;
        if (rol) profileUpdate.rol = rol;

        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .update(profileUpdate)
            .eq('id', id);

        if (profileError) throw profileError;

        return NextResponse.json({ message: 'Usuario actualizado correctamente' });
    } catch (error: any) {
        console.error('Error in PUT /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Eliminar usuario
export async function DELETE(request: Request) {
    const supabase = await getSupabaseClient();

    const adminCheck = await checkAdmin(supabase, request);
    if (!adminCheck.success) {
        return NextResponse.json({ error: `Acceso denegado: ${adminCheck.error}` }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
        }

        // 1. Eliminar de Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;

        // 2. Eliminar de Perfil (usualmente cascada, pero aseguramos)
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('id', id);

        if (profileError) throw profileError;

        return NextResponse.json({ message: 'Usuario eliminado correctamente' });
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
