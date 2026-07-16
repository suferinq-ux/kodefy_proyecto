-- Habilitar Realtime para la tabla 'ventas'
-- Ejecuta este código en el SQL Editor de Supabase (https://supabase.com/dashboard/project/bfzeqbicuckvpgnwmjjo/sql/new)

-- 1. Aseguramos que la publicación para tiempo real exista
-- Nota: Supabase suele crearla automáticamente, pero esto asegura que esté configurada.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Añadimos la tabla 'ventas' a la publicación de tiempo real
-- Si ya está añadida, esto podría dar error, así que usamos un bloque seguro.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ya estaba en la publicación
END $$;

-- 3. (Opcional) Configurar réplica completa para obtener datos previos en actualizaciones
-- Esto es útil para comparar qué items son nuevos, pero por ahora solo habilitamos la notificación.
ALTER TABLE ventas REPLICA IDENTITY FULL;
