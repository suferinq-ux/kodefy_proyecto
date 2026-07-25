-- Migración: Agregar columna piso a la tabla mesas
ALTER TABLE public.mesas ADD COLUMN IF NOT EXISTS piso INTEGER DEFAULT 1;
