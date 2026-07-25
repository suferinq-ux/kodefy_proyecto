-- Solución general de políticas RLS para multitenant y Super Admins
DO $$ 
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN SELECT unnest(ARRAY['productos', 'inventario_diario', 'mesas', 'ventas', 'gastos', 'categorias', 'configuracion_negocio'])
  LOOP
    EXECUTE format('
      ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "%1$s_permitir_todo" ON public.%1$s;
      DROP POLICY IF EXISTS "%1$s master access" ON public.%1$s;
      DROP POLICY IF EXISTS "Users can insert own %1$s" ON public.%1$s;
      DROP POLICY IF EXISTS "Users can update own %1$s" ON public.%1$s;
      DROP POLICY IF EXISTS "Users can delete own %1$s" ON public.%1$s;
      DROP POLICY IF EXISTS "Users can select own %1$s" ON public.%1$s;
      DROP POLICY IF EXISTS "Super admins can read all %1$s" ON public.%1$s;

      CREATE POLICY "%1$s_permitir_todo" ON public.%1$s
      FOR ALL TO authenticated
      USING (
        negocio_id = public.get_user_negocio_id() 
        OR (SELECT es_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
      )
      WITH CHECK (
        negocio_id = public.get_user_negocio_id() 
        OR (SELECT es_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
      );
    ', tbl_name);
  END LOOP;
END $$;
