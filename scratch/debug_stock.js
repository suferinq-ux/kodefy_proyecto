const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- Checking Master Stock Data ---');
    // Reemplazo con el ID de Pocholo's que vi en tus archivos
    const negocioId = '3467610a-313b-466d-868d-806950e393b4'; 
    
    const { data, error } = await supabase
        .from('stock_maestro_bebidas')
        .select('*')
        .eq('negocio_id', negocioId);

    if (error) console.error('Error:', error);
    else console.log('Data found:', JSON.stringify(data, null, 2));
}

checkData();
