import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { userId, userAgent } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID es requerido.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('login_sessions')
      .insert({
        user_id: userId,
        user_agent: userAgent || 'Dispositivo desconocido',
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Create Session] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear la sesión de autorización.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de sesión es requerido.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('login_sessions')
      .select('status')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Sesión no encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Get Session] Error:', error);
    return NextResponse.json(
      { error: 'Error al consultar el estado de la sesión.' },
      { status: 500 }
    );
  }
}
