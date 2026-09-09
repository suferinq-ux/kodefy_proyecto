-- ==========================================
-- KODEFY TECH SAAS - ANULACIONES SCHEMA
-- ==========================================

-- Table: anulaciones
-- Registra los pedidos eliminados (auditoría)
CREATE TABLE IF NOT EXISTS public.anulaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    venta_id UUID,  -- Referencia informativa (la venta se elimina)
    usuario_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    usuario_nombre TEXT NOT NULL,
    motivo TEXT NOT NULL,  -- Justificación obligatoria
    monto_original NUMERIC(10,2) NOT NULL,
    items JSONB NOT NULL,  -- Snapshot de los items del pedido
    tipo_pedido TEXT,  -- mesa, llevar, delivery
    mesa_numero INTEGER,  -- Número de mesa si aplica
    fecha_venta TEXT,  -- Fecha original de la venta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.anulaciones ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Super Admins can read all anulaciones
CREATE POLICY "Super admins can read all anulaciones" ON public.anulaciones
  FOR SELECT TO authenticated
  USING (is_super_admin());

-- Only admins can read anulaciones from their business
CREATE POLICY "Admins can read own anulaciones" ON public.anulaciones
  FOR SELECT TO authenticated
  USING (
    negocio_id = get_user_negocio_id() 
    AND (SELECT rol FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Any authenticated user can insert (when deleting an order)
CREATE POLICY "Users can insert own anulaciones" ON public.anulaciones
  FOR INSERT TO authenticated
  WITH CHECK (negocio_id = get_user_negocio_id());

-- Super Admins can delete anulaciones
CREATE POLICY "Super admins can delete anulaciones" ON public.anulaciones
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- Admins can delete anulaciones from their business
CREATE POLICY "Admins can delete own anulaciones" ON public.anulaciones
  FOR DELETE TO authenticated
  USING (
    negocio_id = get_user_negocio_id()
    AND (SELECT rol FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
  );

-- Add to Realtime Publication (if needed for live updates on the audit page)
-- ALTER PUBLICATION supabase_realtime ADD TABLE anulaciones;
