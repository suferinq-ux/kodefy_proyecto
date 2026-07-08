
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNegocios() {
  const { data, error } = await supabase.from('negocios').select('id, nombre, slug');
  if (error) {
    console.error('Error fetching negocios:', error);
  } else {
    console.log('Negocios:', JSON.stringify(data, null, 2));
  }
}

checkNegocios();
