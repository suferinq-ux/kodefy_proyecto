const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking catalogo_bebidas ---');
    const { data: catData, error: catError } = await supabase.from('catalogo_bebidas').select('*').limit(1);
    if (catError) console.error('Error catalogo_bebidas:', catError);
    else console.log('catalogo_bebidas columns:', Object.keys(catData[0] || {}));

    console.log('--- Checking productos ---');
    const { data: prodData, error: prodError } = await supabase.from('productos').select('*').limit(1);
    if (prodError) console.error('Error productos:', prodError);
    else console.log('productos columns:', Object.keys(prodData[0] || {}));
}

checkTables();
