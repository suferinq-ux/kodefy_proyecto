import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');

    if (!pin || pin.length !== 6) {
      return NextResponse.json(
        { error: 'PIN inválido. Debe tener 6 dígitos.' },
        { status: 400 }
      );
    }

    // Usar supabaseAdmin para bypassear RLS de forma segura en el servidor
    const { data, error } = await supabaseAdmin
      .from('negocios')
      .select('id, nombre, logo_url, color_primario, slug')
      .eq('codigo_acceso', pin)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Negocio no encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Negocio Info] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
