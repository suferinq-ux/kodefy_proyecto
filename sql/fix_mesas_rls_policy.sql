-- Migración RLS: Permitir creación, edición y eliminación de mesas a Admins de Local y Super Admins
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own mesas" ON public.mesas;
DROP POLICY IF EXISTS "Users can update own mesas" ON public.mesas;
DROP POLICY IF EXISTS "Users can delete own mesas" ON public.mesas;
DROP POLICY IF EXISTS "Users can select own mesas" ON public.mesas;
DROP POLICY IF EXISTS "Super admins can read all mesas" ON public.mesas;
DROP POLICY IF EXISTS "mesas master access" ON public.mesas;
DROP POLICY IF EXISTS "mesas_permitir_todo" ON public.mesas;

CREATE POLICY "mesas_permitir_todo" ON public.mesas
FOR ALL TO authenticated
USING (
    negocio_id = public.get_user_negocio_id() 
    OR (SELECT es_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
    negocio_id = public.get_user_negocio_id() 
    OR (SELECT es_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
);
