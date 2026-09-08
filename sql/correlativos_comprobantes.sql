-- ============================================================
-- KODEFY: Correlativos de comprobantes (ticket / boleta / factura)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabla de correlativos (independiente por negocio y por tipo)
CREATE TABLE IF NOT EXISTS public.correlativos_comprobantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ticket', 'boleta', 'factura')),
    serie TEXT NOT NULL DEFAULT '',
    numero_actual BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (negocio_id, tipo)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_correlativos_negocio_tipo
ON public.correlativos_comprobantes (negocio_id, tipo);

-- 2. Garantizar las columnas de serie/correlativo en configuracion_negocio
ALTER TABLE public.configuracion_negocio
    ADD COLUMN IF NOT EXISTS serie_boleta TEXT,
    ADD COLUMN IF NOT EXISTS numero_correlativo BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS serie_ticket TEXT,
    ADD COLUMN IF NOT EXISTS numero_ticket BIGINT DEFAULT 0;

-- 3. Sembrar desde los valores actuales de configuracion_negocio
INSERT INTO public.correlativos_comprobantes (negocio_id, tipo, serie, numero_actual)
SELECT negocio_id, 'ticket', COALESCE(NULLIF(serie_ticket, ''), 'TK001'), COALESCE(numero_ticket, 0)
FROM public.configuracion_negocio
ON CONFLICT (negocio_id, tipo) DO NOTHING;

INSERT INTO public.correlativos_comprobantes (negocio_id, tipo, serie, numero_actual)
SELECT negocio_id, 'boleta', COALESCE(NULLIF(serie_boleta, ''), 'B001'), COALESCE(numero_correlativo, 0)
FROM public.configuracion_negocio
ON CONFLICT (negocio_id, tipo) DO NOTHING;

INSERT INTO public.correlativos_comprobantes (negocio_id, tipo, serie, numero_actual)
SELECT negocio_id, 'factura', 'F001', 0
FROM public.configuracion_negocio
ON CONFLICT (negocio_id, tipo) DO NOTHING;

-- 4. Guardar el comprobante emitido en cada venta (ticket/boleta/factura)
ALTER TABLE public.ventas
    ADD COLUMN IF NOT EXISTS comprobante_tipo TEXT,
    ADD COLUMN IF NOT EXISTS comprobante_serie TEXT,
    ADD COLUMN IF NOT EXISTS comprobante_numero BIGINT;

-- 5. RLS: solo lecturas/escrituras vía funciones (service_role y definer)
ALTER TABLE public.correlativos_comprobantes ENABLE ROW LEVEL SECURITY;

-- 6. Función: consultar el correlativo actual (sin avanzar)
CREATE OR REPLACE FUNCTION public.consultar_correlativo(p_negocio UUID, p_tipo TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_serie TEXT;
    v_numero BIGINT;
BEGIN
    IF p_negocio <> public.get_user_negocio_id() AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Negocio no permitido';
    END IF;

    SELECT COALESCE(c.serie, ''),
           COALESCE(c.numero_actual, 0)
      INTO v_serie, v_numero
      FROM public.correlativos_comprobantes c
     WHERE c.negocio_id = p_negocio
       AND c.tipo = p_tipo;

    IF NOT FOUND THEN
        v_serie := CASE p_tipo WHEN 'boleta' THEN 'B001' WHEN 'factura' THEN 'F001' ELSE 'TK001' END;
        v_numero := 0;
    END IF;

    RETURN jsonb_build_object('serie', v_serie, 'numero', v_numero);
END $$;

-- 7. Función: avanzar en 1 el correlativo y devolver el número usado
--    (atómico: con FOR UPDATE para evitar duplicados entre cajeros)
CREATE OR REPLACE FUNCTION public.obtener_correlativo(p_negocio UUID, p_tipo TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_serie TEXT;
    v_numero BIGINT;
BEGIN
    IF p_negocio <> public.get_user_negocio_id() AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Negocio no permitido';
    END IF;

    SELECT COALESCE(c.serie, ''), COALESCE(c.numero_actual, 0)
      INTO v_serie, v_numero
      FROM public.correlativos_comprobantes c
     WHERE c.negocio_id = p_negocio
       AND c.tipo = p_tipo
       FOR UPDATE;

    IF NOT FOUND THEN
        v_serie := CASE p_tipo WHEN 'boleta' THEN 'B001' WHEN 'factura' THEN 'F001' ELSE 'TK001' END;
        v_numero := 0;
        EXECUTE 'INSERT INTO public.correlativos_comprobantes (negocio_id, tipo, serie, numero_actual) VALUES ($1, $2, $3, 0)'
            USING p_negocio, p_tipo, v_serie;
    END IF;

    v_numero := v_numero + 1;

    UPDATE public.correlativos_comprobantes
       SET numero_actual = v_numero, updated_at = NOW()
     WHERE negocio_id = p_negocio
       AND tipo = p_tipo;

    RETURN jsonb_build_object('serie', v_serie, 'numero', v_numero);
END $$;

-- 8. Restringir ejecución: solo usuarios autenticados (no anónimo)
REVOKE ALL ON FUNCTION public.consultar_correlativo(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_correlativo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consultar_correlativo(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.obtener_correlativo(UUID, TEXT) TO authenticated, service_role;

-- ✅ Verificación
SELECT negocio_id, tipo, serie, numero_actual
FROM public.correlativos_comprobantes
ORDER BY negocio_id, tipo;