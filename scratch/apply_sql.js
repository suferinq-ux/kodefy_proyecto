const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
    const sql = `
    CREATE TABLE IF NOT EXISTS stock_maestro_bebidas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
        stock JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(negocio_id)
    );

    ALTER TABLE stock_maestro_bebidas ENABLE ROW LEVEL SECURITY;

    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own business stock') THEN
            CREATE POLICY "Users can view their own business stock" 
            ON stock_maestro_bebidas FOR SELECT 
            USING (negocio_id IN (SELECT negocio_id FROM perfiles WHERE id = auth.uid()));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own business stock') THEN
            CREATE POLICY "Users can update their own business stock" 
            ON stock_maestro_bebidas FOR ALL 
            USING (negocio_id IN (SELECT negocio_id FROM perfiles WHERE id = auth.uid()));
        END IF;
    END $$;
    `;

    console.log('Applying SQL via RPC...');
    // If you don't have an exec_sql RPC, we might need another way or just assume the user applies it.
    // However, I'll try to use a direct insert to test if the table exists first.
    const { error } = await supabase.from('stock_maestro_bebidas').select('id').limit(1);
    if (error && error.code === 'PGRST116') {
        console.log('Table seems missing or empty. Please apply the SQL in d:\\02\\KODEFY_SAAS\\kodefy_saas\\sql\\setup_master_stock.sql manually in Supabase Dashboard.');
    } else {
        console.log('Table is ready or error was not table-missing.');
    }
}

runSql();
