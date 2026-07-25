-- Migración: Agregar columnas para comanda adicional de cocina
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS items_adicionales JSONB;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN DEFAULT false;
