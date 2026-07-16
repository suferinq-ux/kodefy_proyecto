import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado. Token no proporcionado.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Validar token de usuario usando supabaseAdmin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido o expirado.' },
        { status: 401 }
      );
    }

    // Verificar si es super admin en user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('es_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.es_super_admin) {
      return NextResponse.json(
        { error: 'No tienes permisos de administrador.' },
        { status: 403 }
      );
    }

    // Obtener parámetros del cuerpo de la petición
    const { sessionId, status } = await request.json();

    if (!sessionId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos.' },
        { status: 400 }
      );
    }

    // Actualizar la sesión
    const { error: updateError } = await supabaseAdmin
      .from('login_sessions')
      .update({ status })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Approve Session] Error:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la autorización.' },
      { status: 500 }
    );
  }
}
