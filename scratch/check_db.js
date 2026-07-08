const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: n } = await supabase.from('negocios').select('*');
  console.log('Negocios:', n.map(x => ({id: x.id, slug: x.slug})));
  
  const { data: s } = await supabase.from('stock_maestro_bebidas').select('*');
  console.log('Stock Maestro:', JSON.stringify(s, null, 2));
}
check();
