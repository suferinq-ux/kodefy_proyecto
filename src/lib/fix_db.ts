import { supabase } from './supabase';

async function fixDB() {
  const { data, error } = await supabase
    .from('inventario_diario')
    .update({ estado: 'cerrado', observaciones_cierre: 'Cerrado por script de correccion' })
    .eq('estado', 'abierto');

  console.log("Fix result:", data, error);
}

fixDB();
