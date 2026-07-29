-- ======================================================
-- KODEFY TECH SAAS - MULTI-TENANT WHATSAPP AI AGENT SCHEMA
-- ======================================================

-- 1. TABLA: whatsapp_config
-- Almacena las credenciales de WhatsApp Business y ajustes del Bot por cada inquilino (tenant)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL UNIQUE REFERENCES public.negocios(id) ON DELETE CASCADE,
    phone_number_id TEXT, -- ID de número telefónico en Meta Cloud API
    waba_id TEXT, -- WhatsApp Business Account ID
    access_token TEXT, -- Token de acceso de Meta
    verify_token TEXT DEFAULT 'kodefy_wa_verify_secret', -- Token para validación de webhook
    
    -- Interruptores de Bot y Modos de Operación
    bot_activo BOOLEAN DEFAULT true,
    modo_delivery BOOLEAN DEFAULT true,
    modo_recojo BOOLEAN DEFAULT true,
    modo_mesa BOOLEAN DEFAULT true,
    modo_reserva BOOLEAN DEFAULT true,
    modo_antifraude_comprobante BOOLEAN DEFAULT true,
    
    -- Ajustes de Personalidad e IA
    nombre_asistente TEXT DEFAULT 'Asistente Virtual',
    mensaje_bienvenida TEXT DEFAULT '¡Hola! Bienvenid@ a nuestro negocio. 🤖¿En qué te puedo ayudar hoy?',
    prompt_personalizado TEXT DEFAULT 'Eres un amable asistente de atención al cliente y toma de pedidos. Responde de forma breve, respetuosa y profesional.',
    costo_delivery_fijo NUMERIC(10,2) DEFAULT 0.00,
    
    -- Datos de Pago de Yape / Plin / Cuentas Bancarias
    numero_yape_plin TEXT,
    nombre_titular_yape_plin TEXT,
    qr_yape_plin_url TEXT,
    datos_cuenta_bancaria TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- MIGRACIÓN / ADD COLUMNS (Si la tabla ya existía previamente)
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS numero_yape_plin TEXT;
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS nombre_titular_yape_plin TEXT;
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS qr_yape_plin_url TEXT;
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS datos_cuenta_bancaria TEXT;

-- 2. TABLA: whatsapp_conversaciones
-- Registra los hilos de conversación de WhatsApp por cliente y estado de sesión
CREATE TABLE IF NOT EXISTS public.whatsapp_conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    telefono_cliente TEXT NOT NULL,
    nombre_cliente TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado_humano', 'cerrado', 'bloqueado_fraude')),
    
    -- Contexto guardado para el modelo de IA (historial breve)
    contexto_conversacion JSONB DEFAULT '[]'::jsonb,
    
    -- Borrador del pedido actual antes de confirmarse
    orden_borrador JSONB DEFAULT '{}'::jsonb,
    
    ultima_interaccion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    
    UNIQUE(negocio_id, telefono_cliente)
);

-- 3. TABLA: whatsapp_mensajes
-- Registro completo de cada mensaje individual para el chat en vivo en el Dashboard
CREATE TABLE IF NOT EXISTS public.whatsapp_mensajes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL REFERENCES public.whatsapp_conversaciones(id) ON DELETE CASCADE,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    emisor TEXT NOT NULL CHECK (emisor IN ('cliente', 'bot', 'agente_humano')),
    contenido TEXT NOT NULL,
    media_url TEXT,
    media_tipo TEXT, -- 'imagen', 'audio', 'documento'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. TABLA: whatsapp_comprobantes_registrados (REGISTRO ANTI-REUSO Y ANTI-DUPLICADOS)
CREATE TABLE IF NOT EXISTS public.whatsapp_comprobantes_registrados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    numero_operacion TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    app_pago TEXT,
    telefono_cliente TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(negocio_id, numero_operacion)
);

-- 5. TABLA: whatsapp_blacklist (LISTA NEGRA ANTIFRAUDE)
CREATE TABLE IF NOT EXISTS public.whatsapp_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    telefono_cliente TEXT NOT NULL,
    motivo TEXT DEFAULT 'Intento de fraude o comprobante no válido',
    bloqueado_por TEXT DEFAULT 'sistema_ia',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(negocio_id, telefono_cliente)
);

-- Indexación para consultas ultra rápidas por webhook
CREATE INDEX IF NOT EXISTS idx_wa_config_phone_id ON public.whatsapp_config(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_negocio_telefono ON public.whatsapp_conversaciones(negocio_id, telefono_cliente);
CREATE INDEX IF NOT EXISTS idx_wa_mensajes_conv ON public.whatsapp_mensajes(conversacion_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_comp_op ON public.whatsapp_comprobantes_registrados(negocio_id, numero_operacion);
CREATE INDEX IF NOT EXISTS idx_wa_bl_negocio_telefono ON public.whatsapp_blacklist(negocio_id, telefono_cliente);

-- 6. POLÍTICAS RLS (ROW LEVEL SECURITY)
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_comprobantes_registrados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_blacklist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso a whatsapp_config por negocio_id') THEN
        CREATE POLICY "Acceso a whatsapp_config por negocio_id" ON public.whatsapp_config
            FOR ALL USING (negocio_id IN (SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso a whatsapp_conversaciones por negocio_id') THEN
        CREATE POLICY "Acceso a whatsapp_conversaciones por negocio_id" ON public.whatsapp_conversaciones
            FOR ALL USING (negocio_id IN (SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso a whatsapp_mensajes por negocio_id') THEN
        CREATE POLICY "Acceso a whatsapp_mensajes por negocio_id" ON public.whatsapp_mensajes
            FOR ALL USING (negocio_id IN (SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso a whatsapp_comprobantes por negocio_id') THEN
        CREATE POLICY "Acceso a whatsapp_comprobantes por negocio_id" ON public.whatsapp_comprobantes_registrados
            FOR ALL USING (negocio_id IN (SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acceso a whatsapp_blacklist por negocio_id') THEN
        CREATE POLICY "Acceso a whatsapp_blacklist por negocio_id" ON public.whatsapp_blacklist
            FOR ALL USING (negocio_id IN (SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid()));
    END IF;
END $$;
