-- ==========================================
-- FIX MISSING TABLES FOR KODEFY SAAS
-- ==========================================

-- 1. Create categorias table
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Add categoria_id to productos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='categoria_id') THEN
        ALTER TABLE public.productos ADD COLUMN categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create configuracion_negocio table (used in ReceiptModal and POS)
CREATE TABLE IF NOT EXISTS public.configuracion_negocio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre_negocio TEXT,
    telefono TEXT,
    ip_impresora_caja TEXT,
    ip_impresora_cocina TEXT,
    modo_impresion TEXT DEFAULT 'red' CHECK (modo_impresion IN ('red', 'pos')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(negocio_id)
);

-- 4. Enable RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Categories
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias' AND policyname = 'Users can select own categorias') THEN
        CREATE POLICY "Users can select own categorias" ON public.categorias FOR SELECT TO authenticated USING (negocio_id = get_user_negocio_id());
        CREATE POLICY "Users can insert own categorias" ON public.categorias FOR INSERT TO authenticated WITH CHECK (negocio_id = get_user_negocio_id());
        CREATE POLICY "Users can update own categorias" ON public.categorias FOR UPDATE TO authenticated USING (negocio_id = get_user_negocio_id()) WITH CHECK (negocio_id = get_user_negocio_id());
        CREATE POLICY "Users can delete own categorias" ON public.categorias FOR DELETE TO authenticated USING (negocio_id = get_user_negocio_id());
    END IF;
END $$;

-- Config
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracion_negocio' AND policyname = 'Users can select own config') THEN
        CREATE POLICY "Users can select own config" ON public.configuracion_negocio FOR SELECT TO authenticated USING (negocio_id = get_user_negocio_id());
        CREATE POLICY "Users can manage own config" ON public.configuracion_negocio FOR ALL TO authenticated USING (negocio_id = get_user_negocio_id()) WITH CHECK (negocio_id = get_user_negocio_id());
    END IF;
END $$;
