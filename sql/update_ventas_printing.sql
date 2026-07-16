-- Añadir columnas para control de impresión de recibos y tickets
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS ticket_impreso BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS precuenta_pedida_timestamp TIMESTAMP WITH TIME ZONE;
