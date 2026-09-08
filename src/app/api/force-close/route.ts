import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('inventario_diario')
    .update({ 
      estado: 'cerrado', 
      observaciones_cierre: 'Cierre forzado'
    })
    .eq('estado', 'abierto')
    .select();

  return NextResponse.json({
    success: !error,
    updated_rows: data?.length || 0,
    data,
    error
  });
}
