-- Asegurar aislamiento en tablas de estadísticas

DO $$ 
BEGIN 
    -- 1. estadisticas_productos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estadisticas_productos' AND column_name = 'negocio_id') THEN
        ALTER TABLE public.estadisticas_productos ADD COLUMN negocio_id UUID REFERENCES public.negocios(id);
        
        -- Asignar a un negocio por defecto si es necesario (ej: el primero)
        UPDATE public.estadisticas_productos SET negocio_id = (SELECT id FROM public.negocios LIMIT 1) WHERE negocio_id IS NULL;
    END IF;

    -- Activar RLS
    ALTER TABLE public.estadisticas_productos ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "estadisticas_productos aislam" ON public.estadisticas_productos;
    CREATE POLICY "estadisticas_productos aislam" ON public.estadisticas_productos 
    FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());

END $$;
