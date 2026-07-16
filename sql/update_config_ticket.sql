-- SQL para actualizar la configuración del negocio para Ticket de Control Interno
-- Ejecutar en Supabase > SQL Editor

-- 1. ACTUALIZAR CONFIGURACIÓN DEL NEGOCIO
UPDATE configuracion_negocio
SET 
    razon_social = "Rodrigo's - Brasas & Broasters CHICKEN",
    ruc = '10700899948',
    direccion = 'JR. HUASCAR 422',
    ciudad = 'AYACUCHO - HUAMANGA',
    telefono = '',
    mensaje_boleta = 'Gracias por su preferencia',
    serie_ticket = 'TK001',
    numero_ticket = 1,
    serie_boleta = 'B001',
    numero_correlativo = 0
WHERE id = 1;

-- 2. CREAR TABLA DE NUMERACIÓN DE TICKETS si no existe
CREATE TABLE IF NOT EXISTS numeracion_tickets (
    id SERIAL PRIMARY KEY,
    serie VARCHAR(10) NOT NULL DEFAULT 'TK001',
    correlativo INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INSERTAR NUMERACIÓN INICIAL si está vacía
INSERT INTO numeracion_tickets (serie, correlativo)
SELECT 'TK001', 1
WHERE NOT EXISTS (SELECT 1 FROM numeracion_tickets LIMIT 1);

-- 4. VERIFICAR LOS DATOS
SELECT * FROM configuracion_negocio;
SELECT * FROM numeracion_tickets;
