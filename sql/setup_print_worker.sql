-- ============================================================
-- KODEFY: Migración para Sistema de Impresión Local (Worker)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/okzncqmhjvsrdhluwuhx/sql/new
-- ============================================================

-- 1. Asegurar que la columna estado_impresion existe en ventas
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS estado_impresion TEXT DEFAULT 'pendiente'
CHECK (estado_impresion IN ('pendiente', 'impreso', 'error'));

-- 2. Crear tabla configuracion_impresoras si no existe
CREATE TABLE IF NOT EXISTS configuracion_impresoras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('cocina', 'caja', 'bar')),
    ip_address TEXT NOT NULL,
    puerto INTEGER DEFAULT 9100,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índice para búsqueda rápida por negocio
CREATE INDEX IF NOT EXISTS idx_configuracion_impresoras_negocio
ON configuracion_impresoras(negocio_id);

-- 4. Índice para búsqueda de ventas pendientes de impresión
CREATE INDEX IF NOT EXISTS idx_ventas_estado_impresion
ON ventas(negocio_id, estado_impresion)
WHERE estado_impresion = 'pendiente';

-- 5. Habilitar Realtime para la tabla ventas
-- (Permite que el Worker reciba notificaciones instantáneas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ya estaba en la publicación
END $$;

-- 6. Réplica completa para que el Worker reciba el estado anterior en UPDATEs
-- (Necesario para detectar cuándo cambia de 'error' a 'pendiente' al reintentar)
ALTER TABLE ventas REPLICA IDENTITY FULL;

-- 7. RLS: Permitir al service_role leer y actualizar ventas
-- (El Worker usa la SERVICE_KEY, no la anon key)
-- Nota: Supabase service_role bypasa RLS por defecto, así que esto es solo por claridad.

-- 8. Política para que el Worker pueda actualizar estado_impresion
-- (Si tienes RLS activado en ventas, añade esta política)
DO $$
BEGIN
    DROP POLICY IF EXISTS "worker_update_print_status" ON ventas;
    CREATE POLICY "worker_update_print_status"
    ON ventas FOR UPDATE
    USING (TRUE)
    WITH CHECK (TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo crear política RLS (puede que RLS no esté activo): %', SQLERRM;
END $$;

-- ✅ Verificación final
SELECT 
    'ventas' as tabla,
    COUNT(*) as filas_pendientes
FROM ventas 
WHERE estado_impresion = 'pendiente';

SELECT 
    'configuracion_impresoras' as tabla,
    COUNT(*) as impresoras_registradas
FROM configuracion_impresoras;
