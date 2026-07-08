const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables_info'); // if exists
    if (error) {
        // Fallback: try common names
        const tables = ['perfiles', 'usuarios', 'users', 'empleados', 'negocios'];
        for (const t of tables) {
            const { error: te } = await supabase.from(t).select('id').limit(1);
            console.log(`Table "${t}": ${te ? 'MISSING (' + te.code + ')' : 'EXISTS'}`);
        }
    } else {
        console.log(data);
    }
}

listTables();
