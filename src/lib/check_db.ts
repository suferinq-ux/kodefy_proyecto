import { supabase } from './supabase';

async function check() {
  const { data, error } = await supabase
    .from('inventario_diario')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Last 5 inventory records:");
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
