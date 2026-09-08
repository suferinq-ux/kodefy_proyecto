-- ============================================================
-- MULTI-NEGOCIO
-- Permite que un usuario pueda acceder a varios negocios.
-- Tabla pivote usuarios_negocios (user_id -> negocio_id)
-- ============================================================

-- 1. Tabla pivote: un usuario puede tener varias filas (una por negocio)
CREATE TABLE IF NOT EXISTS public.usuarios_negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_usuario_negocio UNIQUE (user_id, negocio_id)
);

-- 2. Seed: el negocio actual de cada usuario tambien queda registrado
--    como acceso, para no perderle el rastro cuando cambie de local.
INSERT INTO public.usuarios_negocios (user_id, negocio_id)
SELECT id, negocio_id FROM public.user_profiles
WHERE negocio_id IS NOT NULL
ON CONFLICT (user_id, negocio_id) DO NOTHING;

-- 3. RLS
ALTER TABLE public.usuarios_negocios ENABLE ROW LEVEL SECURITY;

-- Solo el propio usuario puede LEER sus accesos. Las escrituras se
-- hacen por el backend (service role) via la API /api/business-access.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios_negocios' AND policyname = 'Usuarios leen sus propios accesos') THEN
        CREATE POLICY "Usuarios leen sus propios accesos" ON public.usuarios_negocios
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios_negocios' AND policyname = 'Super admins leen todos los accesos') THEN
        CREATE POLICY "Super admins leen todos los accesos" ON public.usuarios_negocios
            FOR SELECT TO authenticated
            USING (public.is_super_admin());
    END IF;
END $$;

-- 4. Helly: funcion para saber si el usuario actual pertenece a un negocio
--    (usada por futuras politicas RLS si se necesita).
CREATE OR REPLACE FUNCTION public.usuario_accede_a_negocio(p_negocio UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios_negocios
        WHERE user_id = auth.uid() AND negocio_id = p_negocio
    ) OR public.is_super_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Index auxiliar para consultas por negocio
CREATE INDEX IF NOT EXISTS idx_usuarios_negocios_negocio ON public.usuarios_negocios(negocio_id);