import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: inv, error: invError } = await supabase
    .from('inventario_diario')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: ventas, error: ventasError } = await supabase
    .from('ventas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    inventario: inv,
    invError,
    ventas: ventas,
    ventasError
  });
}
