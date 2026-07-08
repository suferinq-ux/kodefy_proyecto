import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
        'Faltan las variables de entorno de Supabase Admin. ' +
        'Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local'
    );
}

// Cliente con SERVICE_ROLE_KEY para bypass de RLS y uso de AUTH ADMIN API
// SOLO USAR EN EL LADO DEL SERVIDOR (API Routes o Server Actions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
