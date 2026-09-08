-- 1. Agregar campos de Facturación a Configuracion del Negocio
ALTER TABLE public.configuracion_negocio
ADD COLUMN IF NOT EXISTS sunat_ruc VARCHAR(11),
ADD COLUMN IF NOT EXISTS sunat_razon_social VARCHAR(255),
ADD COLUMN IF NOT EXISTS sunat_nombre_comercial VARCHAR(255),
ADD COLUMN IF NOT EXISTS sunat_direccion VARCHAR(255),
ADD COLUMN IF NOT EXISTS sunat_ubigeo VARCHAR(6),
ADD COLUMN IF NOT EXISTS sunat_distrito VARCHAR(100),
ADD COLUMN IF NOT EXISTS sunat_provincia VARCHAR(100),
ADD COLUMN IF NOT EXISTS sunat_departamento VARCHAR(100),
ADD COLUMN IF NOT EXISTS sunat_usuario_sol VARCHAR(50),
ADD COLUMN IF NOT EXISTS sunat_clave_sol VARCHAR(50),
ADD COLUMN IF NOT EXISTS apiperu_facturacion_token TEXT,
ADD COLUMN IF NOT EXISTS facturacion_entorno VARCHAR(10) DEFAULT 'beta';

-- 2. Tabla para controlar las Series y Correlativos
CREATE TABLE IF NOT EXISTS public.series_comprobantes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    tipo_comprobante VARCHAR(20) NOT NULL,
    serie VARCHAR(4) NOT NULL,
    correlativo_actual INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(negocio_id, serie)
);

ALTER TABLE public.series_comprobantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "series master access" ON public.series_comprobantes;
CREATE POLICY "series master access" ON public.series_comprobantes 
FOR ALL USING (negocio_id = public.get_user_negocio_id() OR (SELECT es_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true);

-- 3. Agregar campos de Facturación Electrónica a las Ventas
ALTER TABLE public.ventas
ADD COLUMN IF NOT EXISTS tipo_comprobante VARCHAR(20) DEFAULT 'TICKET',
ADD COLUMN IF NOT EXISTS serie_comprobante VARCHAR(4),
ADD COLUMN IF NOT EXISTS numero_comprobante INTEGER,
ADD COLUMN IF NOT EXISTS cliente_documento_tipo VARCHAR(1),
ADD COLUMN IF NOT EXISTS cliente_documento_numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255),
ADD COLUMN IF NOT EXISTS cliente_direccion VARCHAR(255),
ADD COLUMN IF NOT EXISTS sunat_estado VARCHAR(20) DEFAULT 'NO_ENVIADO',
ADD COLUMN IF NOT EXISTS sunat_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sunat_xml_url TEXT,
ADD COLUMN IF NOT EXISTS sunat_cdr_url TEXT,
ADD COLUMN IF NOT EXISTS sunat_hash TEXT,
ADD COLUMN IF NOT EXISTS sunat_errores JSONB;

CREATE INDEX IF NOT EXISTS idx_ventas_comprobante ON public.ventas(negocio_id, serie_comprobante, numero_comprobante);
