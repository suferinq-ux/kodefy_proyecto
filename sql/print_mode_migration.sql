-- Añadir columna para modo de impresión
ALTER TABLE configuracion_negocio 
ADD COLUMN IF NOT EXISTS modo_impresion TEXT DEFAULT 'red'; -- 'red' o 'bluetooth'
